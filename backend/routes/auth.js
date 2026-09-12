const router = require('express').Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/authController');
const rateLimit = require('express-rate-limit');

const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts from this IP.' }
});

const loginEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    const rawEmail = req.body?.email;
    const normalized = typeof rawEmail === 'string' ? rawEmail.toLowerCase().trim() : '';
    return normalized ? `email:${normalized}` : `ip:${req.ip || 'unknown'}`;
  },
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts for this account.' }
});

router.post('/google', loginIpLimiter, loginEmailLimiter, controller.googleSignIn);
router.post('/register', loginIpLimiter, loginEmailLimiter, controller.register);
router.post('/login', loginIpLimiter, loginEmailLimiter, controller.login);
router.get('/me', auth, controller.me);
router.patch('/me', auth, controller.updateProfile);
router.put('/preferences', auth, controller.updatePreferences);
router.put('/complete-onboarding', auth, controller.completeOnboarding);
router.put('/reset-onboarding', auth, controller.resetOnboarding);
router.delete('/data', auth, controller.deleteAllData);
router.post('/logout', auth, controller.logout);
router.put('/change-password', auth, controller.changePassword);
module.exports = router;
