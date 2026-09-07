const mongoose = require('mongoose');
const Category = require('./models/Category');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finova');
  
  console.log('\n--- 1. CURRENT CATEGORIES ---');
  const cats = await Category.find().lean();
  cats.forEach(c => {
    console.log('- ' + c.name + ' -> ' + c.intentId);
  });

  console.log('\n--- 2. NEW CATEGORY CREATION ---');
  const user = cats[0].user; 
  
  const { createCategory } = require('./services/categoryService');
  
  const newCatObj = await createCategory(user, {
    name: 'Internet Bill',
    type: 'expense',
    icon: 'Wifi'
  });
  
  console.log('Returned from service: ' + newCatObj.intentId);
  
  const fetched = await Category.findById(newCatObj._id).lean();
  console.log('Persisted in DB: ' + fetched.intentId);
  
  await mongoose.disconnect();
}

run().catch(console.error);
