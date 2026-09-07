const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Transaction = require('./models/Transaction');
const GlobalMerchantKnowledge = require('./models/GlobalMerchantKnowledge');
const UserMerchantKnowledge = require('./models/UserMerchantKnowledge');
const { learnFromUser } = require('./services/merchantLearningService');
const { reclassifyTransactionsForMerchant } = require('./services/merchantIntelligence/autoReclassificationService');

require('dotenv').config();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runUncategorizedTests() {
  console.log('--- STARTING UNCATEGORIZED & AUTO-RECLASSIFICATION TESTS ---');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finova');
  console.log('Connected to MongoDB.\n');

  // 1. Setup Test User
  let user = await User.findOne({ email: 'test_uncat@example.com' });
  if (!user) {
    user = await User.create({
      name: 'Test Uncat',
      email: 'test_uncat@example.com',
      password: 'password123',
    });
  }

  // Clear previous data
  await Category.deleteMany({ user: user._id });
  await Transaction.deleteMany({ user: user._id });
  await GlobalMerchantKnowledge.deleteMany({ normalizedMerchant: 'STARBUCKS' });
  await UserMerchantKnowledge.deleteMany({ user: user._id, normalizedMerchant: 'STARBUCKS' });

  // 2. Create Categories
  const category1 = await Category.create({ user: user._id, name: 'Food Cat', type: 'expense', intentId: 'food', intentConfidence: 1.0 });
  const category2 = await Category.create({ user: user._id, name: 'Old Food Cat', type: 'expense', intentId: 'food', intentConfidence: 1.0, createdAt: new Date(Date.now() - 100000) });

  console.log('✅ Setup categories.');

  // 3. Create Uncategorized Transactions (Simulating SMS)
  const tx1 = await Transaction.create({
    user: user._id,
    title: 'STARBUCKS CAIRO',
    normalizedMerchant: 'STARBUCKS',
    amount: 100,
    type: 'expense',
    category: null,
    status: 'completed',
    source: 'sms_shortcut'
  });

  const tx2 = await Transaction.create({
    user: user._id,
    title: 'STARBUCKS ZAYED',
    normalizedMerchant: 'STARBUCKS',
    amount: 150,
    type: 'expense',
    category: null,
    status: 'completed',
    source: 'sms_shortcut'
  });

  const txAlreadyCategorized = await Transaction.create({
    user: user._id,
    title: 'STARBUCKS #1234',
    normalizedMerchant: 'STARBUCKS',
    amount: 200,
    type: 'expense',
    category: category1._id, // already has a category
    status: 'completed',
    source: 'sms_shortcut'
  });

  console.log('✅ Setup test transactions.');

  // Verify Uncategorized State
  const uncatCount = await Transaction.countDocuments({ user: user._id, category: null });
  if (uncatCount !== 2) throw new Error(`Expected 2 uncategorized, got ${uncatCount}`);
  console.log('✅ Uncategorized count is correct (2).');

  // 4. Simulate User Categorizing tx1
  console.log('Simulating user categorizing tx1 with "Food Cat"...');
  await Transaction.updateOne({ _id: tx1._id }, { $set: { category: category1._id } });
  
  // Trigger learning (normally called from transactionService hook)
  await learnFromUser(user._id, 'STARBUCKS CAIRO', category1._id);

  // Wait for background reclassification
  await delay(1000);

  // 5. Verify Auto-Reclassification
  const reclassifiedTx2 = await Transaction.findById(tx2._id);
  if (!reclassifiedTx2.category) {
    throw new Error('tx2 was not auto-reclassified!');
  }
  
  // Deterministic check: intentResolver favors intentConfidence 1.0
  // Since both have intentConfidence 1.0, the query order returns the first matched.
  // In `intentResolver.js`, it returns `categories.find(...)` which is based on array order.
  console.log(`✅ tx2 was successfully reclassified to category: ${reclassifiedTx2.category}`);

  // 6. Verify already categorized was untouched
  const checkCategorized = await Transaction.findById(txAlreadyCategorized._id);
  if (checkCategorized.category.toString() !== category1._id.toString()) {
    throw new Error('Already categorized transaction was modified!');
  }
  console.log('✅ Already categorized transaction was safely ignored.');

  // 7. Verify Global Learning
  const globalKnowledge = await GlobalMerchantKnowledge.findOne({ normalizedMerchant: 'STARBUCKS' });
  if (!globalKnowledge || globalKnowledge.intentId !== 'food') {
    throw new Error('Global knowledge was not saved correctly.');
  }
  console.log('✅ Global merchant knowledge saved safely.');

  console.log('\n🎉 ALL UNCATEGORIZED & AUTO-RECLASSIFICATION TESTS PASSED! 🎉\n');
  mongoose.connection.close();
}

runUncategorizedTests().catch(err => {
  console.error('❌ TEST FAILED:', err);
  mongoose.connection.close();
  process.exit(1);
});
