const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const User = require('../models/User');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Budget = require('../models/Budget');
const SmartBudgetPlan = require('../models/SmartBudgetPlan');
const Transaction = require('../models/Transaction');

async function benchmarkOptimized() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const user = await User.create({
    name: 'OptBench User',
    email: `opt_bench_${Date.now()}@example.com`,
    password: 'Password123!'
  });

  const account = await Account.create({
    user: user._id,
    name: 'Opt Checking',
    type: 'bank'
  });

  const category = await Category.create({
    user: user._id,
    name: 'Opt Groceries',
    type: 'expense'
  });

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const budget = await Budget.create({
    user: user._id,
    category: category._id,
    amount: 100000,
    spent: 0,
    period: 'monthly',
    startDate,
    endDate,
    isActive: true
  });

  // Check if user has master smart budget once outside or memoized
  const hasSmartBudget = await SmartBudgetPlan.exists({ user: user._id, status: 'confirmed', groupAsMaster: true });

  let callbackAttempts = 0;

  async function createOptimized(i) {
    const t0 = Date.now();
    // 1. Parallel reference validation
    await Promise.all([
      Account.findOne({ _id: account._id, user: user._id }),
      Category.findOne({ _id: category._id, user: user._id })
    ]);

    // 2. Fresh session per attempt with backoff
    let attempt = 0;
    const maxRetries = 10;
    const initialDelay = 15;
    const maxDelay = 250;

    while (true) {
      attempt++;
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          callbackAttempts++;
          const [doc] = await Transaction.create([{
            user: user._id,
            title: `Opt Tx ${i}`,
            amount: 10,
            type: 'expense',
            date: now,
            category: category._id,
            account: account._id,
            idempotencyKey: `opt_${Date.now()}_${i}_${Math.random()}`
          }], { session });

          // Budget update using targeted index
          await Budget.updateOne({
            user: user._id,
            category: category._id,
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
          }, {
            $inc: { spent: 10 }
          }, { session });

          // Only touch SmartBudgetPlan if it actually exists for this user
          if (hasSmartBudget) {
            await SmartBudgetPlan.updateOne({
              user: user._id,
              status: 'confirmed',
              groupAsMaster: true,
              'categories.category': category._id,
              startDate: { $lte: now },
              endDate: { $gte: now }
            }, {
              $inc: { spent: 10 }
            }, { session });
          }
        });
        break;
      } catch (err) {
        const isWriteConflict = err.code === 112 || (typeof err.message === 'string' && err.message.includes('Write conflict'));
        const isTransient = typeof err.hasErrorLabel === 'function' && (
          err.hasErrorLabel('TransientTransactionError') ||
          err.hasErrorLabel('UnknownTransactionCommitResult')
        );
        const isDuplicateKey = err.code === 11000 || (typeof err.message === 'string' && /E11000/i.test(err.message));

        if (!isDuplicateKey && (isWriteConflict || isTransient) && attempt <= maxRetries) {
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
    return Date.now() - t0;
  }

  for (const c of [1, 10, 25, 50, 100]) {
    await Budget.updateOne({ _id: budget._id }, { $set: { spent: 0 } });
    await Transaction.deleteMany({ user: user._id });
    callbackAttempts = 0;

    console.log(`\nTesting optimized concurrency = ${c}...`);
    const t0 = Date.now();
    const latencies = await Promise.all(Array.from({ length: c }, (_, i) => createOptimized(i)));
    const totalDuration = Date.now() - t0;

    const finalB = await Budget.findById(budget._id);
    const finalTx = await Transaction.countDocuments({ user: user._id });

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[latencies.length - 1];
    const throughput = (c / (totalDuration / 1000)).toFixed(2);

    console.log(`Concurrency ${c} Results:`);
    console.log(`  Total Duration: ${totalDuration} ms`);
    console.log(`  p50: ${p50} ms | p95: ${p95} ms | p99: ${p99} ms`);
    console.log(`  Throughput: ${throughput} req/s`);
    console.log(`  Final Tx Count: ${finalTx} (Expected: ${c})`);
    console.log(`  Final Budget Spent: ${finalB.spent} (Expected: ${c * 10})`);
    console.log(`  Total Callback Invocations: ${callbackAttempts} (Retries: ${callbackAttempts - c})`);
  }

  // Cleanup
  await User.deleteOne({ _id: user._id });
  await Account.deleteOne({ _id: account._id });
  await Category.deleteOne({ _id: category._id });
  await Budget.deleteOne({ _id: budget._id });
  await Transaction.deleteMany({ user: user._id });
  process.exit(0);
}

benchmarkOptimized().catch(err => {
  console.error(err);
  process.exit(1);
});
