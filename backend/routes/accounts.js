const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');
router.use(auth);

const {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} = require("../controllers/accountController");

router.get("/", getAccounts);

router.post("/", createAccount);

router.put("/:id", updateAccount);

router.delete("/:id", deleteAccount);

module.exports = router;
