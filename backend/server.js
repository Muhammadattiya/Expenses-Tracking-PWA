const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// إعدادات الـ Middleware
app.use(cors());
// زودنا المساحة لـ 50 ميجا عشان تستوعب أي ملف Import براحتها
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// تعريف الـ Routes
const transactionsRoutes = require('./routes/transactions');
const accountsRoutes = require('./routes/accounts');
const categoriesRoutes = require('./routes/categories');

// تفعيل الـ Routes
app.use('/api/transactions', transactionsRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/categories', categoriesRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح'))
  .catch((err) => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 السيرفر شغال على بورت ${PORT}`);
});