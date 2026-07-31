const express = require('express');
const router = express.Router();
const { 
  generatePlan, 
  saveDraftPlan, 
  confirmPlan, 
  getPlans,
  getPlanById,
  updateDraftPlan,
  deletePlan
} = require('../controllers/smartBudgetController');
const protect = require('../middleware/auth');

router.use(protect);

router.post('/generate', generatePlan);
router.post('/', saveDraftPlan);
router.post('/:id/confirm', confirmPlan);
router.get('/', getPlans);
router.get('/:id', getPlanById);
router.put('/:id', updateDraftPlan);
router.delete('/:id', deletePlan);

module.exports = router;
