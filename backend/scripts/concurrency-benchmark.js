const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const User = require('../models/User');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Budget = require('../models/Budget');
const SmartBudgetPlan = require('../models/SmartBudgetPlan');
const Transaction = require('../models/Transaction');
const { createTransaction } = require('../services/transactionService');

// Metrics collectors
let metrics = {
  sessionStartupTimes: [],
  txWriteTimes: [],
  budgetUpdateTimes: [],
  smartBudgetUpdateTimes: [],
  totalLatencies: [],
  retriesPerRequest: [],
  writeConflictCount: 0,
  transientErrorCount: 0,
  duplicateKeyCount: 0,
  totalMongoOps: 0
};

function resetMetrics() {
  metrics = {
    sessionStartupTimes: [],
    txWriteTimes: [],
    budgetUpdateTimes: [],
    smartBudgetUpdateTimes: [],
    totalLatencies: [],
    retriesPerRequest: [],
    writeConflictCount: 0,
    transientErrorCount: 0,
    duplicateKeyCount: 0,
    totalMongoOps: 0
  };
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function setupBenchmarkUser() {
  const email = `bench_${Date.now()}@example.com`;
  const user = await User.create({
    name: 'Benchmark User',
    email,
    password: 'Password123!'
  });

  const account = await Account.create({
    user: user._id,
    name: 'Main Checking',
    type: 'bank'
  });

  const category = await Category.create({
    user: user._id,
    name: 'Benchmark Groceries',
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

// Instrumented transaction creation for fine-grained measurement
async function instrumentedCreateTransaction(userId, data, options = {}) {
  const { disableSmartBudget = false } = options;
  const t0 = Date.now();
  let retries = 0;

  // 1. References validation
  if (data.account) {
    await Account.findOne({ _id: data.account, user: userId });
  }
  if (data.category) {
    await Category.findOne({ _id: data.category, user: userId });
  }

  // 2. Budget sync
  const { syncBudgetPeriods } = require('../services/budgetEngine');
  await syncBudgetPeriods(userId);

  // 3. Idempotency check if key provided
  if (data.idempotencyKey) {
    await Transaction.findOne({ user: userId, idempotencyKey: data.idempotencyKey }).lean();
  }

  // 4. Session & Transaction with timing
  let txStart = 0;
  let txEnd = 0;
  let bStart = 0;
  let bEnd = 0;
  let sbStart = 0;
  let sbEnd = 0;
  let createdDoc = null;

  const s0 = Date.now();
  const session = await mongoose.startSession();
  const sStartup = Date.now() - s0;
  metrics.sessionStartupTimes.push(sStartup);

  const initialDelay = 25;
  const maxDelay = 400;
  const maxRetries = 5;

  try {
    while (true) {
      try {
        await session.withTransaction(async () => {
          // Transaction insert timing
          txStart = Date.now();
          const [doc] = await Transaction.create([{
            user: userId,
            ...data,
            source: data.source || 'manual'
          }], { session });
          txEnd = Date.now();
          metrics.txWriteTimes.push(txEnd - txStart);

          if (doc.type === 'expense') {
            const txDate = doc.date ? new Date(doc.date) : new Date();
            const txAmount = Number(doc.amount) || 0;
            const categoryId = doc.category;

            // Budget update timing
            bStart = Date.now();
            await Budget.updateMany({
              user: userId,
              category: categoryId,
              isActive: true,
              startDate: { $lte: txDate },
              endDate: { $gte: txDate }
            }, {
              $inc: { spent: txAmount }
            }, { session });
            bEnd = Date.now();
            metrics.budgetUpdateTimes.push(bEnd - bStart);

            // SmartBudget timing (if enabled)
            if (!disableSmartBudget) {
              sbStart = Date.now();
              await SmartBudgetPlan.updateMany({
                user: userId,
                status: 'confirmed',
                groupAsMaster: true,
                'categories.category': categoryId,
                startDate: { $lte: txDate },
                endDate: { $gte: txDate }
              }, {
                $inc: { spent: txAmount }
              }, { session });
              sbEnd = Date.now();
              metrics.smartBudgetUpdateTimes.push(sbEnd - sbStart);
            }
          }
          createdDoc = doc;
        });
        break; // Successfully committed
      } catch (err) {
        retries++;
        const isWriteConflict = err.code === 112 || (typeof err.message === 'string' && err.message.includes('Write conflict'));
        const isTransient = typeof err.hasErrorLabel === 'function' && (
          err.hasErrorLabel('TransientTransactionError') ||
          err.hasErrorLabel('UnknownTransactionCommitResult')
        );
        const isDuplicateKey = err.code === 11000 || (typeof err.message === 'string' && /E11000/i.test(err.message));

        if (isWriteConflict) metrics.writeConflictCount++;
        if (isTransient) metrics.transientErrorCount++;
        if (isDuplicateKey) metrics.duplicateKeyCount++;

        if (!isDuplicateKey && (isWriteConflict || isTransient) && retries <= maxRetries) {
          const backoff = Math.min(maxDelay, initialDelay * Math.pow(2, retries - 1));
          const delay = Math.floor(Math.random() * backoff);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
  } finally {
    await session.endSession();
  }

  // Populate after commit
  await Transaction.findById(createdDoc._id)
    .populate('account category from_account to_account')
    .lean();

  const totalTime = Date.now() - t0;
  metrics.totalLatencies.push(totalTime);
  metrics.retriesPerRequest.push(retries);

  return { doc: createdDoc, totalTime, retries };
}

async function runBenchmarkLevel(userContext, concurrency, disableSmartBudget = false) {
  resetMetrics();
  const { user, account, category, budget } = userContext;

  // Reset budget spent to 0 before run
  await Budget.updateOne({ _id: budget._id }, { $set: { spent: 0 } });
  await Transaction.deleteMany({ user: user._id });

  const amount = 10;
  const startTime = Date.now();

  const promises = [];
  for (let i = 0; i < concurrency; i++) {
    const payload = {
      title: `Bench Tx ${i}`,
      amount,
      type: 'expense',
      date: new Date(),
      category: category._id,
      account: account._id,
      idempotencyKey: `bench_${concurrency}_${i}_${Date.now()}_${Math.random()}`
    };

    promises.push(
      instrumentedCreateTransaction(user._id, payload, { disableSmartBudget })
        .then(res => ({ success: true, ...res }))
        .catch(err => ({ success: false, error: err.message }))
    );
  }

  const results = await Promise.all(promises);
  const totalDuration = Date.now() - startTime;

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalRetries = metrics.retriesPerRequest.reduce((a, b) => a + b, 0);

  const finalTxCount = await Transaction.countDocuments({ user: user._id });
  const finalBudget = await Budget.findById(budget._id);

  const p50 = percentile(metrics.totalLatencies, 50);
  const p95 = percentile(metrics.totalLatencies, 95);
  const p99 = percentile(metrics.totalLatencies, 99);
  const throughput = (successful / (totalDuration / 1000)).toFixed(2);

  const avgSessionStartup = metrics.sessionStartupTimes.length ? (metrics.sessionStartupTimes.reduce((a, b) => a + b, 0) / metrics.sessionStartupTimes.length).toFixed(2) : 0;
  const avgTxWrite = metrics.txWriteTimes.length ? (metrics.txWriteTimes.reduce((a, b) => a + b, 0) / metrics.txWriteTimes.length).toFixed(2) : 0;
  const avgBudgetUpdate = metrics.budgetUpdateTimes.length ? (metrics.budgetUpdateTimes.reduce((a, b) => a + b, 0) / metrics.budgetUpdateTimes.length).toFixed(2) : 0;
  const avgSmartBudgetUpdate = metrics.smartBudgetUpdateTimes.length ? (metrics.smartBudgetUpdateTimes.reduce((a, b) => a + b, 0) / metrics.smartBudgetUpdateTimes.length).toFixed(2) : 0;

  return {
    concurrency,
    disableSmartBudget,
    totalDuration,
    p50,
    p95,
    p99,
    throughput: `${throughput} req/s`,
    successful,
    failed,
    totalRetries,
    finalTxCount,
    finalBudgetSpent: finalBudget.spent,
    expectedSpent: concurrency * amount,
    breakdown: {
      avgSessionStartup: `${avgSessionStartup} ms`,
      avgTxWrite: `${avgTxWrite} ms`,
      avgBudgetUpdate: `${avgBudgetUpdate} ms`,
      avgSmartBudgetUpdate: `${avgSmartBudgetUpdate} ms`,
      writeConflicts: metrics.writeConflictCount,
      transientErrors: metrics.transientErrorCount,
      e11000Errors: metrics.duplicateKeyCount
    }
  };
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const userContext = await setupBenchmarkUser();
  console.log(`User created: ${userContext.user._id}`);

  const levels = [1, 10, 25, 50, 100];
  const allResults = [];

  console.log('\n======================================================');
  console.log('PART 1: BASELINE CONCURRENCY BENCHMARK (CURRENT ARCH)');
  console.log('======================================================');

  for (const c of levels) {
    console.log(`\nRunning benchmark for concurrency = ${c}...`);
    const res = await runBenchmarkLevel(userContext, c, false);
    allResults.push(res);
    console.log(JSON.stringify(res, null, 2));
  }

  console.log('\n======================================================');
  console.log('PART 2: DIAGNOSTIC COMPARISON (SmartBudget Disabled)');
  console.log('======================================================');

  const diagResults = [];
  for (const c of levels) {
    console.log(`\nRunning diagnostic benchmark for concurrency = ${c} (No SmartBudget)...`);
    const res = await runBenchmarkLevel(userContext, c, true);
    diagResults.push(res);
    console.log(JSON.stringify(res, null, 2));
  }

  // Cleanup
  await User.deleteOne({ _id: userContext.user._id });
  await Account.deleteOne({ _id: userContext.account._id });
  await Category.deleteOne({ _id: userContext.category._id });
  await Budget.deleteOne({ _id: userContext.budget._id });
  await Transaction.deleteMany({ user: userContext.user._id });

  console.log('\n=== ALL BENCHMARKS COMPLETED ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
