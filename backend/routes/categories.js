const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// جلب كل الفئات
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'خطأ في جلب الفئات', error: error.message });
  }
});

// إضافة فئة جديدة
router.post('/', async (req, res) => {
  try {
    const newCategory = new Category(req.body);
    const savedCategory = await newCategory.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    res.status(400).json({ message: 'خطأ في إضافة الفئة (قد تكون موجودة مسبقاً)', error: error.message });
  }
});

module.exports = router;