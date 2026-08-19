const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const notificationService = require('../services/notificationService');

const subscribe = async (req, res) => {
  try {
    const subscription = req.body;
    
    // Check if subscription already exists for this endpoint
    const existing = await Subscription.findOne({ endpoint: subscription.endpoint });
    
    if (existing) {
      existing.user = req.user.id;
      existing.keys = subscription.keys;
      await existing.save();
    } else {
      await Subscription.create({
        user: req.user.id,
        endpoint: subscription.endpoint,
        keys: subscription.keys
      });
    }

    res.status(201).json({ message: 'Subscribed successfully.' });
  } catch (error) {
    console.error('[ERROR] subscribe:', error.message);
    res.status(500).json({ message: 'Failed to save subscription.' });
  }
};

const sendNotification = async (req, res) => {
  try {
    const { title, body, url } = req.body;
    
    const subscriptions = await Subscription.find({ user: req.user.id });
    
    if (subscriptions.length === 0) {
      return res.status(404).json({ message: 'No subscriptions found for user.' });
    }

    const payload = notificationService.buildPayload({
      title: title || 'إشعار جديد',
      body: body || 'لديك رسالة جديدة',
      url: url || '/'
    });
    await notificationService.sendToSubscriptions(subscriptions, payload);

    res.status(200).json({ message: 'Notification sent successfully.' });
  } catch (error) {
    console.error('[ERROR] sendNotification:', error.message);
    res.status(500).json({ message: 'Failed to send notification.' });
  }
};

// Timing-safe API key comparison to prevent timing attacks
const isValidApiKey = (provided) => {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || !provided) return false;
  if (provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided, 'utf8'),
      Buffer.from(expected, 'utf8')
    );
  } catch {
    return false;
  }
};

const broadcastNotification = async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!isValidApiKey(apiKey)) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const { title, body, url } = req.body;
    
    // Find ALL subscriptions
    const subscriptions = await Subscription.find({});
    
    if (subscriptions.length === 0) {
      return res.status(404).json({ message: 'No subscriptions found in the database.' });
    }

    // Validate URL — only allow relative paths for safety
    const safeUrl = (url && typeof url === 'string' && url.startsWith('/')) ? url : '/';

    const payload = notificationService.buildPayload({
      title: title || 'إشعار جديد',
      body: body || 'لديك رسالة جديدة',
      url: safeUrl
    });
    const result = await notificationService.sendToSubscriptions(subscriptions, payload);

    res.status(200).json({ 
      message: 'Broadcast completed.',
      totalSent: subscriptions.length,
      successful: result.delivered,
      failed: result.failed
    });
  } catch (error) {
    console.error('[ERROR] broadcastNotification:', error.message);
    res.status(500).json({ message: 'Failed to broadcast notification.' });
  }
};

module.exports = {
  subscribe,
  sendNotification,
  broadcastNotification
};
