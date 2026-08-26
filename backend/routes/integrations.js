const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const requireAuth = require('../middleware/auth');
const shortcutAuth = require('../middleware/shortcutAuth');
const shortcutController = require('../controllers/shortcutController');

// Fix #2: Dedicated, tight rate limiter for shortcut API endpoints
// Keyed by token hash (not IP) since mobile IPs change frequently
const shortcutLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute window
  max: 15,               // 15 requests per minute max
  keyGenerator: (req) => {
    // Key by Authorization header hash — not IP, since mobile users change IPs often
    const authHeader = req.header('Authorization') || req.ip || 'unknown';
    return crypto.createHash('sha256').update(authHeader).digest('hex');
  },
  validate: false,       // We key by token hash, not IP — skip all IP-related validations
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' },
});

// Standard user endpoints (require standard JWT)
// Used by the Settings UI to manage the token
router.get('/shortcut/token-status', requireAuth, shortcutController.getTokenStatus);
router.post('/shortcut/token', requireAuth, shortcutController.generateToken);
router.delete('/shortcut/token', requireAuth, shortcutController.revokeToken);

// Shortcut API endpoints (require shortcut token + dedicated rate limiter)
// Used by the Apple Shortcuts app
router.get('/shortcut/accounts', shortcutLimiter, shortcutAuth, shortcutController.getAccounts);
router.get('/shortcut/categories', shortcutLimiter, shortcutAuth, shortcutController.getCategories);
router.post('/shortcut/transactions', shortcutLimiter, shortcutAuth, shortcutController.createTransaction);

module.exports = router;
