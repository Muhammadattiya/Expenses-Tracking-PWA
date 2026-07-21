const router = require('express').Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/authController');
router.post('/google', controller.googleSignIn);
router.get('/me', auth, controller.me);
router.patch('/me', auth, controller.updateProfile);
module.exports = router;
