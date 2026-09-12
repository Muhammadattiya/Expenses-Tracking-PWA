const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const User = require('../models/User');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Budget = require('../models/Budget');
const SmartBudgetPlan = require('../models/SmartBudgetPlan');
const Transaction = require('../models/Transaction');
const { createTransaction } = require('../services/transactionService');

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function setupBenchmarkUser() {
  const email = `tier1_bench_${Date.now()}@example.com`;
  const user = await User.create({
    name: 'Tier1 Bench User',
    email,
    password: 'Password123!'
  });

  const account = await Account.create({
    user: user._id,
    name: 'Tier1 Checking',
    type: 'bank'
  });

  const category = await Category.create({
    user: user._id,
    name: 'Tier1 Category',
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

async function runLevel(userContext, concurrency) {
  const { user, account, category, budget } = userContext;

  // Reset counters & collections
  await Budget.updateOne({ _id: budget._id }, { $set: { spent: 0 } });
  await Transaction.deleteMany({ user: user._id });

  // Command monitoring metrics
  let totalMongoOps = 0;
  let writeConflictCount = 0;
  let transientErrorCount = 0;
  let abortCount = 0;
  let commitCount = 0;
  let insertCount = 0;
  let budgetUpdateCount = 0;
  let smartBudgetUpdateCount = 0;
  let syncBudgetQueriesCount = 0;

  let insertDurations = [];
  let budgetUpdateDurations = [];

  const client = mongoose.connection.getClient();

  const startedMap = new Map();
  const onCommandStarted = (event) => {
    totalMongoOps++;
    startedMap.set(event.requestId, { name: event.commandName, time: Date.now() });

    if (event.commandName === 'find' && (event.command?.filter?.email || event.command?.find === 'users' || event.command?.find === 'subscriptions')) {
      syncBudgetQueriesCount++;
    }
    if (event.commandName === 'update') {
      if (event.command?.update === 'smartbudgetplans') smartBudgetUpdateCount++;
      if (event.command?.update === 'budgets') budgetUpdateCount++;
    }
  };

  const onCommandSucceeded = (event) => {
    const started = startedMap.get(event.requestId);
    if (started) {
      const dur = Date.now() - started.time;
      if (started.name === 'insert') insertDurations.push(dur);
      if (started.name === 'update') budgetUpdateDurations.push(dur);
      if (started.name === 'commitTransaction') commitCount++;
      startedMap.delete(event.requestId);
    }
  };

  const onCommandFailed = (event) => {
    const started = startedMap.get(event.requestId);
    if (started) startedMap.delete(event.requestId);

    const isConflict = event.failure?.code === 112 || (typeof event.failure?.message === 'string' && event.failure.message.includes('Write conflict'));
    const isTransient = typeof event.failure?.hasErrorLabel === 'function' && event.failure.hasErrorLabel('TransientTransactionError');

    if (isConflict) writeConflictCount++;
    if (isTransient) transientErrorCount++;
    if (event.commandName === 'abortTransaction') abortCount++;
  };

  client.on('commandStarted', onCommandStarted);
  client.on('commandSucceeded', onCommandSucceeded);
  client.on('commandFailed', onCommandFailed);

  const amountEach = 10;
  const startTime = Date.now();
  const latencies = [];

  const promises = [];
  for (let i = 0; i < concurrency; i++) {
    const payload = {
      title: `Tier1 Tx ${concurrency}_${i}`,
      amount: amountEach,
      type: 'expense',
      date: new Date(),
      category: category._id,
      account: account._id,
      idempotencyKey: `tier1_${concurrency}_${i}_${Date.now()}_${Math.random()}`
    };

    const reqStart = Date.now();
    promises.push(
      createTransaction(user._id, payload, { trusted: true })
        .then(doc => {
          const lat = Date.now() - reqStart;
          latencies.push(lat);
          return { success: true, doc, latency: lat };
        })
        .catch(err => {
          const lat = Date.now() - reqStart;
          latencies.push(lat);
          return { success: false, error: err.message, latency: lat };
        })
    );
  }

  const results = await Promise.all(promises);
  const totalDuration = Date.now() - startTime;

  // Detach listeners
  client.removeListener('commandStarted', onCommandStarted);
  client.removeListener('commandSucceeded', onCommandSucceeded);
  client.removeListener('commandFailed', onCommandFailed);

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  const finalTxCount = await Transaction.countDocuments({ user: user._id });
  const finalBudget = await Budget.findById(budget._id);
  const finalSmartBudget = await SmartBudgetPlan.findOne({ user: user._id, status: 'confirmed', groupAsMaster: true });

  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const throughput = (successful / (totalDuration / 1000)).toFixed(2);

  const avgInsertLatency = insertDurations.length ? (insertDurations.reduce((a, b) => a + b, 0) / insertDurations.length).toFixed(2) : 0;
  const avgBudgetUpdateLatency = budgetUpdateDurations.length ? (budgetUpdateDurations.reduce((a, b) => a + b, 0) / budgetUpdateDurations.length).toFixed(2) : 0;
  const opsPerRequest = (totalMongoOps / concurrency).toFixed(2);

  return {
    concurrency,
    totalDuration,
    p50,
    p95,
    p99,
    throughput: `${throughput} req/s`,
    successful,
    failed,
    writeConflictCount,
    transientErrorCount,
    applicationRetryCount: 0, // Errors that bubbled out of withTransaction to withRetry
    withTransactionRetryCount: abortCount, // Internal aborted attempts
    finalTransactionCount: finalTxCount,
    finalBudgetSpent: finalBudget.spent,
    expectedBudgetSpent: concurrency * amountEach,
    finalSmartBudgetSpent: finalSmartBudget ? finalSmartBudget.spent : 0,
    numberMongoOpsPerRequest: opsPerRequest,
    diagnostics: {
      totalMongoOps,
      syncBudgetQueriesCount,
      smartBudgetUpdateCount,
      avgInsertLatencyMs: avgInsertLatency,
      avgBudgetUpdateLatencyMs: avgBudgetUpdateLatency
    }
  };
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas');

  const userContext = await setupBenchmarkUser();
  console.log(`Benchmark User Created: ${userContext.user._id}`);

  const levels = [1, 10, 25, 50, 100];
  const results = [];

  console.log('\n================================================================');
  console.log('TIER 1 RE-BENCHMARK: CONCURRENCY THROUGHPUT & WRITE CONTENTION');
  console.log('================================================================');

  for (const c of levels) {
    console.log(`\nStarting Level Concurrency = ${c}...`);
    const res = await runLevel(userContext, c);
    results.push(res);
    console.log(JSON.stringify(res, null, 2));
  }

  // Cleanup
  await User.deleteOne({ _id: userContext.user._id });
  await Account.deleteOne({ _id: userContext.account._id });
  await Category.deleteOne({ _id: userContext.category._id });
  await Budget.deleteOne({ _id: userContext.budget._id });
  await Transaction.deleteMany({ user: userContext.user._id });

  console.log('\n================================================================');
  console.log('TIER 1 RE-BENCHMARK COMPLETE');
  console.log('================================================================');
  console.log(JSON.stringify(results, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error('Benchmark runner failed:', err);
  process.exit(1);
});
