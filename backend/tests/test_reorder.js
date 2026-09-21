require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { getAccounts, createAccount, reorderAccounts } = require('../services/accountService');
const { getCategories, createCategory, reorderCategories } = require('../services/categoryService');
const Account = require('../models/Account');
const Category = require('../models/Category');
const User = require('../models/User');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function run() {
  console.log('🚀 Testing Account & Category Reorder Logic...\n');
  if (!process.env.MONGO_URI) {
    console.log('No MONGO_URI in .env, skipping DB test.');
    return;
  }
  await mongoose.connect(process.env.MONGO_URI);

  const testUserId = new mongoose.Types.ObjectId();

  try {
    // 1. Create accounts and test auto-order
    console.log('1. Testing Account auto-ordering...');
    const acc1 = await createAccount(testUserId, { name: 'Account A', type: 'cash' });
    const acc2 = await createAccount(testUserId, { name: 'Account B', type: 'bank' });
    const acc3 = await createAccount(testUserId, { name: 'Account C', type: 'wallet' });

    assert(acc1.order === 0, `acc1 order is ${acc1.order}, expected 0`);
    assert(acc2.order === 1, `acc2 order is ${acc2.order}, expected 1`);
    assert(acc3.order === 2, `acc3 order is ${acc3.order}, expected 2`);

    // 2. Reorder accounts: C, A, B
    console.log('\n2. Testing Account reorder...');
    const reorderedAccs = await reorderAccounts(testUserId, [acc3._id, acc1._id, acc2._id]);
    assert(reorderedAccs.length === 3, 'Should return 3 accounts');
    assert(reorderedAccs[0]._id.toString() === acc3._id.toString(), 'First account should be C');
    assert(reorderedAccs[1]._id.toString() === acc1._id.toString(), 'Second account should be A');
    assert(reorderedAccs[2]._id.toString() === acc2._id.toString(), 'Third account should be B');

    // 3. Verify getAccounts persists this order
    const fetchedAccs = await getAccounts(testUserId);
    assert(fetchedAccs[0].name === 'Account C', 'getAccounts should return Account C first');
    assert(fetchedAccs[1].name === 'Account A', 'getAccounts should return Account A second');
    assert(fetchedAccs[2].name === 'Account B', 'getAccounts should return Account B third');

    // 4. Test Category auto-ordering per type
    console.log('\n3. Testing Category auto-ordering per type...');
    const catExp1 = await createCategory(testUserId, { name: 'Food', type: 'expense' });
    const catExp2 = await createCategory(testUserId, { name: 'Rent', type: 'expense' });
    const catInc1 = await createCategory(testUserId, { name: 'Salary', type: 'income' });
    const catInc2 = await createCategory(testUserId, { name: 'Freelance', type: 'income' });

    assert(catExp1.order === 0, `catExp1 order is ${catExp1.order}, expected 0`);
    assert(catExp2.order === 1, `catExp2 order is ${catExp2.order}, expected 1`);
    assert(catInc1.order === 0, `catInc1 order is ${catInc1.order}, expected 0`);
    assert(catInc2.order === 1, `catInc2 order is ${catInc2.order}, expected 1`);

    // 5. Reorder expense categories: Rent, Food
    console.log('\n4. Testing Category reordering...');
    const reorderedCats = await reorderCategories(testUserId, [catExp2._id, catExp1._id]);
    const expenses = reorderedCats.filter(c => c.type === 'expense');
    assert(expenses[0]._id.toString() === catExp2._id.toString(), 'Rent should now be first');
    assert(expenses[1]._id.toString() === catExp1._id.toString(), 'Food should now be second');

    console.log('\n🎉 ALL REORDER TESTS PASSED SUCCESSFULLY!');
  } finally {
    // Cleanup test data
    await Account.deleteMany({ user: testUserId });
    await Category.deleteMany({ user: testUserId });
    await mongoose.disconnect();
  }
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
