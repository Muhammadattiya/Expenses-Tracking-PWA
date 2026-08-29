const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const protect = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting specifically for the LLM agent to prevent abuse
const agentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: { success: false, message: 'Too many agent requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/chat', protect, agentLimiter, agentController.chat);

module.exports = router;
