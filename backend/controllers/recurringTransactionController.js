const recurringService = require('../services/recurringTransactionService');

exports.getRecurringTransactions = async (req, res) => {
  try {
    const data = await recurringService.getRecurringTransactions(req.user.id);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createRecurringTransaction = async (req, res) => {
  try {
    const data = await recurringService.createRecurringTransaction(req.user.id, req.body);
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateRecurringTransaction = async (req, res) => {
  try {
    const data = await recurringService.updateRecurringTransaction(req.user.id, req.params.id, req.body);
    res.status(200).json(data);
  } catch (error) {
    console.error('Update Recurring Error:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteRecurringTransaction = async (req, res) => {
  try {
    await recurringService.deleteRecurringTransaction(req.user.id, req.params.id);
    res.status(200).json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.toggleActive = async (req, res) => {
  try {
    const data = await recurringService.toggleActive(req.user.id, req.params.id);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
