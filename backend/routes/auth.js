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
router.post('/register', authLimiter, controller.register);
router.post('/login', authLimiter, controller.login);
router.get('/me', auth, controller.me);
router.patch('/me', auth, controller.updateProfile);
router.put('/preferences', auth, controller.updatePreferences);
router.put('/complete-onboarding', auth, controller.completeOnboarding);
router.put('/reset-onboarding', auth, controller.resetOnboarding);
router.delete('/data', auth, controller.deleteAllData);
router.post('/logout', auth, controller.logout);
router.put('/change-password', auth, controller.changePassword);
module.exports = router;
