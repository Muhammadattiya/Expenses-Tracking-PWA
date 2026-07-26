const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const auth = require('../middleware/auth');

router.use(auth);

router.route('/')
  .get(billController.getBills)
  .post(billController.createBill);

router.route('/:id')
  .put(billController.updateBill)
  .delete(billController.deleteBill);

router.post('/:id/pay', billController.markAsPaid);

module.exports = router;
