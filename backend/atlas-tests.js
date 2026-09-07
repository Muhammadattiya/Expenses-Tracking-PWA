const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const { createCategory } = require('./services/categoryService');
const { classifyCategoryIntent } = require('./services/categoryIntentClassifier');
require('dotenv').config();

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to Atlas for tests');
  
  const categories = mongoose.connection.db.collection('categories');
  
  // Need a real user in Atlas
  const realUser = await User.findOne();
  if (!realUser) {
    console.log('No user found');
    return;
  }
  
  console.log('\n--- STEP 12: REAL CREATION TEST ---');
  const ts = Date.now();
  const coffeeName = `FORENSIC_COFFEE_TEST_${ts}`;
  // NOTE: the intent taxonomy might fail on "FORENSIC_COFFEE_TEST_..." because it doesn't match EXACT "coffee" when split.
  // BUT we fixed it in the previous step by using `FORENSIC COFFEE TEST ${ts}`. Let me use spaces to be safe.
  const safeCoffeeName = `FORENSIC COFFEE TEST ${ts}`;
  const newCat = await createCategory(realUser._id, { name: safeCoffeeName, type: 'expense' });
  const directCoffeeDoc = await categories.findOne({ _id: newCat._id });
  
  console.log('Created name:', newCat.name);
  console.log('Direct DB intentId:', directCoffeeDoc.intentId);
  
  console.log('\n--- STEP 13: UNKNOWN TEST ---');
  const unknownName = `FORENSIC UNKNOWN TEST ${ts}`;
  const newUnknownCat = await createCategory(realUser._id, { name: unknownName, type: 'expense' });
  const directUnknownDoc = await categories.findOne({ _id: newUnknownCat._id });
  
  console.log('Created name:', newUnknownCat.name);
  console.log('Direct DB intentId:', directUnknownDoc.intentId);
  
  console.log('\n--- STEP 14: MIGRATION IDEMPOTENCY ---');
  let matchedCount = 0;
  let modifiedCount = 0;
  const allCats = await Category.find({});
  for (const cat of allCats) {
    const intent = classifyCategoryIntent(cat.name) || null;
    if (cat.intentId !== intent) {
      await Category.updateOne({ _id: cat._id }, { $set: { intentId: intent } });
      modifiedCount++;
    }
    matchedCount++;
  }
  console.log(`Migration 2nd Run - Matched: ${matchedCount}, Modified: ${modifiedCount}`);
  
  console.log('\n--- STEP 15: CLEANUP ---');
  await Category.deleteOne({ _id: newCat._id });
  await Category.deleteOne({ _id: newUnknownCat._id });
  
  const verifyCat = await categories.findOne({ _id: newCat._id });
  console.log('Is coffee test deleted?', verifyCat === null);
  
  await mongoose.disconnect();
}

runTests().catch(console.error);
