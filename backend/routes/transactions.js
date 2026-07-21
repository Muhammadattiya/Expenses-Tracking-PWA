const express = require("express");
const router = express.Router();

const {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  importTransactions,
} = require("../controllers/transactionController");

router.get("/", getTransactions);

router.post("/", createTransaction);

router.put("/:id", updateTransaction);

router.delete("/:id", deleteTransaction);

router.post("/import", importTransactions);

module.exports = router;