const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const budgetController = require('../controllers/budgetController');

router.use(auth);

router.get('/', budgetController.getBudgets);
router.post('/', budgetController.createBudget);
router.post('/import', budgetController.importBudgets);
router.get('/recommendation', budgetController.getRecommendation);
router.put('/:id', budgetController.updateBudget);
router.delete('/:id', budgetController.deleteBudget);

module.exports = router;
