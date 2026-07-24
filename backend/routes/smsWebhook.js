const express = require('express');
const router = express.Router();
const smsWebhookController = require('../controllers/smsWebhookController');
const rateLimit = require('express-rate-limit');

// Rate limiting to prevent abuse from webhook endpoint
const smsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' }
});

// We accept plain text or JSON. 
router.post(
  '/:userToken',
  smsLimiter,
  express.json({ limit: '5kb' }),
  express.text({ type: '*/*', limit: '5kb' }), 
  smsWebhookController.handleSmsWebhook
);

module.exports = router;
