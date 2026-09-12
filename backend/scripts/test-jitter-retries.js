const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const User = require('../models/User');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.create({ name: 'JitterTest', email: 'jitter_' + Date.now() + '@test.com', password: 'Password123!' });
  const acc = await Account.create({ user: user._id, name: 'Acc', type: 'bank' });
  const cat = await Category.create({ user: user._id, name: 'Cat', type: 'expense' });
  const now = new Date();
  const budget = await Budget.create({
    user: user._id, category: cat._id, amount: 10000, spent: 0, period: 'monthly',
    startDate: new Date(now.getFullYear(), now.getMonth(), 1),
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    isActive: true
  });

  let totalAttempts = 0;
  let writeConflicts = 0;

  async function createWithJitter(i) {
    let attempt = 0;
    const maxRetries = 20;
    const initialDelay = 15;
    const maxDelay = 200;

    while (true) {
      attempt++;
      totalAttempts++;
      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        await Transaction.create([{
          user: user._id, title: 'Tx ' + i, amount: 10, type: 'expense', date: now,
          category: cat._id, account: acc._id
        }], { session });

        await Budget.updateMany({
          user: user._id, category: cat._id, isActive: true
        }, { $inc: { spent: 10 } }, { session });

        await session.commitTransaction();
        break;
      } catch (err) {
        await session.abortTransaction().catch(() => {});
        const isWriteConflict = err.code === 112 || (typeof err.message === 'string' && err.message.includes('Write conflict'));
        const isTransient = typeof err.hasErrorLabel === 'function' && (
          err.hasErrorLabel('TransientTransactionError') ||
          err.hasErrorLabel('UnknownTransactionCommitResult')
        );

        if ((isWriteConflict || isTransient) && attempt <= maxRetries) {
          writeConflicts++;
          const backoff = Math.min(maxDelay, initialDelay * Math.pow(1.5, attempt - 1));
          const delay = Math.floor(Math.random() * backoff) + 10;
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw err;
      } finally {
        await session.endSession();
      }
    }
  }

  console.log('Running 10 concurrent transactions with Jittered Backoff...');
  const t0 = Date.now();
  await Promise.all([0,1,2,3,4,5,6,7,8,9].map(i => createWithJitter(i)));
  const dur = Date.now() - t0;

  console.log('Duration for 10 tx (Jitter):', dur, 'ms');
  console.log('Total attempts:', totalAttempts);
  console.log('Write conflicts caught:', writeConflicts);

  const finalB = await Budget.findById(budget._id);
  console.log('Final budget spent:', finalB.spent, '(Expected 100)');

  // Now let's test 25 transactions with Jitter!
  await Budget.updateOne({ _id: budget._id }, { $set: { spent: 0 } });
  totalAttempts = 0;
  writeConflicts = 0;
  console.log('\nRunning 25 concurrent transactions with Jittered Backoff...');
  const t1 = Date.now();
  await Promise.all(Array.from({ length: 25 }, (_, i) => createWithJitter(i)));
  const dur25 = Date.now() - t1;

  console.log('Duration for 25 tx (Jitter):', dur25, 'ms');
  console.log('Total attempts for 25 tx:', totalAttempts);
  console.log('Write conflicts caught for 25 tx:', writeConflicts);

  const finalB25 = await Budget.findById(budget._id);
  console.log('Final budget spent for 25 tx:', finalB25.spent, '(Expected 250)');

  // Cleanup
  await User.deleteOne({ _id: user._id });
  await Account.deleteOne({ _id: acc._id });
  await Category.deleteOne({ _id: cat._id });
  await Budget.deleteOne({ _id: budget._id });
  await Transaction.deleteMany({ user: user._id });
  process.exit(0);
}
test();
