const express = require('express');
const router = express.Router();
const Account = require('../models/Account');

// جلب كل الحسابات
router.get('/', async (req, res) => {
  try {
    const accounts = await Account.find();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: 'خطأ في جلب الحسابات', error: error.message });
  }
});

// إضافة حساب جديد
router.post('/', async (req, res) => {
  try {
    const newAccount = new Account(req.body);
    const savedAccount = await newAccount.save();
    res.status(201).json(savedAccount);
  } catch (error) {
    res.status(400).json({ message: 'خطأ في إضافة الحساب', error: error.message });
  }
});

module.exports = router;