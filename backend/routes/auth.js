const router = require('express').Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/authController');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
});

router.post('/google', authLimiter, controller.googleSignIn);
router.get('/me', auth, controller.me);
router.patch('/me', auth, controller.updateProfile);
router.put('/preferences', auth, controller.updatePreferences);
router.delete('/data', auth, controller.deleteAllData);
module.exports = router;
