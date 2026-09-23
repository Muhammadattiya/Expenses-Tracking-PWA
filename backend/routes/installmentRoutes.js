const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const installmentController = require('../controllers/installmentController');

router.use(auth);

router.get('/', installmentController.getInstallments);
router.post('/', installmentController.createInstallment);
router.put('/:id', installmentController.updateInstallment);
router.delete('/:id', installmentController.deleteInstallment);
router.post('/:id/pay', installmentController.payInstallment);

module.exports = router;
