const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', (req, res, next) => {
  try {
    const savingsGoalController = require('../controllers/savingsGoalController');
    return savingsGoalController.getSavingsGoals(req, res, next);
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const savingsGoalController = require('../controllers/savingsGoalController');
    return savingsGoalController.createSavingsGoal(req, res, next);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const savingsGoalController = require('../controllers/savingsGoalController');
    return savingsGoalController.updateSavingsGoal(req, res, next);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const savingsGoalController = require('../controllers/savingsGoalController');
    return savingsGoalController.deleteSavingsGoal(req, res, next);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/contribute', (req, res, next) => {
  try {
    const savingsGoalController = require('../controllers/savingsGoalController');
    return savingsGoalController.contributeToGoal(req, res, next);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
