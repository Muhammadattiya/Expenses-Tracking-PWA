const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const shortcutAuth = require('../middleware/shortcutAuth');
const shortcutController = require('../controllers/shortcutController');

// Standard user endpoints (require standard JWT)
// Used by the Settings UI to manage the token
router.get('/shortcut/token-status', requireAuth, shortcutController.getTokenStatus);
router.post('/shortcut/token', requireAuth, shortcutController.generateToken);
router.delete('/shortcut/token', requireAuth, shortcutController.revokeToken);

// Shortcut API endpoints (require shortcut token)
// Used by the Apple Shortcuts app
router.get('/shortcut/accounts', shortcutAuth, shortcutController.getAccounts);
router.get('/shortcut/categories', shortcutAuth, shortcutController.getCategories);
router.post('/shortcut/transactions', shortcutAuth, shortcutController.createTransaction);

module.exports = router;
