const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const emergencyFundController = require('../controllers/emergencyFundController');

router.use(auth);

router.get('/', emergencyFundController.getEmergencyFund);
router.put('/', emergencyFundController.updateEmergencyFund);
router.post('/deposit', emergencyFundController.depositEmergencyFund);

module.exports = router;
