const crypto = require('crypto');
const User = require('../models/User');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const { parseSms } = require('../services/smsParser');
const { resolveUserAccount } = require('../services/accountResolver');
const { processTransferCandidate } = require('../services/transferReconciliationService');
const { updateBudgetIncrementally } = require('../services/transactionService');
const notificationService = require('../services/notificationService');
const { resolveMerchantIntent } = require('../services/merchantIntelligence/merchantClassificationResolver');
const { normalizeMerchantToken } = require('../services/merchantIntelligence/merchantNormalizer');
const { resolveCategory } = require('../services/quickAdd/intentResolver');

// Manage SMS Webhook Token (SEC-006)
exports.generateToken = async (req, res, next) => {
  try {
    const rawToken = crypto.randomBytes(16).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.smsWebhookToken = hashedToken;
    await user.save();

    res.json({ token: rawToken, message: 'Token generated successfully. Please save it now.' });
  } catch (error) {
    next(error);
  }
};

exports.revokeToken = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.smsWebhookToken = undefined;
    await user.save();

    res.json({ message: 'Token revoked successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getTokenStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+smsWebhookToken');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ isConnected: !!user.smsWebhookToken });
  } catch (error) {
    next(error);
  }
};

// Redact sensitive PII from raw SMS before storage
const redactSensitiveInfo = (text) => {
  return text
    .replace(/(رقم\s+)\d{4}/gi, '$1****')         // Card numbers
    .replace(/المتاح\s+[\d.]+/gi, 'المتاح ***')    // Available balance
    .replace(/(من|إلى)\s+[\u0600-\u06FF\s*]+(?=\s+رقم مرجعي)/gi, '$1 ***'); // Person names
};

exports.handleSmsWebhook = async (req, res, next) => {
  try {
    const { userToken } = req.params;
    
    // Extract SMS text. It might be in req.body.text if sent as JSON, or directly in req.body if sent as raw text.
    let smsText = '';
    if (typeof req.body === 'object' && req.body !== null) {
      smsText = req.body.text || req.body.sms || JSON.stringify(req.body);
    } else if (typeof req.body === 'string') {
      smsText = req.body;
    }

    if (!smsText || smsText.trim() === '' || smsText === '{}') {
      return res.status(400).json({ message: 'Empty SMS body' });
    }

    // SEC-006: SMS Webhook Token Security (Hash before lookup)
    const hashedWebhookToken = crypto.createHash('sha256').update(userToken).digest('hex');
    const user = await User.findOne({ smsWebhookToken: hashedWebhookToken });
    if (!user) {
      return res.status(404).json({ message: 'Invalid webhook token' });
    }

    // Deduplication check: check both direct smsHash and provenance array of reconciled transfers
    const smsHash = crypto.createHash('sha256').update(smsText).digest('hex');
    const existingTx = await Transaction.findOne({
      user: user._id,
      $or: [
        { smsHash },
        { 'smsProvenance.smsHash': smsHash }
      ]
    });
    if (existingTx) {
      return res.status(200).json({ message: 'Transaction already exists (deduplicated)', id: existingTx._id });
    }

    const parsedData = parseSms(smsText);

    if (!parsedData) {
      // Still log it if needed, but for now we just return 200 so Shortcuts doesn't show an error
      return res.status(200).json({ message: 'Ignored: not a recognized financial transaction' });
    }

    // Account matching by accountLast4 / cardLast4 with Zero-Guessing (US1 / Principle II)
    const targetLast4 = parsedData.accountLast4 || parsedData.cardLast4;
    let accountId = null;
    if (targetLast4) {
      const matchedAccount = await resolveUserAccount(user._id, targetLast4);
      if (matchedAccount) {
        accountId = matchedAccount._id;
      }
    }
    
    // Guess Intent and Category using Merchant Intelligence Pipeline
    let categoryId = null;
    let inferredIntent = null;
    if (parsedData.merchant && parsedData.merchant !== 'Unrecognized SMS') {
      inferredIntent = await resolveMerchantIntent(parsedData.merchant, user._id);
      
      if (inferredIntent) {
        const resolvedCategory = await resolveCategory(user._id, inferredIntent, parsedData.type);
        if (resolvedCategory) {
          categoryId = resolvedCategory._id;
        }
      }
    }

    // ==========================================
    // Transfer Candidate Routing (Non-Destructive Holding Queue)
    // ==========================================
    if (parsedData.isTransferCandidate) {
      const finalizeCallback = async (candidate) => {
        try {
          const singleTx = await Transaction.create({
            user: candidate.user._id,
            title: candidate.parsedData.merchant || (candidate.parsedData.type === 'income' ? 'Deposit / Incoming Transfer' : 'SMS Transaction (Needs Review)'),
            normalizedMerchant: candidate.parsedData.merchant ? normalizeMerchantToken(candidate.parsedData.merchant) : null,
            amount: candidate.parsedData.amount,
            type: candidate.parsedData.type,
            smsDirection: candidate.parsedData.direction || (candidate.parsedData.type === 'expense' ? 'outgoing' : 'incoming'),
            account: candidate.accountId,
            category: candidate.categoryId,
            source: 'sms_shortcut',
            referenceNumber: candidate.parsedData.referenceNumber,
            date: candidate.parsedData.eventTimestamp || candidate.receivedAt || new Date(),
            rawSms: redactSensitiveInfo(candidate.smsText),
            smsHash: candidate.smsHash
          });

          const { applyTransactionDelta } = require('../services/analyticsEngine');
          applyTransactionDelta(candidate.user._id, singleTx, 1).catch(err => console.error('[ANALYTICS] Finalize delta error:', err.message));
          if (singleTx.type === 'expense' && singleTx.category) {
            updateBudgetIncrementally(candidate.user._id, singleTx, 1).catch(err => console.error('[BUDGET] Finalize budget error:', err.message));
          }

          const payload = notificationService.buildPayload({
            title: 'New SMS Transaction',
            body: `Amount ${singleTx.amount} EGP - Tap to review and confirm account`,
            url: '/'
          });
          await notificationService.sendToUser(candidate.user._id, payload);

          console.log(`[SMS Webhook] transfer_candidate_finalized_single id="${singleTx._id}" amount=${singleTx.amount}`);
        } catch (finErr) {
          console.error('[SMS Webhook] Error finalizing held transfer candidate:', finErr.message);
        }
      };

      const reconResult = await processTransferCandidate({
        user,
        parsedData,
        accountId,
        categoryId,
        smsText,
        smsHash,
        finalizeCallback
      });

      if (reconResult.isReconciled) {
        return res.status(200).json({
          message: 'Transfer reconciled successfully',
          id: reconResult.transaction._id,
          isReconciled: true
        });
      } else {
        return res.status(200).json({
          message: 'Transfer candidate received; held for counterpart reconciliation',
          status: 'pending',
          isReconciled: false
        });
      }
    }

    // ==========================================
    // Regular Non-Transfer Transaction (Immediate Execution)
    // ==========================================
    let newTx;
    try {
      newTx = await Transaction.create({
        user: user._id,
        title: parsedData.merchant || (parsedData.type === 'income' ? 'Deposit / Incoming Transfer' : 'SMS Transaction (Needs Review)'),
        normalizedMerchant: parsedData.merchant ? normalizeMerchantToken(parsedData.merchant) : null,
        amount: parsedData.amount,
        type: parsedData.type,
        smsDirection: parsedData.direction || (parsedData.type === 'expense' ? 'outgoing' : 'incoming'),
        account: accountId,
        category: categoryId,
        source: 'sms_shortcut',
        referenceNumber: parsedData.referenceNumber,
        date: parsedData.eventTimestamp || new Date(),
        rawSms: redactSensitiveInfo(smsText),
        smsHash: smsHash
      });
    } catch (createErr) {
      if (createErr.code === 11000 && createErr.keyPattern && (createErr.keyPattern.smsHash || createErr.keyPattern['smsProvenance.smsHash'])) {
        return res.status(200).json({ message: 'Transaction already exists (deduplicated by index)' });
      }
      throw createErr;
    }

    try {
      const { applyTransactionDelta } = require('../services/analyticsEngine');
      applyTransactionDelta(user._id, newTx, 1).catch(err => console.error('[ANALYTICS] smsWebhook delta failed:', err.message));
      if (newTx.type === 'expense' && newTx.category) {
        updateBudgetIncrementally(user._id, newTx, 1).catch(err => console.error('[BUDGET] smsWebhook budget delta failed:', err.message));
      }
    } catch (e) {
      // Non-fatal
    }

    console.log(`[SMS Webhook] single_tx id="${newTx._id}" amount=${newTx.amount} accountMatched=${!!accountId}`);

    // Fire push notification for standard transaction
    try {
      const payload = notificationService.buildPayload({
        title: 'New SMS Transaction',
        body: `Amount ${newTx.amount} EGP - Tap to review and confirm account`,
        url: '/'
      });
      await notificationService.sendToUser(user._id, payload);
    } catch (pushErr) {
      console.error('Error sending push for SMS webhook', pushErr);
    }

    res.status(200).json({
      message: 'Transaction saved',
      id: newTx._id,
      isReconciled: false
    });

  } catch (error) {
    console.error('[ERROR] SMS Webhook:', error.message);
    console.error('[ERROR] Stack:', error.stack);
    next(error);
  }
};
