const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');
router.use(auth);

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

router.post("/import", express.json({ limit: '5mb' }), importTransactions);

module.exports = router;
