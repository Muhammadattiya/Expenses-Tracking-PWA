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

// We accept plain text or JSON. Shortcuts usually sends JSON or text depending on how the user sets it up.
// Using text parser to be safe and flexible.
router.post(
  '/:userToken',
  smsLimiter,
  express.text({ type: '*/*', limit: '1kb' }), 
  smsWebhookController.handleSmsWebhook
);

module.exports = router;
