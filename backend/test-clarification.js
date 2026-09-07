const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const { updateCategory, getCategories } = require('./services/categoryService');
require('dotenv').config({ path: './.env' });

async function runTest() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finova');
  
  // 1. Create a test user or find one
  let testUser = await User.findOne({ email: 'clarification-test@example.com' });
  if (!testUser) {
    testUser = await User.create({
      name: 'Clarification Test User',
      email: 'clarification-test@example.com',
      password: 'password123'
    });
  }

  // 2. Clean previous test categories
  await Category.deleteMany({ user: testUser._id });

  // 3. Create a category with intentId = null
  const cat = await Category.create({
    user: testUser._id,
    name: 'My Random Stuff',
    type: 'expense',
    intentId: null
  });

  console.log("Created test category:", cat.name, "with intentId:", cat.intentId);

  // 4. Test Validation: Try updating with invalid intentId
  try {
    console.log("Attempting to update with invalid intentId...");
    await updateCategory(testUser._id, cat._id, { intentId: "not_a_valid_intent" });
    console.error("FAIL: Did not throw validation error for invalid intentId.");
  } catch (err) {
    console.log("PASS: Validation correctly blocked invalid intentId:", err.message);
  }

  // 5. Test valid update
  try {
    console.log("Attempting to update with valid intentId 'shopping'...");
    const updated = await updateCategory(testUser._id, cat._id, { intentId: 'shopping' });
    console.log("Returned updated Category intentId:", updated.intentId);
    
    // 6. Verify directly in DB
    const dbCat = await Category.findById(cat._id);
    console.log("Direct DB Query intentId:", dbCat.intentId);
    
    if (dbCat.intentId === 'shopping') {
      console.log("PASS: Intent correctly persisted in DB!");
    } else {
      console.error("FAIL: DB intentId does not match!");
    }
  } catch (err) {
    console.error("FAIL: Valid update threw error:", err.message);
  }

  // 7. Test fetching unresolved vs resolved categories logic
  const allCategories = await getCategories(testUser._id);
  const unresolved = allCategories.filter(c => c.intentId === null);
  console.log("Remaining unresolved categories count:", unresolved.length);

  await mongoose.disconnect();
}

runTest().catch(console.error);
