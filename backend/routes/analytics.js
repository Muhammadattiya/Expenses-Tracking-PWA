const router = require('express').Router(); const auth = require('../middleware/auth'); const controller = require('../controllers/analyticsController');
router.get('/', auth, controller.get); module.exports = router;
