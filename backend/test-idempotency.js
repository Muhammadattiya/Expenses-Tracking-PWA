const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Transaction = require('./models/Transaction');
const User = require('./models/User');
const Account = require('./models/Account');
const Category = require('./models/Category');
const { createTransaction } = require('./services/transactionService');

const runTest = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    let user = await User.findOne({ email: 'test@idempotency.com' });
    if (!user) {
      user = await User.create({ name: 'Test User', email: 'test@idempotency.com', password: 'Password123!', settings: {} });
    }

    let account = await Account.findOne({ user: user._id });
    if (!account) account = await Account.create({ user: user._id, name: 'Test Account', type: 'cash' });

    let category = await Category.findOne({ user: user._id });
    if (!category) category = await Category.create({ user: user._id, name: 'Test Category', type: 'expense' });

    const idempotencyKey = 'test-idempotency-key-123';
    
    // Cleanup any existing
    await Transaction.deleteMany({ user: user._id, idempotencyKey });

    const txData = {
      title: 'Test Idempotency',
      amount: 150,
      type: 'expense',
      date: new Date(),
      idempotencyKey,
      trusted: true,
      account: account._id,
      category: category._id
    };

    console.log('1. First attempt to create transaction...');
    const tx1 = await createTransaction(user._id, txData, { trusted: true });
    console.log('Created transaction ID:', tx1._id);

    console.log('2. Second attempt with exact same payload (should return existing)...');
    const tx2 = await createTransaction(user._id, txData, { trusted: true });
    console.log('Returned transaction ID:', tx2._id);

    if (tx1._id.toString() === tx2._id.toString()) {
      console.log('✅ Idempotency successful: Returned the same transaction.');
    } else {
      console.log('❌ Idempotency failed: Returned different transactions.');
    }

    console.log('3. Third attempt with different payload (should throw 409)...');
    try {
      await createTransaction(user._id, { ...txData, amount: 200 }, { trusted: true });
      console.log('❌ Failed: Should have thrown conflict error.');
    } catch (err) {
      if (err.statusCode === 409) {
        console.log('✅ Success: Correctly threw 409 conflict error.');
      } else {
        console.log('❌ Failed: Threw error, but not 409:', err);
      }
    }

    console.log('4. Fourth attempt with different user but SAME idempotencyKey...');
    let userB = await User.findOne({ email: 'test2@idempotency.com' });
    if (!userB) {
      userB = await User.create({ name: 'Test User B', email: 'test2@idempotency.com', password: 'Password123!', settings: {} });
    }
    
    let accountB = await Account.findOne({ user: userB._id });
    if (!accountB) accountB = await Account.create({ user: userB._id, name: 'Test Account', type: 'cash' });

    let categoryB = await Category.findOne({ user: userB._id });
    if (!categoryB) categoryB = await Category.create({ user: userB._id, name: 'Test Category', type: 'expense' });

    await Transaction.deleteMany({ user: userB._id, idempotencyKey });
    
    try {
      const tx4 = await createTransaction(userB._id, { ...txData, account: accountB._id, category: categoryB._id }, { trusted: true });
      if (tx4._id.toString() !== tx1._id.toString()) {
         console.log('✅ Success: Created a separate transaction for User B despite same idempotencyKey.');
      } else {
         console.log('❌ Failed: Returned User A transaction to User B!');
      }
    } catch(err) {
      console.log('❌ Failed: Threw error on cross-user idempotency test', err);
    }

  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

runTest();
