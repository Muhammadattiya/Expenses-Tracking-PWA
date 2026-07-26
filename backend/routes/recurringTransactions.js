const express = require('express');
const router = express.Router();
const recurringController = require('../controllers/recurringTransactionController');
const auth = require('../middleware/auth');

router.use(auth);

router.route('/')
  .get(recurringController.getRecurringTransactions)
  .post(recurringController.createRecurringTransaction);

router.route('/:id')
  .put(recurringController.updateRecurringTransaction)
  .delete(recurringController.deleteRecurringTransaction);

router.patch('/:id/toggle', recurringController.toggleActive);

module.exports = router;
