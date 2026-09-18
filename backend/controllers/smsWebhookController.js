const crypto = require('crypto');
const User = require('../models/User');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const { parseSms } = require('../services/smsParser');
const { resolveUserAccount } = require('../services/accountResolver');
const { attemptTransferReconciliation } = require('../services/transferReconciliationService');
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

    let newTx;
    try {
      newTx = await Transaction.create({
        user: user._id,
        title: parsedData.merchant || (parsedData.type === 'income' ? 'إيداع / تحويل وارد' : 'معاملة SMS (تحتاج مراجعة)'),
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

    // Self-Transfer Reconciliation Engine: Check if this SMS pairs with a counterpart within 45s
    let finalTx = newTx;
    let isReconciled = false;

    try {
      const reconResult = await attemptTransferReconciliation({
        userId: user._id,
        currentTransaction: newTx,
        parsedSms: parsedData,
        smsHash: smsHash
      });

      if (reconResult && reconResult.isReconciled) {
        isReconciled = true;
        finalTx = reconResult.transaction;
      }
    } catch (reconErr) {
      console.error('[TRANSFER RECONCILIATION] Error:', reconErr.message);
      // Fall back safely to independent transaction
    }

    // If not reconciled, apply standard incremental analytics and budget deltas
    if (!isReconciled) {
      try {
        const { applyTransactionDelta } = require('../services/analyticsEngine');
        applyTransactionDelta(user._id, newTx, 1).catch(err => console.error('[ANALYTICS] smsWebhook delta failed:', err.message));
        if (newTx.type === 'expense' && newTx.category) {
          updateBudgetIncrementally(user._id, newTx, 1).catch(err => console.error('[BUDGET] smsWebhook budget delta failed:', err.message));
        }
      } catch (e) {
        // Non-fatal
      }
    }

    console.log(`[SMS Webhook] ${isReconciled ? 'reconciled_transfer' : 'single_tx'} id="${finalTx._id}" amount=${finalTx.amount} accountMatched=${!!accountId}`);

    // Fire push notification if subscriptions exist
    try {
      if (isReconciled) {
        // Dedicated reconciliation notification (FR-015)
        const payload = notificationService.buildPayload({
          title: 'تحويل ذاتي (IPN)',
          body: `تم رصد تحويل ذاتي بمبلغ ${finalTx.amount} ج.م بين حساباتك`,
          url: '/'
        });
        await notificationService.sendToUser(user._id, payload);
      } else {
        // Standard single transaction notification
        const payload = notificationService.buildPayload({
          title: 'معاملة جديدة من رسالة (SMS)',
          body: `مبلغ ${newTx.amount} ج.م - اضغط للمراجعة وتأكيد الحساب`,
          url: '/'
        });
        await notificationService.sendToUser(user._id, payload);
      }
    } catch (pushErr) {
      console.error('Error sending push for SMS webhook', pushErr);
    }

    res.status(200).json({
      message: isReconciled ? 'Transfer reconciled successfully' : 'Transaction saved',
      id: finalTx._id,
      isReconciled
    });

  } catch (error) {
    console.error('[ERROR] SMS Webhook:', error.message);
    console.error('[ERROR] Stack:', error.stack);
    next(error);
  }
};
