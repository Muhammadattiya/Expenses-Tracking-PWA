const express = require('express');
const router = express.Router();
const { subscribe, sendNotification } = require('../controllers/notificationController');
const auth = require('../middleware/auth');

router.post('/subscribe', auth, subscribe);
router.post('/send', auth, sendNotification);

module.exports = router;
