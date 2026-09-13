const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');
router.use(auth);

const {
  getTransactions,
  getTransactionsSync,
  exportTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  importTransactions,
} = require("../controllers/transactionController");

router.get("/sync", getTransactionsSync);
router.get("/export", exportTransactions);
router.get("/", getTransactions);

router.post("/", createTransaction);

router.put("/:id", updateTransaction);

router.delete("/:id", deleteTransaction);

const { importLimiter } = require('../middleware/rateLimiter');
router.post("/import", importLimiter, express.json({ limit: '5mb' }), importTransactions);

module.exports = router;
