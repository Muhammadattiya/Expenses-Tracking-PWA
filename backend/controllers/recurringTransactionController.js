const recurringService = require('../services/recurringTransactionService');

exports.getRecurringTransactions = async (req, res, next) => {
  try {
    const data = await recurringService.getRecurringTransactions(req.user.id);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

exports.createRecurringTransaction = async (req, res, next) => {
  try {
    const data = await recurringService.createRecurringTransaction(req.user.id, req.body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

exports.updateRecurringTransaction = async (req, res, next) => {
  try {
    const data = await recurringService.updateRecurringTransaction(req.user.id, req.params.id, req.body);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

exports.deleteRecurringTransaction = async (req, res, next) => {
  try {
    await recurringService.deleteRecurringTransaction(req.user.id, req.params.id);
    res.status(200).json({ message: 'Deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.toggleActive = async (req, res, next) => {
  try {
    const data = await recurringService.toggleActive(req.user.id, req.params.id);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};
