const savingsGoalService = require('../services/savingsGoalService');

exports.getSavingsGoals = async (req, res, next) => {
  try {
    const goals = await savingsGoalService.getSavingsGoals(req.user.id, req.query);
    res.status(200).json({ success: true, data: goals });
  } catch (err) {
    next(err);
  }
};

exports.getSavingsGoalById = async (req, res, next) => {
  try {
    const goal = await savingsGoalService.getSavingsGoalById(req.user.id, req.params.id);
    res.status(200).json({ success: true, data: goal });
  } catch (err) {
    next(err);
  }
};

exports.createSavingsGoal = async (req, res, next) => {
  try {
    const goal = await savingsGoalService.createSavingsGoal(req.user.id, req.body);
    res.status(201).json({ success: true, data: goal });
  } catch (err) {
    next(err);
  }
};

exports.updateSavingsGoal = async (req, res, next) => {
  try {
    const goal = await savingsGoalService.updateSavingsGoal(req.user.id, req.params.id, req.body);
    res.status(200).json({ success: true, data: goal });
  } catch (err) {
    next(err);
  }
};

exports.deleteSavingsGoal = async (req, res, next) => {
  try {
    await savingsGoalService.deleteSavingsGoal(req.user.id, req.params.id);
    res.status(200).json({ success: true, message: 'تم حذف هدف الادخار بنجاح' });
  } catch (err) {
    next(err);
  }
};

exports.contributeToGoal = async (req, res, next) => {
  try {
    const result = await savingsGoalService.contributeToGoal(req.user.id, req.params.id, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
