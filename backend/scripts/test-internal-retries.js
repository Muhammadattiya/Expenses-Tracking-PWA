const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const User = require('../models/User');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.create({ name: 'ContentionTest', email: 'contention_' + Date.now() + '@test.com', password: 'Password123!' });
  const acc = await Account.create({ user: user._id, name: 'Acc', type: 'bank' });
  const cat = await Category.create({ user: user._id, name: 'Cat', type: 'expense' });
  const now = new Date();
  const budget = await Budget.create({
    user: user._id, category: cat._id, amount: 10000, spent: 0, period: 'monthly',
    startDate: new Date(now.getFullYear(), now.getMonth(), 1),
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    isActive: true
  });

  let totalCallbackInvocations = 0;

  async function createOne(i) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        totalCallbackInvocations++;
        await Transaction.create([{
          user: user._id, title: 'Tx ' + i, amount: 10, type: 'expense', date: now,
          category: cat._id, account: acc._id
        }], { session });

        await Budget.updateMany({
          user: user._id, category: cat._id, isActive: true
        }, { $inc: { spent: 10 } }, { session });
      });
    } finally {
      await session.endSession();
    }
  }

  console.log('Running 10 concurrent transactions...');
  const t0 = Date.now();
  await Promise.all([0,1,2,3,4,5,6,7,8,9].map(i => createOne(i)));
  const dur = Date.now() - t0;

  console.log('Duration for 10 tx:', dur, 'ms');
  console.log('Total callback invocations:', totalCallbackInvocations, '(Expected 10 if 0 retries)');
  console.log('Internal retries by driver:', totalCallbackInvocations - 10);

  const finalB = await Budget.findById(budget._id);
  console.log('Final budget spent:', finalB.spent, '(Expected 100)');

  // Cleanup
  await User.deleteOne({ _id: user._id });
  await Account.deleteOne({ _id: acc._id });
  await Category.deleteOne({ _id: cat._id });
  await Budget.deleteOne({ _id: budget._id });
  await Transaction.deleteMany({ user: user._id });
  process.exit(0);
}
test();
