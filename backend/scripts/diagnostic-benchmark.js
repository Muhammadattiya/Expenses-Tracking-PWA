const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const User = require('../models/User');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const { createTransaction } = require('../services/transactionService');

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function setupBenchmarkUser() {
  const email = `diag_user_${Date.now()}@example.com`;
  const user = await User.create({
    name: 'Diagnostic User',
    email,
    password: 'Password123!'
  });

  const account = await Account.create({
    user: user._id,
    name: 'Diag Checking',
    type: 'bank'
  });

  const category = await Category.create({
    user: user._id,
    name: 'Diag Category',
    type: 'expense',
    icon: 'shopping-cart',
    color: '#8D6346'
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
    isActive: true,
    notificationState: {
      lastPeriodStart: startDate,
      notified50: false,
      notified75: false,
      notified90: false,
      notified100: false,
      notifiedExceeded: false
    }
  });

  return { user, account, category, budget, startDate, endDate };
}

// Worker pool to execute a list of tasks with a maximum concurrency limit
async function runWithConcurrencyLimit(tasks, limit) {
  const results = [];
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < tasks.length) {
      const idx = currentIndex++;
      results[idx] = await tasks[idx]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function executeTestRun(userContext, modeName, totalRequests, maxConcurrency) {
  const { user, account, category, budget } = userContext;

  // Reset budget spent and clear transactions for user
  await Budget.updateOne({ _id: budget._id }, { $set: { spent: 0 } });
  await Transaction.deleteMany({ user: user._id });

  let callbackInvocations = 0;
  let writeConflictCount = 0;
  let transientErrorCount = 0;

  const latencies = [];
  const amountEach = 10;
  const now = new Date();

  const tasks = Array.from({ length: totalRequests }, (_, i) => {
    return async () => {
      const payload = {
        title: `Diag Tx ${modeName} ${i}`,
        amount: amountEach,
        type: 'expense',
        date: now,
        category: category._id,
        account: account._id,
        idempotencyKey: `diag_${modeName}_${i}_${Date.now()}_${Math.random()}`
      };

      const reqStart = Date.now();
      try {
        const doc = await createTransaction(user._id, payload, {
          trusted: true,
          onAttempt: () => {
            callbackInvocations++;
          },
          onError: (err) => {
            const isConflict = err.code === 112 || (typeof err.message === 'string' && err.message.includes('Write conflict'));
            const isTransient = typeof err.hasErrorLabel === 'function' && err.hasErrorLabel('TransientTransactionError');
            if (isConflict) writeConflictCount++;
            if (isTransient) transientErrorCount++;
          }
        });
        const lat = Date.now() - reqStart;
        latencies.push(lat);
        return { success: true, doc, latency: lat };
      } catch (err) {
        const lat = Date.now() - reqStart;
        latencies.push(lat);
        return { success: false, error: err.message, latency: lat };
      }
    };
  });

  const startTime = Date.now();
  const results = await runWithConcurrencyLimit(tasks, maxConcurrency);
  const totalDuration = Date.now() - startTime;

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  const finalTxCount = await Transaction.countDocuments({ user: user._id });
  const finalBudget = await Budget.findById(budget._id);

  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const throughput = (successful / (totalDuration / 1000)).toFixed(2);

  return {
    modeName,
    totalRequests,
    maxConcurrency,
    totalDuration,
    p50,
    p95,
    p99,
    throughput: `${throughput} req/s`,
    successful,
    failed,
    writeConflictCount,
    transientErrorCount,
    callbackInvocations,
    internalRetries: callbackInvocations - totalRequests,
    finalTxCount,
    finalBudgetSpent: finalBudget.spent,
    expectedBudgetSpent: totalRequests * amountEach
  };
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas');

  const userContext = await setupBenchmarkUser();
  console.log(`Benchmark User Created: ${userContext.user._id}`);

  console.log('\n================================================================');
  console.log('PART 0: SINGLE TRANSACTION LATENCY (Concurrency = 1, 1 request)');
  console.log('================================================================');
  const singleTx = await executeTestRun(userContext, 'single_tx', 1, 1);
  console.log(JSON.stringify(singleTx, null, 2));

  console.log('\n================================================================');
  console.log('MODE 2: SERIALIZED DIAGNOSTIC (100 total requests, Concurrency = 1)');
  console.log('================================================================');
  console.log('Running 100 requests strictly one-at-a-time...');
  const serialized100 = await executeTestRun(userContext, 'serialized_100', 100, 1);
  console.log(JSON.stringify(serialized100, null, 2));

  console.log('\n================================================================');
  console.log('MODE 3: CONTROLLED CONCURRENCY (100 total requests)');
  console.log('================================================================');

  console.log('Running with Concurrency Limit = 5...');
  const pool5 = await executeTestRun(userContext, 'pool_5', 100, 5);
  console.log(JSON.stringify(pool5, null, 2));

  console.log('\nRunning with Concurrency Limit = 10...');
  const pool10 = await executeTestRun(userContext, 'pool_10', 100, 10);
  console.log(JSON.stringify(pool10, null, 2));

  console.log('\nRunning with Concurrency Limit = 20...');
  const pool20 = await executeTestRun(userContext, 'pool_20', 100, 20);
  console.log(JSON.stringify(pool20, null, 2));

  console.log('\nRunning with Concurrency Limit = 50...');
  const pool50 = await executeTestRun(userContext, 'pool_50', 100, 50);
  console.log(JSON.stringify(pool50, null, 2));

  console.log('\n================================================================');
  console.log('MODE 1: FULL UNCONTROLLED CONCURRENCY (100 simultaneous requests)');
  console.log('================================================================');
  console.log('Running 100 requests simultaneously...');
  const full100 = await executeTestRun(userContext, 'full_concurrent_100', 100, 100);
  console.log(JSON.stringify(full100, null, 2));

  // Cleanup
  await User.deleteOne({ _id: userContext.user._id });
  await Account.deleteOne({ _id: userContext.account._id });
  await Category.deleteOne({ _id: userContext.category._id });
  await Budget.deleteOne({ _id: userContext.budget._id });
  await Transaction.deleteMany({ user: userContext.user._id });

  console.log('\n================================================================');
  console.log('ALL DIAGNOSTIC BENCHMARKS COMPLETED');
  console.log('================================================================');
  console.log(JSON.stringify({
    singleTx,
    serialized100,
    pool5,
    pool10,
    pool20,
    pool50,
    full100
  }, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error('Diagnostic benchmark failed:', err);
  process.exit(1);
});
