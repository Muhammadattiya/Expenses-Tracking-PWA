const transactionService = require("../services/transactionService");

const getTransactions = async (req, res) => {
  try {
    const transactions = await transactionService.getTransactions(req.user.id);

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const createTransaction = async (req, res) => {
  try {
    const transaction = await transactionService.createTransaction(req.user.id, req.body);

    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const transaction = await transactionService.updateTransaction(
      req.user.id, req.params.id,
      req.body
    );

    res.status(200).json(transaction);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    await transactionService.deleteTransaction(req.user.id, req.params.id);

    res.status(200).json({
      message: "Transaction deleted successfully.",
    });
  } catch (error) {
    const status = error.statusCode || 400;

    res.status(status).json({
      message: error.message,
    });
  }
};

const importTransactions = async (req, res) => {
  try {
    const result = await transactionService.importTransactions(req.user.id, req.body);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  importTransactions,
};
