const crypto = require('crypto');
const User = require('../models/User');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const { parseSms } = require('../services/smsParser');
const notificationService = require('../services/notificationService');

exports.handleSmsWebhook = async (req, res) => {
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

    const user = await User.findOne({ smsWebhookToken: userToken });
    if (!user) {
      return res.status(404).json({ message: 'Invalid webhook token' });
    }

    // Deduplication check
    const smsHash = crypto.createHash('sha256').update(smsText).digest('hex');
    const existingTx = await Transaction.findOne({ user: user._id, smsHash });
    if (existingTx) {
      return res.status(200).json({ message: 'Transaction already exists (deduplicated)' });
    }

    const parsedData = parseSms(smsText);

    if (!parsedData) {
      // Still log it if needed, but for now we just return 200 so Shortcuts doesn't show an error
      return res.status(200).json({ message: 'Ignored: not a recognized financial transaction' });
    }

    // Account matching by cardLast4
    let accountId = null;
    if (parsedData.cardLast4) {
      const matchedAccount = await Account.findOne({ user: user._id, cardLast4: parsedData.cardLast4 });
      if (matchedAccount) {
        accountId = matchedAccount._id;
      }
    }
    
    // Category is always null, requiring manual review
    const categoryId = null;

    const newTx = await Transaction.create({
      user: user._id,
      title: parsedData.merchant || 'معاملة SMS (تحتاج مراجعة)',
      amount: parsedData.amount,
      type: parsedData.type,
      account: accountId,
      category: categoryId,
      status: 'needs_manual_review',
      source: 'sms_shortcut',
      referenceNumber: parsedData.referenceNumber,
      rawSms: smsText,
      smsHash: smsHash
    });

    // Fire push notification if subscriptions exist
    try {
      const payload = notificationService.buildPayload({
        title: 'معاملة جديدة من رسالة (SMS)',
        body: `مبلغ ${parsedData.amount} ج.م - اضغط للمراجعة وتأكيد الحساب`,
        url: '/'
      });
      await notificationService.sendToUser(user._id, payload);
    } catch (pushErr) {
      console.error('Error sending push for SMS webhook', pushErr);
    }

    res.status(200).json({ message: 'Transaction saved', id: newTx._id, status: 'needs_manual_review' });

  } catch (error) {
    console.error('SMS Webhook Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
