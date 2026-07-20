const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');   // تأكد إن مسار الموديل ده صح عندك
const Category = require('../models/Category'); // تأكد إن مسار الموديل ده صح عندك

// مسار استيراد البيانات (الذكي)
router.post('/import', async (req, res) => {
  try {
    const importedData = req.body;
    
    if (!Array.isArray(importedData)) {
      return res.status(400).json({ error: 'البيانات غير صالحة. يجب أن تكون مصفوفة.' });
    }

    // 1. استخراج الحسابات والفئات الفريدة من البيانات المستوردة
    const uniqueAccounts = new Set();
    const categoryMap = new Map(); // Map عشان نربط اسم الفئة بنوعها (دخل أو مصروف)

    const cleanData = importedData.map(trx => {
      // تفريغ הـ _id عشان الداتا بيز تعمل id جديد لكل معاملة وميحصلش تعارض
      const { _id, __v, ...cleanTrx } = trx;

      // تجميع حسابات وفئات الدخل والمصروف
      if (cleanTrx.type !== 'transfer') {
        if (cleanTrx.account) uniqueAccounts.add(cleanTrx.account);
        if (cleanTrx.category) categoryMap.set(cleanTrx.category, cleanTrx.type);
      } 
      // تجميع حسابات التحويلات
      else {
        if (cleanTrx.from_account) uniqueAccounts.add(cleanTrx.from_account);
        if (cleanTrx.to_account) uniqueAccounts.add(cleanTrx.to_account);
      }

      return cleanTrx;
    });

    // 2. فحص الحسابات وإضافة غير الموجود منها
    const existingAccounts = await Account.find({ name: { $in: Array.from(uniqueAccounts) } });
    const existingAccountNames = existingAccounts.map(acc => acc.name);
    
    const accountsToInsert = Array.from(uniqueAccounts)
      .filter(name => !existingAccountNames.includes(name))
      // أي حساب جديد هيتضاف هياخد نوع 'cash' كافتراضي
      .map(name => ({ name, type: 'cash' })); 

    if (accountsToInsert.length > 0) {
      await Account.insertMany(accountsToInsert);
    }

    // 3. فحص الفئات وإضافة غير الموجود منها
    const categoryNames = Array.from(categoryMap.keys());
    const existingCategories = await Category.find({ name: { $in: categoryNames } });
    const existingCategoryNames = existingCategories.map(cat => cat.name);

    const categoriesToInsert = categoryNames
      .filter(name => !existingCategoryNames.includes(name))
      // بنجيب نوع الفئة من الـ Map اللي عملناه فوق
      .map(name => ({ name, type: categoryMap.get(name) }));

    if (categoriesToInsert.length > 0) {
      await Category.insertMany(categoriesToInsert);
    }

    // 4. أخيراً، حفظ كل المعاملات في قاعدة البيانات
    const result = await Transaction.insertMany(cleanData);
    
    res.status(201).json({ 
      message: 'تم الاستيراد بنجاح، وتم تحديث النظام بالبيانات الجديدة.', 
      insertedTransactions: result.length,
      addedAccounts: accountsToInsert.length,
      addedCategories: categoriesToInsert.length
    });

  } catch (error) {
    console.error('❌ خطأ أثناء الاستيراد:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء الاستيراد', details: error.message });
  }
});

// جلب جميع المعاملات (مترتبة من الأحدث للأقدم)
router.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ أثناء جلب المعاملات', error: error.message });
  }
});

// إضافة معاملة جديدة
router.post('/', async (req, res) => {
  try {
    const newTransaction = new Transaction(req.body);
    const savedTransaction = await newTransaction.save();
    res.status(201).json(savedTransaction);
  } catch (error) {
    res.status(400).json({ message: 'بيانات غير صالحة', error: error.message });
  }
});

module.exports = router;