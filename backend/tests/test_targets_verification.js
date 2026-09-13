require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const assert = require('assert');

// Models
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Account = require('../models/Account');
const UserAnalytics = require('../models/UserAnalytics');
const UserAnalyticsMonthly = require('../models/UserAnalyticsMonthly');
const UserAnalyticsWeekly = require('../models/UserAnalyticsWeekly');

// Services & Utils
const transactionService = require('../services/transactionService');
const { 
  getUserAnalytics, 
  rebuildUserAnalytics, 
  hasAdHocFilter 
} = require('../services/analyticsEngine');
const { 
  getAnalytics, 
  getCanonicalAnalytics 
} = require('../services/analyticsService');
const { 
  getWeeklyCycle, 
  isMatchingWeeklyCycle 
} = require('../utils/cycleUtils');

async function runTargetTests() {
  console.log('====================================================');
  console.log('FINOVA TARGET VERIFICATION & REGRESSION TEST SUITE');
  console.log('====================================================\n');

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in environment.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('[SETUP] Connected to MongoDB.\n');

  let passedTests = 0;
  let totalTests = 0;
  const createdUserIds = [];

  const test = async (name, fn) => {
    totalTests++;
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  [FAIL] ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  };

  // Helper setup
  const createUserWithAccountAndCat = async (trackingStartDayWeekly = 6) => {
    const user = await User.create({
      name: 'Verification User',
      email: `target_verify_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@finova.test`,
      password: 'Password123!',
      preferences: { trackingPeriod: 'weekly', trackingStartDayWeekly }
    });
    createdUserIds.push(user._id);

    const account = await Account.create({
      user: user._id,
      name: 'Primary Checking',
      type: 'bank',
      balance_adjustment: 10000,
      color: '#3b82f6',
      icon: 'Wallet'
    });

    const categoryExpense = await Category.create({
      user: user._id,
      name: 'Groceries',
      type: 'expense',
      icon: 'ShoppingBag',
      color: '#ef4444'
    });

    const categoryIncome = await Category.create({
      user: user._id,
      name: 'Salary',
      type: 'income',
      icon: 'Briefcase',
      color: '#22c55e'
    });

    return { user, account, categoryExpense, categoryIncome };
  };

  try {
    console.log('--- TARGET 1: WEEKLY CYCLE TIMEZONE & BOUNDARIES ---');

    await test('1.1: getWeeklyCycle computes exact UTC millisecond boundaries (Saturday start = 6)', async () => {
      // 2026-09-09 is a Wednesday (UTC day 3)
      const midWeek = new Date('2026-09-09T14:30:00.000Z');
      const cycle = getWeeklyCycle(midWeek, 6, 'UTC');

      // Saturday was 2026-09-05
      assert.strictEqual(cycle.weekKey, '2026-09-05', 'weekKey must be YYYY-MM-DD of the start Saturday');
      assert.strictEqual(cycle.startDate.toISOString(), '2026-09-05T00:00:00.000Z', 'startDate must be Saturday 00:00:00.000Z');
      assert.strictEqual(cycle.endDate.toISOString(), '2026-09-11T23:59:59.999Z', 'endDate must be Friday 23:59:59.999Z');
      assert.strictEqual(cycle.cycleStartDay, 6);
      assert.strictEqual(cycle.startDate.getUTCDay(), 6);
      assert.strictEqual(cycle.endDate.getUTCDay(), 5);
    });

    await test('1.2: getWeeklyCycle respects user preference for different start days (Sunday=0, Wednesday=3)', async () => {
      const midWeek = new Date('2026-09-09T14:30:00.000Z'); // Wednesday
      
      // Sunday start
      const sunCycle = getWeeklyCycle(midWeek, 0, 'UTC');
      assert.strictEqual(sunCycle.weekKey, '2026-09-06');
      assert.strictEqual(sunCycle.startDate.toISOString(), '2026-09-06T00:00:00.000Z');
      assert.strictEqual(sunCycle.endDate.toISOString(), '2026-09-12T23:59:59.999Z');
      assert.strictEqual(sunCycle.startDate.getUTCDay(), 0);

      // Wednesday start (exact match day)
      const wedCycle = getWeeklyCycle(midWeek, 3, 'UTC');
      assert.strictEqual(wedCycle.weekKey, '2026-09-09');
      assert.strictEqual(wedCycle.startDate.toISOString(), '2026-09-09T00:00:00.000Z');
      assert.strictEqual(wedCycle.endDate.toISOString(), '2026-09-15T23:59:59.999Z');
      assert.strictEqual(wedCycle.startDate.getUTCDay(), 3);
    });

    await test('1.3: isMatchingWeeklyCycle validates exact boundaries and tolerates client date strings', async () => {
      const cycle = getWeeklyCycle('2026-09-09T12:00:00Z', 6);
      assert.strictEqual(isMatchingWeeklyCycle(cycle.startDate.toISOString(), cycle.endDate.toISOString(), 6), true);

      // Non-matching range (8 days)
      const nonMatchEnd = new Date(cycle.endDate.getTime() + 86400000).toISOString();
      assert.strictEqual(isMatchingWeeklyCycle(cycle.startDate.toISOString(), nonMatchEnd, 6), false);

      // Wrong start day
      const sunCycle = getWeeklyCycle('2026-09-09T12:00:00Z', 0);
      assert.strictEqual(isMatchingWeeklyCycle(sunCycle.startDate.toISOString(), sunCycle.endDate.toISOString(), 6), false);
    });

    console.log('\n--- TARGET 2: INITIAL MATERIALIZATION FOR EXISTING USERS >500 TX ---');

    await test('2.1: Existing user with >500 transactions and NO analytics returns initializationPending: true without blocking scan', async () => {
      const { user, account, categoryExpense } = await createUserWithAccountAndCat(6);

      // Seed 550 canonical transactions directly
      const txBatch = [];
      const baseDate = new Date('2026-05-01T10:00:00.000Z');
      for (let i = 0; i < 550; i++) {
        const d = new Date(baseDate.getTime() + i * 3600000); // 1 hr increments
        txBatch.push({
          user: user._id,
          account: account._id,
          category: categoryExpense._id,
          type: 'expense',
          amount: 10,
          date: d,
          title: `Test Tx ${i}`,
          status: 'completed',
          source: 'manual'
        });
      }
      await Transaction.insertMany(txBatch);

      const txCount = await Transaction.countDocuments({ user: user._id });
      assert.strictEqual(txCount, 550, 'Must have 550 transactions');

      // Confirm no materialized state exists
      const preDoc = await UserAnalytics.findOne({ user: user._id });
      assert.strictEqual(preDoc, null, 'No materialized lifetime document before first access');

      // First relevant Analytics access
      const firstAccessResult = await getUserAnalytics(user._id.toString(), {});

      // Must return initializationPending: true
      assert.strictEqual(firstAccessResult.initializationPending, true, 'API must flag initializationPending: true');
      assert.strictEqual(firstAccessResult.summary.expense, 0, 'Must return zeroed structure rather than partial 500-truncated numbers');
      assert.strictEqual(firstAccessResult.transactions.length, 0);

      // Wait for background rebuild to finish
      let attempts = 0;
      let reconciled = false;
      while (attempts < 60 && !reconciled) {
        await new Promise(r => setTimeout(r, 100));
        const doc = await UserAnalytics.findOne({ user: user._id });
        if (doc && doc.lastReconciledAt && !doc.isRebuilding) {
          reconciled = true;
        }
        attempts++;
      }
      assert.strictEqual(reconciled, true, 'Background rebuild must successfully finish and stamp lastReconciledAt');

      // Subsequent Analytics access now returns 100% complete data
      const completeResult = await getUserAnalytics(user._id.toString(), {});
      assert.strictEqual(completeResult.initializationPending, undefined, 'initializationPending must no longer be present');
      assert.strictEqual(completeResult.summary.expense, 5500, 'All 550 transactions must be reflected: 550 * 10 = 5500');

      // Check weekly materialization initialized
      const weeklyCount = await UserAnalyticsWeekly.countDocuments({ user: user._id });
      assert.ok(weeklyCount > 0, 'UserAnalyticsWeekly must be materialized for the user');

      // Check monthly materialization initialized
      const monthlyCount = await UserAnalyticsMonthly.countDocuments({ user: user._id });
      assert.ok(monthlyCount > 0, 'UserAnalyticsMonthly must be materialized for the user');
    });

    await test('2.2: Concurrent requests during background rebuild return initializationPending: true and do not trigger duplicate rebuilds', async () => {
      const { user, account, categoryExpense } = await createUserWithAccountAndCat(6);

      const txBatch = [];
      for (let i = 0; i < 520; i++) {
        txBatch.push({
          user: user._id,
          account: account._id,
          category: categoryExpense._id,
          type: 'expense',
          amount: 2,
          date: new Date('2026-06-01T12:00:00.000Z'),
          title: `Concurrent Tx ${i}`,
          status: 'completed',
          source: 'manual'
        });
      }
      await Transaction.insertMany(txBatch);

      // Dispatch 5 concurrent requests simultaneously
      const results = await Promise.all([
        getUserAnalytics(user._id.toString(), {}),
        getUserAnalytics(user._id.toString(), {}),
        getUserAnalytics(user._id.toString(), {}),
        getUserAnalytics(user._id.toString(), {}),
        getUserAnalytics(user._id.toString(), {})
      ]);

      for (const res of results) {
        assert.strictEqual(res.initializationPending, true, 'Every concurrent request before completion must return initializationPending: true');
      }

      // Wait for background rebuild to complete
      let attempts = 0;
      while (attempts < 60) {
        await new Promise(r => setTimeout(r, 100));
        const doc = await UserAnalytics.findOne({ user: user._id });
        if (doc && doc.lastReconciledAt && !doc.isRebuilding) break;
        attempts++;
      }

      const postDoc = await UserAnalytics.findOne({ user: user._id });
      assert.strictEqual(postDoc.summary.expense, 1040, 'Total expense must be 520 * 2 = 1040');
    });

    let user31 = null;
    await test('3.1: "This Year" correctly queries canonical aggregation, excludes previous years, and includes all current-year transactions (>500 records)', async () => {
      const { user, account, categoryExpense, categoryIncome } = await createUserWithAccountAndCat(6);
      user31 = user;

      // 1. Transactions from PREVIOUS YEAR (2025)
      const prevYearTxs = [
        {
          user: user._id,
          account: account._id,
          category: categoryExpense._id,
          type: 'expense',
          amount: 9999,
          date: new Date('2025-12-31T23:59:59.000Z'), // 1 sec before 2026
          title: 'Last Year Expense',
          status: 'completed',
          source: 'manual'
        },
        {
          user: user._id,
          account: account._id,
          category: categoryIncome._id,
          type: 'income',
          amount: 50000,
          date: new Date('2025-06-15T12:00:00.000Z'),
          title: 'Last Year Salary',
          status: 'completed',
          source: 'manual'
        }
      ];
      await Transaction.insertMany(prevYearTxs);

      // 2. Transactions in CURRENT YEAR (2026) - exceeding 500 records
      const currentYearTxs = [];
      
      // Boundary transaction: exactly Jan 1 00:00:00.000Z
      currentYearTxs.push({
        user: user._id,
        account: account._id,
        category: categoryIncome._id,
        type: 'income',
        amount: 1000,
        date: new Date('2026-01-01T00:00:00.000Z'),
        title: 'New Year Day Income',
        status: 'completed',
        source: 'manual'
      });

      // 520 expense transactions distributed throughout 2026
      for (let i = 0; i < 520; i++) {
        currentYearTxs.push({
          user: user._id,
          account: account._id,
          category: categoryExpense._id,
          type: 'expense',
          amount: 5,
          date: new Date('2026-03-01T12:00:00.000Z'),
          title: `2026 Expense ${i}`,
          status: 'completed',
          source: 'manual'
        });
      }

      // 1 settlement transaction in 2026
      currentYearTxs.push({
        user: user._id,
        account: account._id,
        type: 'settlement',
        amount: 50,
        date: new Date('2026-08-10T12:00:00.000Z'),
        title: '2026 Settlement',
        status: 'completed',
        source: 'manual'
      });

      await Transaction.insertMany(currentYearTxs);

      // Initial rebuild to establish clean materialization
      await rebuildUserAnalytics(user._id.toString());

      // Total transactions in DB: 2 (2025) + 522 (2026) = 524
      const totalCount = await Transaction.countDocuments({ user: user._id });
      assert.strictEqual(totalCount, 524);

      // Query "This Year" (2026-01-01T00:00:00.000Z to 2026-12-31T23:59:59.999Z)
      const thisYearQuery = {
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-12-31T23:59:59.999Z',
        filterType: 'year'
      };

      // Verify hasAdHocFilter routes multi-month "This Year" to canonical pipeline
      assert.strictEqual(hasAdHocFilter(thisYearQuery, 6), true, 'hasAdHocFilter must return true for multi-month year queries');

      const yearResult = await getUserAnalytics(user._id.toString(), thisYearQuery);

      // Expected 2026 totals:
      // Income: 1000
      // Expense: 520 * 5 = 2600
      // Settlements: 50
      // Balance: 1000 - 2600 + 50 = -1550
      assert.strictEqual(yearResult.summary.income, 1000, 'This Year income must include 2026 income and exclude 2025 income');
      assert.strictEqual(yearResult.summary.expense, 2600, 'This Year expense must include all 520 transactions (no 500 truncation) and exclude 2025 expense');
      assert.strictEqual(yearResult.summary.settlements, 50);
      assert.strictEqual(yearResult.summary.balance, -1550);

      // Independent MongoDB direct verification
      const directCanonical = await getCanonicalAnalytics(user._id.toString(), thisYearQuery);
      assert.strictEqual(yearResult.summary.income, directCanonical.summary.income);
      assert.strictEqual(yearResult.summary.expense, directCanonical.summary.expense);
      assert.strictEqual(yearResult.summary.settlements, directCanonical.summary.settlements);
      assert.strictEqual(yearResult.summary.balance, directCanonical.summary.balance);
    });

    await test('3.2: "All Time" query includes all transactions across all years (>500 total) without truncation', async () => {
      // Query with empty from/to (All Time) for the user with 524 transactions from test 3.1
      const allTimeQuery = { from: '', to: '' };
      assert.strictEqual(hasAdHocFilter(allTimeQuery, 6), false, 'All Time without filters must use persisted lifetime store');

      const allTimeResult = await getUserAnalytics(user31._id.toString(), allTimeQuery);

      // Expected All-Time totals:
      // Income: 50000 (2025) + 1000 (2026) = 51000
      // Expense: 9999 (2025) + 2600 (2026) = 12599
      // Settlements: 50
      // Balance: 51000 - 12599 + 50 = 38451
      assert.strictEqual(allTimeResult.summary.income, 51000, 'All Time must include 2025 and 2026 income');
      assert.strictEqual(allTimeResult.summary.expense, 12599, 'All Time must include all expenses across all years without 500 truncation');
      assert.strictEqual(allTimeResult.summary.settlements, 50);
      assert.strictEqual(allTimeResult.summary.balance, 38451);

      // Must match independent direct canonical aggregation
      const directAllCanonical = await getCanonicalAnalytics(user31._id.toString(), {});
      assert.strictEqual(allTimeResult.summary.income, directAllCanonical.summary.income);
      assert.strictEqual(allTimeResult.summary.expense, directAllCanonical.summary.expense);
      assert.strictEqual(allTimeResult.summary.settlements, directAllCanonical.summary.settlements);
      assert.strictEqual(allTimeResult.summary.balance, directAllCanonical.summary.balance);
    });

    await test('3.3: Preserves existing Today, This Month, and Weekly Cycle queries', async () => {
      const { user, account, categoryExpense } = await createUserWithAccountAndCat(6);

      const now = new Date('2026-09-09T14:30:00.000Z');
      await Transaction.create({
        user: user._id,
        account: account._id,
        category: categoryExpense._id,
        type: 'expense',
        amount: 150,
        date: now,
        title: 'Current Tx',
        status: 'completed',
        source: 'manual'
      });

      await rebuildUserAnalytics(user._id.toString());

      // Single tracking week query
      const weekBounds = getWeeklyCycle(now, 6);
      const weeklyResult = await getUserAnalytics(user._id.toString(), {
        from: weekBounds.startDate.toISOString(),
        to: weekBounds.endDate.toISOString()
      });
      assert.strictEqual(weeklyResult.summary.expense, 150, 'Single tracking week must be served correctly');

      // Single month query
      const monthResult = await getUserAnalytics(user._id.toString(), {
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-30T23:59:59.999Z'
      });
      assert.strictEqual(monthResult.summary.expense, 150, 'Single month must be served correctly');
    });

  } finally {
    console.log('\n--- TEARDOWN: Cleaning up synthetic test users ---');
    for (const uid of createdUserIds) {
      await Transaction.deleteMany({ user: uid });
      await UserAnalytics.deleteMany({ user: uid });
      await UserAnalyticsMonthly.deleteMany({ user: uid });
      await UserAnalyticsWeekly.deleteMany({ user: uid });
      await Category.deleteMany({ user: uid });
      await Account.deleteMany({ user: uid });
      await User.deleteOne({ _id: uid });
    }
    await mongoose.disconnect();
    console.log('MongoDB disconnected cleanly.\n');
  }

  console.log('====================================================');
  console.log(`SUMMARY: ${passedTests}/${totalTests} tests passed.`);
  console.log('====================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTargetTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
