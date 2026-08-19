const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { subscribe, sendNotification, broadcastNotification } = require('../controllers/notificationController');
const auth = require('../middleware/auth');

// Strict rate limiter for broadcast endpoint
const broadcastLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Broadcast rate limit exceeded.' },
});

router.post('/subscribe', auth, subscribe);
router.post('/send', auth, sendNotification);
router.post('/broadcast', broadcastLimiter, broadcastNotification);

module.exports = router;
