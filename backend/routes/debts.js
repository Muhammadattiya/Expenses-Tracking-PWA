const express = require('express');
const router = express.Router();
const debtController = require('../controllers/debtController');
const auth = require('../middleware/auth');

router.use(auth);

router.post('/', debtController.createDebt);
router.get('/', debtController.getDebts);
router.post('/:debtId/transactions', debtController.addTransaction);
router.delete('/:debtId', debtController.deleteDebt);

module.exports = router;
