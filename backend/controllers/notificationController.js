const Subscription = require('../models/Subscription');
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:test@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

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
    res.status(500).json({ message: 'Error saving subscription', error: error.message });
  }
};

const sendNotification = async (req, res) => {
  try {
    const { title, body, url } = req.body;
    
    // For demo purposes, we send to the current user's subscriptions.
    // In a real app, an admin might send to all, or targeted users.
    const subscriptions = await Subscription.find({ user: req.user.id });
    
    if (subscriptions.length === 0) {
      return res.status(404).json({ message: 'No subscriptions found for user.' });
    }

    const payload = JSON.stringify({
      title: title || 'إشعار جديد',
      body: body || 'لديك رسالة جديدة',
      url: url || '/'
    });

    const sendPromises = subscriptions.map(sub => 
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      ).catch(err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription has expired or is no longer valid
          return Subscription.findByIdAndDelete(sub._id);
        }
        console.error('Error sending notification:', err);
      })
    );

    await Promise.all(sendPromises);

    res.status(200).json({ message: 'Notification sent successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending notification', error: error.message });
  }
};

const broadcastNotification = async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ message: 'Unauthorized. Invalid API Key.' });
    }

    const { title, body, url } = req.body;
    
    // Find ALL subscriptions
    const subscriptions = await Subscription.find({});
    
    if (subscriptions.length === 0) {
      return res.status(404).json({ message: 'No subscriptions found in the database.' });
    }

    const payload = JSON.stringify({
      title: title || 'إشعار جديد',
      body: body || 'لديك رسالة جديدة',
      url: url || '/'
    });

    let successCount = 0;
    let failureCount = 0;

    const sendPromises = subscriptions.map(sub => 
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      ).then(() => {
        successCount++;
      }).catch(err => {
        failureCount++;
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription has expired or is no longer valid
          return Subscription.findByIdAndDelete(sub._id);
        }
        console.error('Error sending notification:', err);
      })
    );

    await Promise.all(sendPromises);

    res.status(200).json({ 
      message: 'Broadcast completed.',
      totalSent: subscriptions.length,
      successful: successCount,
      failed: failureCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error broadcasting notification', error: error.message });
  }
};

module.exports = {
  subscribe,
  sendNotification,
  broadcastNotification
};
