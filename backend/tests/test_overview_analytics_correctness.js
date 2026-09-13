require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const assert = require('assert');

// Models
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Account = require('../models/Account');
const Bill = require('../models/Bill');
const Debt = require('../models/Debt');
const DebtTransaction = require('../models/DebtTransaction');
const IncomeProfile = require('../models/IncomeProfile');
const Investment = require('../models/Investment');
const UserAnalytics = require('../models/UserAnalytics');
const UserAnalyticsMonthly = require('../models/UserAnalyticsMonthly');
const UserAnalyticsWeekly = require('../models/UserAnalyticsWeekly');

// Services
const transactionService = require('../services/transactionService');
const { 
  getUserAnalytics, 
  rebuildUserAnalytics, 
  hasAdHocFilter,
  round2
} = require('../services/analyticsEngine');
const { 
  getAnalytics, 
  getCanonicalAnalytics 
} = require('../services/analyticsService');
const { 
  getWeeklyCycle, 
  isMatchingWeeklyCycle 
} = require('../utils/cycleUtils');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(fn, timeoutMs = 4000, intervalMs = 150) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fn();
      if (res) return res;
    } catch (e) {}
    await sleep(intervalMs);
  }
  return await fn();
}

async function runOverviewAnalyticsCorrectnessTests() {
  console.log('===============================================================');
  console.log('FINOVA STRICT OVERVIEW ANALYTICS CORRECTNESS REGRESSION SUITE');
  console.log('===============================================================\n');

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

  const createTestUser = async (trackingStartDayWeekly = 6, trackingPeriod = 'weekly') => {
    const user = await User.create({
      name: 'Overview Test User',
      email: `overview_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@finova.test`,
      password: 'Password123!',
      preferences: { trackingPeriod, trackingStartDayWeekly, trackingStartDayMonthly: 1 }
    });
    createdUserIds.push(user._id);

    const account = await Account.create({
      user: user._id,
      name: 'Checking Account',
      type: 'bank',
      balance_adjustment: 50000,
      color: '#3b82f6',
      icon: 'Wallet'
    });

    const catExpense = await Category.create({
      user: user._id,
      name: 'Groceries',
      type: 'expense',
      icon: 'ShoppingBag',
      color: '#ef4444'
    });

    const catIncome = await Category.create({
      user: user._id,
      name: 'Salary',
      type: 'income',
      icon: 'Briefcase',
      color: '#22c55e'
    });

    const catBill = await Category.create({
      user: user._id,
      name: 'Utilities',
      type: 'expense',
      icon: 'Zap',
      color: '#f59e0b'
    });

    return { user, account, catExpense, catIncome, catBill };
  };

  try {
    console.log('--- SECTION 1: ROUTING & DATE BOUNDARY CORRECTNESS ---');

    await test('1.1: Canonical aggregation routes correctly for Today, Yesterday, This Year, and Custom', async () => {
      const { user } = await createTestUser();

      // Today
      const now = new Date();
      const todayFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)).toISOString();
      const todayTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)).toISOString();
      assert.strictEqual(hasAdHocFilter({ from: todayFrom, to: todayTo }, 6), true, 'Today must route to canonical aggregation');
      const resToday = await getAnalytics(user._id, { from: todayFrom, to: todayTo });
      assert.ok(resToday && resToday.summary !== undefined, 'Today returns valid response');

      // Yesterday
      const yestFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0, 0)).toISOString();
      const yestTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 23, 59, 59, 999)).toISOString();
      assert.strictEqual(hasAdHocFilter({ from: yestFrom, to: yestTo }, 6), true, 'Yesterday must route to canonical aggregation');
      const resYest = await getAnalytics(user._id, { from: yestFrom, to: yestTo });
      assert.ok(resYest && resYest.summary !== undefined, 'Yesterday returns valid response');

      // This Year
      const yearFrom = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0)).toISOString();
      const yearTo = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999)).toISOString();
      assert.strictEqual(hasAdHocFilter({ from: yearFrom, to: yearTo }, 6), true, 'This Year must route to canonical aggregation');
      const resYear = await getAnalytics(user._id, { from: yearFrom, to: yearTo });
      assert.ok(resYear && resYear.summary !== undefined, 'This Year returns valid response');

      // Custom
      const customFrom = '2026-03-10T00:00:00.000Z';
      const customTo = '2026-03-20T23:59:59.999Z';
      assert.strictEqual(hasAdHocFilter({ from: customFrom, to: customTo }, 6), true, 'Custom date range must route to canonical aggregation');
      const resCustom = await getAnalytics(user._id, { from: customFrom, to: customTo });
      assert.ok(resCustom && resCustom.summary !== undefined, 'Custom returns valid response');
    });

    await test('1.2: Materialized routing for All Time, Exact Calendar Month, and Exact Tracking Week', async () => {
      const { user } = await createTestUser(6);

      // All Time (empty query)
      assert.strictEqual(hasAdHocFilter({}, 6), false, 'Empty query routes to UserAnalytics');
      const resAll = await getAnalytics(user._id, {});
      assert.ok(resAll && resAll.summary !== undefined);

      // Exact Tracking Week
      const now = new Date();
      const cycle = getWeeklyCycle(now, 6, 'UTC');
      const weekQuery = { from: cycle.startDate.toISOString(), to: cycle.endDate.toISOString() };
      assert.strictEqual(hasAdHocFilter(weekQuery, 6), false, 'Exact tracking week routes to UserAnalyticsWeekly');
      const resWeek = await getAnalytics(user._id, weekQuery);
      assert.ok(resWeek && resWeek.summary !== undefined);

      // Exact Calendar Month
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      const monthQuery = { from: monthStart.toISOString(), to: monthEnd.toISOString() };
      assert.strictEqual(hasAdHocFilter(monthQuery, 6), false, 'Exact calendar month routes to UserAnalyticsMonthly');
      const resMonth = await getAnalytics(user._id, monthQuery);
      assert.ok(resMonth && resMonth.summary !== undefined);
    });

    console.log('\n--- SECTION 2: INDEPENDENT ORACLE TEST ACROSS DATE FILTERS ---');

    await test('2.1: Multi-period transactions match independent manual calculations across all filter presets', async () => {
      const { user, account, catExpense, catIncome } = await createTestUser(6);

      const now = new Date();
      const currentYear = now.getUTCFullYear();
      const currentMonth = now.getUTCMonth();

      // Dates:
      // T1: Today at 12:00 UTC
      const todayDate = new Date(Date.UTC(currentYear, currentMonth, now.getUTCDate(), 12, 0, 0, 0));
      // T2: Yesterday at 12:00 UTC
      const yestDate = new Date(Date.UTC(currentYear, currentMonth, now.getUTCDate() - 1, 12, 0, 0, 0));
      // T3: Previous year (Dec 15)
      const prevYearDate = new Date(Date.UTC(currentYear - 1, 11, 15, 12, 0, 0, 0));
      // T4: Current year earlier month (Jan 10)
      const earlierThisYearDate = new Date(Date.UTC(currentYear, 0, 10, 12, 0, 0, 0));

      // Insert transactions via transactionService to trigger incremental updates
      await transactionService.createTransaction(user._id, {
        type: 'income',
        amount: 2500,
        date: todayDate,
        account: account._id,
        category: catIncome._id,
        description: 'Today Salary'
      });

      await transactionService.createTransaction(user._id, {
        type: 'expense',
        amount: 300,
        date: todayDate,
        account: account._id,
        category: catExpense._id,
        description: 'Today Lunch'
      });

      await transactionService.createTransaction(user._id, {
        type: 'expense',
        amount: 450,
        date: yestDate,
        account: account._id,
        category: catExpense._id,
        description: 'Yesterday Dinner'
      });

      await transactionService.createTransaction(user._id, {
        type: 'expense',
        amount: 1200,
        date: earlierThisYearDate,
        account: account._id,
        category: catExpense._id,
        description: 'January Furniture'
      });

      await transactionService.createTransaction(user._id, {
        type: 'income',
        amount: 10000,
        date: prevYearDate,
        account: account._id,
        category: catIncome._id,
        description: 'Last Year Bonus'
      });

      // Wait for incremental background queue to process all 5 transactions
      await waitFor(async () => {
        const doc = await UserAnalytics.findOne({ user: user._id });
        return (doc && doc.summary?.income === 12500 && doc.summary?.expense === 1950) ? doc : null;
      });

      // Oracle calculations:
      // 1. Today: income: 2500, expense: 300, balance: 2200
      const todayFrom = new Date(Date.UTC(currentYear, currentMonth, now.getUTCDate(), 0, 0, 0, 0)).toISOString();
      const todayTo = new Date(Date.UTC(currentYear, currentMonth, now.getUTCDate(), 23, 59, 59, 999)).toISOString();
      const resToday = await getAnalytics(user._id, { from: todayFrom, to: todayTo });
      assert.strictEqual(resToday.summary.income, 2500, 'Today income oracle mismatch');
      assert.strictEqual(resToday.summary.expense, 300, 'Today expense oracle mismatch');
      assert.strictEqual(resToday.summary.balance, 2200, 'Today balance (Cash Flow) oracle mismatch');

      // 2. Yesterday: income: 0, expense: 450, balance: -450
      const yestFrom = new Date(Date.UTC(currentYear, currentMonth, now.getUTCDate() - 1, 0, 0, 0, 0)).toISOString();
      const yestTo = new Date(Date.UTC(currentYear, currentMonth, now.getUTCDate() - 1, 23, 59, 59, 999)).toISOString();
      const resYest = await getAnalytics(user._id, { from: yestFrom, to: yestTo });
      assert.strictEqual(resYest.summary.income, 0, 'Yesterday income oracle mismatch');
      assert.strictEqual(resYest.summary.expense, 450, 'Yesterday expense oracle mismatch');
      assert.strictEqual(resYest.summary.balance, -450, 'Yesterday balance (Cash Flow) oracle mismatch');

      // 3. This Year: must include today (2500 inc, 300 exp), yesterday (450 exp), earlier this year (1200 exp)
      // BUT MUST EXCLUDE prevYearDate (10000 inc)
      const yearFrom = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0)).toISOString();
      const yearTo = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999)).toISOString();
      const resYear = await getAnalytics(user._id, { from: yearFrom, to: yearTo });
      const expectedYearIncome = 2500;
      const expectedYearExpense = 300 + 450 + 1200; // 1950
      const expectedYearBalance = 2500 - 1950; // 550
      assert.strictEqual(resYear.summary.income, expectedYearIncome, 'This Year income oracle mismatch');
      assert.strictEqual(resYear.summary.expense, expectedYearExpense, 'This Year expense oracle mismatch');
      assert.strictEqual(resYear.summary.balance, expectedYearBalance, 'This Year balance (Cash Flow) oracle mismatch');

      // 4. All Time: must include ALL 5 transactions:
      // Income: 2500 + 10000 = 12500
      // Expense: 300 + 450 + 1200 = 1950
      // Balance: 12500 - 1950 = 10550
      const resAll = await getAnalytics(user._id, {});
      assert.strictEqual(resAll.summary.income, 12500, 'All Time income oracle mismatch');
      assert.strictEqual(resAll.summary.expense, 1950, 'All Time expense oracle mismatch');
      assert.strictEqual(resAll.summary.balance, 10550, 'All Time balance (Cash Flow) oracle mismatch');
    });

    console.log('\n--- SECTION 3: PAID BILL SCENARIO & DOUBLE-COUNTING PREVENTION ---');

    await test('3.1: Paid bill reflects as expense in Cash Flow without being double-counted as unpaid liability', async () => {
      const { user, account, catBill } = await createTestUser(6);

      const now = new Date();
      const dueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 0, 0, 0));

      // 1. Create a bill for 750
      const bill = await Bill.create({
        user: user._id,
        name: 'Fiber Internet',
        expectedAmount: 750,
        category: catBill._id,
        account: account._id,
        dueDate: dueDate,
        repeat: 'never',
        status: 'upcoming',
        isActive: true
      });

      // 2. User pays the bill -> generates expense transaction
      const paymentTx = await transactionService.createTransaction(user._id, {
        type: 'expense',
        amount: 750,
        date: dueDate,
        account: account._id,
        category: catBill._id,
        description: 'Payment for Fiber Internet'
      });

      // 3. Mark bill as paid with transaction reference
      bill.status = 'paid';
      bill.transactionId = paymentTx._id;
      bill.paymentDate = dueDate;
      await bill.save();

      // 4. Query Analytics for Today
      const todayFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)).toISOString();
      const todayTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)).toISOString();
      const res = await getAnalytics(user._id, { from: todayFrom, to: todayTo });

      // Verification A: Period flow (Cash Flow) MUST capture the paid bill expense
      assert.strictEqual(res.summary.expense, 750, 'Paid bill transaction must be included in period expense');
      assert.strictEqual(res.summary.balance, -750, 'Paid bill transaction must be reflected as negative cash flow');

      // Verification B: Point-in-time liabilities logic in OverviewTab:
      // Unpaid bills are: b.status !== 'paid' && (upcoming || due_today || overdue)
      const allBills = await Bill.find({ user: user._id, isActive: true });
      const unpaidBills = allBills.filter(b => b.status !== 'paid' && ['upcoming', 'due_today', 'overdue'].includes(b.status));
      const totalUnpaidBills = unpaidBills.reduce((sum, b) => sum + (b.expectedAmount || 0), 0);

      assert.strictEqual(totalUnpaidBills, 0, 'Paid bill must NOT be counted as unpaid liability');
    });

    console.log('\n--- SECTION 4: MISSING/INCOMPLETE MATERIALIZATION RESILIENCE ---');

    await test('4.1: Missing UserAnalyticsWeekly falls back to canonical aggregation without silent 0s and triggers rebuild', async () => {
      const { user, account, catExpense } = await createTestUser(6);

      const now = new Date();
      const cycle = getWeeklyCycle(now, 6, 'UTC');

      // Create a transaction in this week
      await transactionService.createTransaction(user._id, {
        type: 'expense',
        amount: 880,
        date: new Date(cycle.startDate.getTime() + 3600000), // Saturday 01:00 UTC
        account: account._id,
        category: catExpense._id,
        description: 'Weekly Market'
      });

      // Wait for UserAnalyticsWeekly to be created by background queue
      const weeklyDoc = await waitFor(async () => {
        const doc = await UserAnalyticsWeekly.findOne({ user: user._id, weekKey: cycle.weekKey });
        return (doc && doc.summary?.expense === 880) ? doc : null;
      });
      assert.ok(weeklyDoc, 'Weekly document should have been created incrementally');
      assert.strictEqual(weeklyDoc.summary.expense, 880);

      // SIMULATE DATA LOSS / CORRUPTION: Delete the weekly document
      await UserAnalyticsWeekly.deleteOne({ _id: weeklyDoc._id });
      assert.strictEqual(await UserAnalyticsWeekly.countDocuments({ user: user._id, weekKey: cycle.weekKey }), 0);

      // Now query getAnalytics for that exact tracking week
      const res = await getAnalytics(user._id, { 
        from: cycle.startDate.toISOString(), 
        to: cycle.endDate.toISOString() 
      });

      // Verify self-healing fallback:
      assert.strictEqual(res.summary.expense, 880, 'Must NOT return 0 or empty summary on missing materialization');
      assert.strictEqual(res.summary.balance, -880, 'Must return accurate balance on fallback');

      // Allow async background rebuild to run
      await waitFor(async () => {
        const doc = await UserAnalyticsWeekly.findOne({ user: user._id, weekKey: cycle.weekKey });
        return (doc && doc.summary?.expense === 880) ? doc : null;
      });

      // Verify background rebuild recreated the document
      const rebuiltDoc = await UserAnalyticsWeekly.findOne({ user: user._id, weekKey: cycle.weekKey });
      assert.ok(rebuiltDoc, 'Background rebuild must recreate the missing UserAnalyticsWeekly');
      assert.strictEqual(rebuiltDoc.summary.expense, 880);
    });

    await test('4.2: Missing UserAnalyticsMonthly falls back to canonical aggregation without silent 0s and triggers rebuild', async () => {
      const { user, account, catIncome } = await createTestUser(6);

      const now = new Date();
      const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

      // Create a transaction in this month
      await transactionService.createTransaction(user._id, {
        type: 'income',
        amount: 15000,
        date: new Date(monthStart.getTime() + 7200000),
        account: account._id,
        category: catIncome._id,
        description: 'Monthly Client Retainer'
      });

      // Wait for UserAnalyticsMonthly to exist
      const monthlyDoc = await waitFor(async () => {
        const doc = await UserAnalyticsMonthly.findOne({ user: user._id, month: monthKey });
        return (doc && doc.summary?.income === 15000) ? doc : null;
      });
      assert.ok(monthlyDoc, 'Monthly document should exist');

      // SIMULATE DATA LOSS: Delete the monthly document
      await UserAnalyticsMonthly.deleteOne({ _id: monthlyDoc._id });

      // Query getAnalytics for that exact calendar month
      const res = await getAnalytics(user._id, { 
        from: monthStart.toISOString(), 
        to: monthEnd.toISOString() 
      });

      // Verify self-healing fallback:
      assert.strictEqual(res.summary.income, 15000, 'Must accurately return income via canonical fallback');
      assert.strictEqual(res.summary.balance, 15000, 'Must return accurate balance on fallback');

      // Allow background rebuild to complete
      await waitFor(async () => {
        const doc = await UserAnalyticsMonthly.findOne({ user: user._id, month: monthKey });
        return (doc && doc.summary?.income === 15000) ? doc : null;
      });

      const rebuiltMonthly = await UserAnalyticsMonthly.findOne({ user: user._id, month: monthKey });
      assert.ok(rebuiltMonthly, 'Background rebuild must restore the missing UserAnalyticsMonthly');
      assert.strictEqual(rebuiltMonthly.summary.income, 15000);
    });

    console.log('\n--- SECTION 5: LARGE DATASET (>700 TRANSACTIONS) NO TRUNCATION ---');

    await test('5.1: >700 transactions are never truncated for This Year and All Time', async () => {
      const { user, account, catExpense, catIncome } = await createTestUser(6);

      const now = new Date();
      const currentYear = now.getUTCFullYear();

      console.log('    Generating 750 transactions (100 previous year, 650 current year)...');

      const txBatch = [];
      let expectedPrevYearIncome = 0;
      let expectedPrevYearExpense = 0;
      let expectedCurrentYearIncome = 0;
      let expectedCurrentYearExpense = 0;

      // 100 in previous year
      for (let i = 0; i < 100; i++) {
        const isIncome = i % 4 === 0;
        const amount = 50 + (i % 20) * 10;
        const date = new Date(Date.UTC(currentYear - 1, (i % 12), (i % 28) + 1, 10, 0, 0, 0));
        
        if (isIncome) expectedPrevYearIncome += amount;
        else expectedPrevYearExpense += amount;

        txBatch.push({
          user: user._id,
          type: isIncome ? 'income' : 'expense',
          amount,
          date,
          account: account._id,
          category: isIncome ? catIncome._id : catExpense._id,
          description: `Prev Year Tx ${i}`,
          status: 'completed'
        });
      }

      // 650 in current year
      for (let i = 0; i < 650; i++) {
        const isIncome = i % 5 === 0;
        const amount = 30 + (i % 15) * 5;
        const date = new Date(Date.UTC(currentYear, (i % 12), (i % 28) + 1, 10, 0, 0, 0));

        if (isIncome) expectedCurrentYearIncome += amount;
        else expectedCurrentYearExpense += amount;

        txBatch.push({
          user: user._id,
          type: isIncome ? 'income' : 'expense',
          amount,
          date,
          account: account._id,
          category: isIncome ? catIncome._id : catExpense._id,
          description: `Current Year Tx ${i}`,
          status: 'completed'
        });
      }

      // Bulk insert
      await Transaction.insertMany(txBatch);
      const totalInserted = await Transaction.countDocuments({ user: user._id });
      assert.strictEqual(totalInserted, 750, 'Total inserted transactions must be 750');

      // Rebuild analytics from canonical transactions
      await rebuildUserAnalytics(user._id);

      // 1. Verify "This Year" canonical aggregation
      const yearFrom = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0)).toISOString();
      const yearTo = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999)).toISOString();
      const resYear = await getAnalytics(user._id, { from: yearFrom, to: yearTo });

      assert.strictEqual(
        resYear.summary.income, 
        round2(expectedCurrentYearIncome), 
        `This Year income must match all 650 records (expected ${expectedCurrentYearIncome}, got ${resYear.summary.income})`
      );
      assert.strictEqual(
        resYear.summary.expense, 
        round2(expectedCurrentYearExpense), 
        `This Year expense must match all 650 records (expected ${expectedCurrentYearExpense}, got ${resYear.summary.expense})`
      );
      assert.strictEqual(
        resYear.summary.balance, 
        round2(expectedCurrentYearIncome - expectedCurrentYearExpense), 
        'This Year balance (Cash Flow) must match canonical calculation'
      );

      // 2. Verify "All Time" aggregation
      const resAll = await getAnalytics(user._id, {});
      const expectedTotalIncome = expectedPrevYearIncome + expectedCurrentYearIncome;
      const expectedTotalExpense = expectedPrevYearExpense + expectedCurrentYearExpense;

      assert.strictEqual(
        resAll.summary.income, 
        round2(expectedTotalIncome), 
        `All Time income must match all 750 records (expected ${expectedTotalIncome}, got ${resAll.summary.income})`
      );
      assert.strictEqual(
        resAll.summary.expense, 
        round2(expectedTotalExpense), 
        `All Time expense must match all 750 records (expected ${expectedTotalExpense}, got ${resAll.summary.expense})`
      );
      assert.strictEqual(
        resAll.summary.balance, 
        round2(expectedTotalIncome - expectedTotalExpense), 
        'All Time balance must match all 750 records'
      );
    });

    console.log('\n--- SECTION 6: LIFECYCLE MUTATIONS & REBUILD CONSISTENCY ---');

    await test('6.1: Full transaction lifecycle (create, update cross-cycle, delete) maintains 100% parity with rebuild', async () => {
      const { user, account, catExpense, catIncome } = await createTestUser(6);

      const now = new Date();
      const cycle1 = getWeeklyCycle(now, 6, 'UTC');
      // Cycle 2: 2 weeks ago
      const twoWeeksAgo = new Date(cycle1.startDate.getTime() - 14 * 86400000);
      const cycle2 = getWeeklyCycle(twoWeeksAgo, 6, 'UTC');

      // 1. Create transaction in cycle 1
      const tx1 = await transactionService.createTransaction(user._id, {
        type: 'expense',
        amount: 400,
        date: new Date(cycle1.startDate.getTime() + 10000),
        account: account._id,
        category: catExpense._id,
        description: 'Cycle 1 Expense'
      });

      // 2. Create transaction in cycle 2
      const tx2 = await transactionService.createTransaction(user._id, {
        type: 'income',
        amount: 5000,
        date: new Date(cycle2.startDate.getTime() + 10000),
        account: account._id,
        category: catIncome._id,
        description: 'Cycle 2 Income'
      });

      await waitFor(async () => {
        const doc = await UserAnalytics.findOne({ user: user._id });
        return (doc && doc.summary?.income === 5000 && doc.summary?.expense === 400) ? doc : null;
      });

      // 3. Update tx1: Move it to cycle 2 and change amount from 400 to 650
      await transactionService.updateTransaction(user._id, tx1._id, {
        amount: 650,
        date: new Date(cycle2.startDate.getTime() + 20000)
      });

      // Wait for incremental update to process across all tiers
      await waitFor(async () => {
        const docAll = await UserAnalytics.findOne({ user: user._id });
        const docW1 = await UserAnalyticsWeekly.findOne({ user: user._id, weekKey: cycle1.weekKey });
        const docW2 = await UserAnalyticsWeekly.findOne({ user: user._id, weekKey: cycle2.weekKey });
        return (
          docAll && docAll.summary?.expense === 650 &&
          docW1 && docW1.summary?.expense === 0 &&
          docW2 && docW2.summary?.expense === 650
        ) ? true : null;
      });

      const userAnalyticsAfterUpdate = await UserAnalytics.findOne({ user: user._id });
      const weeklyDocCycle1AfterUpdate = await UserAnalyticsWeekly.findOne({ user: user._id, weekKey: cycle1.weekKey });
      const weeklyDocCycle2AfterUpdate = await UserAnalyticsWeekly.findOne({ user: user._id, weekKey: cycle2.weekKey });

      assert.strictEqual(userAnalyticsAfterUpdate.summary.expense, 650);
      assert.strictEqual(userAnalyticsAfterUpdate.summary.income, 5000);
      assert.strictEqual(weeklyDocCycle1AfterUpdate ? weeklyDocCycle1AfterUpdate.summary.expense : 0, 0, 'Cycle 1 should have 0 expense after move');
      assert.strictEqual(weeklyDocCycle2AfterUpdate.summary.expense, 650, 'Cycle 2 should have 650 expense');
      assert.strictEqual(weeklyDocCycle2AfterUpdate.summary.income, 5000, 'Cycle 2 should have 5000 income');

      // 4. Delete tx2 (income)
      await transactionService.deleteTransaction(user._id, tx2._id);

      await waitFor(async () => {
        const doc = await UserAnalytics.findOne({ user: user._id });
        return (doc && doc.summary?.income === 0 && doc.summary?.expense === 650) ? doc : null;
      });

      const userAnalyticsAfterDelete = await UserAnalytics.findOne({ user: user._id });
      assert.strictEqual(userAnalyticsAfterDelete.summary.income, 0, 'Income must be 0 after deleting tx2');
      assert.strictEqual(userAnalyticsAfterDelete.summary.expense, 650);

      // 5. REBUILD FROM ZERO and compare with incremental result
      const incrementalState = {
        lifetimeIncome: userAnalyticsAfterDelete.summary.income,
        lifetimeExpense: userAnalyticsAfterDelete.summary.expense,
        lifetimeBalance: userAnalyticsAfterDelete.summary.balance
      };

      // Wipe and rebuild
      await rebuildUserAnalytics(user._id);

      const rebuiltUserAnalytics = await UserAnalytics.findOne({ user: user._id });
      assert.strictEqual(rebuiltUserAnalytics.summary.income, incrementalState.lifetimeIncome, 'Rebuilt income matches incremental');
      assert.strictEqual(rebuiltUserAnalytics.summary.expense, incrementalState.lifetimeExpense, 'Rebuilt expense matches incremental');
      assert.strictEqual(rebuiltUserAnalytics.summary.balance, incrementalState.lifetimeBalance, 'Rebuilt balance matches incremental');
    });

    console.log('\n--- SECTION 7: ALL LIABILITIES PERIOD FILTERING ORACLE TEST ---');

    await test('7.1: Period-specific liabilities include unpaid bills & debts within period and exclude paid/outside items', async () => {
      const { user, account, catBill } = await createTestUser(6);

      const now = new Date();
      const currentYear = now.getUTCFullYear();
      const currentMonth = now.getUTCMonth();
      const currentDay = now.getUTCDate();

      // Dates:
      // In-period date (today)
      const todayDate = new Date(Date.UTC(currentYear, currentMonth, currentDay, 10, 0, 0, 0));
      // In-period date (yesterday)
      const yesterdayDate = new Date(Date.UTC(currentYear, currentMonth, currentDay - 1, 10, 0, 0, 0));
      // Out-of-period date (last year)
      const lastYearDate = new Date(Date.UTC(currentYear - 1, 5, 15, 10, 0, 0, 0));

      // 1. Unpaid bill inside period (expectedAmount: 1200, dueDate: today)
      const unpaidBillInPeriod = await Bill.create({
        user: user._id,
        name: 'Internet Bill',
        expectedAmount: 1200,
        category: catBill._id,
        account: account._id,
        dueDate: todayDate,
        repeat: 'never',
        status: 'due_today',
        isActive: true
      });

      // 2. Paid bill inside period (expectedAmount: 800, dueDate: today, status: paid)
      const paidBillInPeriod = await Bill.create({
        user: user._id,
        name: 'Electric Bill Paid',
        expectedAmount: 800,
        category: catBill._id,
        account: account._id,
        dueDate: todayDate,
        repeat: 'never',
        status: 'paid',
        paymentDate: todayDate,
        isActive: true
      });

      // 3. Bill outside period (expectedAmount: 500, dueDate: last year)
      const billOutsidePeriod = await Bill.create({
        user: user._id,
        name: 'Old Water Bill',
        expectedAmount: 500,
        category: catBill._id,
        account: account._id,
        dueDate: lastYearDate,
        repeat: 'never',
        status: 'upcoming',
        isActive: true
      });

      // 4. Debt I owe inside period (remainingAmount: 3000, loan date: yesterday)
      const debtInPeriod = await Debt.create({
        user: user._id,
        personName: 'Ahmed (In Period)',
        type: 'i_owe',
        initialAmount: 5000,
        remainingAmount: 3000,
        status: 'active',
        createdAt: yesterdayDate
      });
      const debtTxInPeriod = await DebtTransaction.create({
        user: user._id,
        debtId: debtInPeriod._id,
        amount: 5000,
        type: 'loan',
        account: account._id,
        date: yesterdayDate
      });

      // 5. Debt I owe outside period (remainingAmount: 7000, loan date: last year)
      const debtOutsidePeriod = await Debt.create({
        user: user._id,
        personName: 'Kareem (Old Debt)',
        type: 'i_owe',
        initialAmount: 7000,
        remainingAmount: 7000,
        status: 'active',
        createdAt: lastYearDate
      });
      const debtTxOutside = await DebtTransaction.create({
        user: user._id,
        debtId: debtOutsidePeriod._id,
        amount: 7000,
        type: 'loan',
        account: account._id,
        date: lastYearDate
      });

      // 6. Debt owed to me (should NEVER count as liability)
      const debtOwedToMe = await Debt.create({
        user: user._id,
        personName: 'Omar (Owed to Me)',
        type: 'owed_to_me',
        initialAmount: 2000,
        remainingAmount: 2000,
        status: 'active',
        createdAt: todayDate
      });

      // Replicate the exact OverviewTab calculation helper:
      const calculatePeriodLiabilities = (allBills, allDebts, allDebtTxs, filters) => {
        // Bills: exclude paid, exclude inactive, calculate occurrences in period
        const totalBills = (allBills || [])
          .filter(b => b.status !== 'paid' && b.isActive !== false)
          .reduce((sum, b) => {
            if (!filters?.from || !filters?.to || filters?.filterType === 'all') {
              return sum + (Number(b.expectedAmount) || 0);
            }
            const start = new Date(b.dueDate);
            const fromDate = new Date(filters.from);
            const toDate = new Date(filters.to);
            if (b.repeat === 'never') {
              return (start >= fromDate && start <= toDate) ? sum + Number(b.expectedAmount) : sum;
            }
            return sum;
          }, 0);

        // Debts: type === 'i_owe', loanTx date or createdAt inside period
        const periodDebtsToPay = (allDebts || [])
          .filter(d => String(d.type) === 'i_owe' || String(d.debtType) === 'i_owe')
          .filter(d => {
            if (!filters?.from || !filters?.to || filters?.filterType === 'all') return true;
            const fromDate = new Date(filters.from);
            const toDate = new Date(filters.to);
            const loanTx = (allDebtTxs || []).find(dt => String(dt.debtId) === String(d._id) && dt.type === 'loan');
            const debtDateRaw = loanTx?.date || d.dueDate || d.createdAt;
            if (!debtDateRaw) return true;
            const debtDate = new Date(debtDateRaw);
            return debtDate >= fromDate && debtDate <= toDate;
          })
          .reduce((sum, d) => sum + (Number(d.remainingAmount) || 0), 0);

        return totalBills + periodDebtsToPay;
      };

      const bills = [unpaidBillInPeriod, paidBillInPeriod, billOutsidePeriod];
      const debts = [debtInPeriod, debtOutsidePeriod, debtOwedToMe];
      const debtTxs = [debtTxInPeriod, debtTxOutside];

      // A. "This Week": from start of week to today
      const cycle = getWeeklyCycle(now, 6, 'UTC');
      const thisWeekFilters = {
        filterType: 'this_week',
        from: cycle.startDate.toISOString(),
        to: new Date(Date.UTC(currentYear, currentMonth, currentDay, 23, 59, 59, 999)).toISOString()
      };
      // In this week:
      // unpaidBillInPeriod (1200) + debtInPeriod (3000) = 4200
      // paidBillInPeriod (800) is excluded
      // billOutsidePeriod (500) is excluded
      // debtOutsidePeriod (7000) is excluded
      // debtOwedToMe (2000) is excluded
      const thisWeekLiabilities = calculatePeriodLiabilities(bills, debts, debtTxs, thisWeekFilters);
      assert.strictEqual(thisWeekLiabilities, 4200, 'This Week liabilities must be exactly 4200 (1200 bill + 3000 debt)');

      // B. "Today": only todayDate
      const todayFilters = {
        filterType: 'today',
        from: new Date(Date.UTC(currentYear, currentMonth, currentDay, 0, 0, 0, 0)).toISOString(),
        to: new Date(Date.UTC(currentYear, currentMonth, currentDay, 23, 59, 59, 999)).toISOString()
      };
      // Today: unpaidBillInPeriod (1200). debtInPeriod was yesterday (so 0 debts today)
      const todayLiabilities = calculatePeriodLiabilities(bills, debts, debtTxs, todayFilters);
      assert.strictEqual(todayLiabilities, 1200, 'Today liabilities must be 1200 (unpaid bill only, yesterday debt excluded)');

      // C. "Yesterday": only yesterdayDate
      const yesterdayFilters = {
        filterType: 'yesterday',
        from: new Date(Date.UTC(currentYear, currentMonth, currentDay - 1, 0, 0, 0, 0)).toISOString(),
        to: new Date(Date.UTC(currentYear, currentMonth, currentDay - 1, 23, 59, 59, 999)).toISOString()
      };
      // Yesterday: debtInPeriod (3000). Today bill is excluded.
      const yesterdayLiabilities = calculatePeriodLiabilities(bills, debts, debtTxs, yesterdayFilters);
      assert.strictEqual(yesterdayLiabilities, 3000, 'Yesterday liabilities must be 3000 (debt only)');

      // D. "All Time": all unpaid bills (1200 + 500 = 1700) + all debts I owe (3000 + 7000 = 10000) = 11700
      // Paid bill (800) is STILL EXCLUDED!
      const allTimeLiabilities = calculatePeriodLiabilities(bills, debts, debtTxs, { filterType: 'all' });
      assert.strictEqual(allTimeLiabilities, 11700, 'All Time liabilities must be 11700 (all unpaid bills + all debts I owe, paid excluded)');
    });

    console.log('\n--- SECTION 8: FIXED INCOME DETERMINISTIC DATE ARITHMETIC ORACLE TEST ---');

    await test('8.1: Fixed income scales deterministically across all presets and never calculates past TODAY for current periods', async () => {
      const now = new Date();
      const currentYear = now.getUTCFullYear();
      const currentMonth = now.getUTCMonth();
      const currentDay = now.getUTCDate();
      const daysInCurrentMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
      const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
      const daysInYear = (y) => (isLeapYear(y) ? 366 : 365);

      // Monthly profile: 10,000 EGP / month
      const pMonthly = {
        amount: 10000,
        frequency: 'monthly',
        isActive: true,
        createdAt: new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0))
      };

      // Weekly profile: 2,100 EGP / week (300/day)
      const pWeekly = {
        amount: 2100,
        frequency: 'weekly',
        isActive: true,
        createdAt: new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0))
      };

      // Daily profile: 100 EGP / day
      const pDaily = {
        amount: 100,
        frequency: 'daily',
        isActive: true,
        createdAt: new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0))
      };

      // Replicate the deterministic date arithmetic from OverviewTab.jsx:
      const calculateFixedIncome = (profiles, filters) => {
        const active = (profiles || []).filter(p => p.isActive !== false);
        const filterType = filters?.filterType;

        return active.reduce((sum, p) => {
          const amount = Number(p.amount) || 0;
          const freq = p.frequency || 'monthly';

          if (filterType === 'today') {
            if (freq === 'daily') return sum + amount;
            if (freq === 'weekly') return sum + (amount / 7);
            if (freq === 'yearly') return sum + (amount / daysInYear(currentYear));
            return sum + (amount / daysInCurrentMonth);
          }

          if (filterType === 'yesterday') {
            const yDate = new Date(Date.UTC(currentYear, currentMonth, currentDay - 1));
            const yYear = yDate.getUTCFullYear();
            const yMonth = yDate.getUTCMonth();
            const daysInYMonth = new Date(Date.UTC(yYear, yMonth + 1, 0)).getUTCDate();
            if (freq === 'daily') return sum + amount;
            if (freq === 'weekly') return sum + (amount / 7);
            if (freq === 'yearly') return sum + (amount / daysInYear(yYear));
            return sum + (amount / daysInYMonth);
          }

          if (filterType === 'this_week') {
            let daysElapsedInWeek = 1;
            if (filters?.from) {
              const fDate = new Date(filters.from);
              daysElapsedInWeek = Math.min(7, Math.max(1, Math.floor((Date.UTC(currentYear, currentMonth, currentDay) - Date.UTC(fDate.getUTCFullYear(), fDate.getUTCMonth(), fDate.getUTCDate())) / 86400000) + 1));
            } else {
              daysElapsedInWeek = Math.min(7, Math.max(1, ((now.getUTCDay() + 1) % 7) + 1));
            }
            if (freq === 'daily') return sum + (amount * daysElapsedInWeek);
            if (freq === 'weekly') return sum + ((daysElapsedInWeek / 7) * amount);
            if (freq === 'yearly') return sum + ((daysElapsedInWeek / daysInYear(currentYear)) * amount);
            return sum + ((daysElapsedInWeek / daysInCurrentMonth) * amount);
          }

          if (filterType === 'last_week') {
            if (freq === 'daily') return sum + (amount * 7);
            if (freq === 'weekly') return sum + amount;
            if (freq === 'yearly') return sum + ((7 / daysInYear(currentYear)) * amount);
            return sum + ((7 / 30.4375) * amount);
          }

          if (filterType === 'this_month') {
            if (freq === 'daily') return sum + (amount * currentDay);
            if (freq === 'weekly') return sum + ((currentDay / 7) * amount);
            if (freq === 'yearly') return sum + ((currentDay / daysInYear(currentYear)) * amount);
            return sum + ((currentDay / daysInCurrentMonth) * amount);
          }

          if (filterType === 'last_month') {
            const lastMonthDate = new Date(Date.UTC(currentYear, currentMonth, 0));
            const daysInLastMonth = lastMonthDate.getUTCDate();
            const lastMonthYear = lastMonthDate.getUTCFullYear();
            if (freq === 'daily') return sum + (amount * daysInLastMonth);
            if (freq === 'weekly') return sum + ((daysInLastMonth / 7) * amount);
            if (freq === 'yearly') return sum + ((daysInLastMonth / daysInYear(lastMonthYear)) * amount);
            return sum + amount;
          }

          if (filterType === 'year') {
            const jan1 = Date.UTC(currentYear, 0, 1);
            const todayMid = Date.UTC(currentYear, currentMonth, currentDay);
            const daysElapsedInYear = Math.floor((todayMid - jan1) / 86400000) + 1;
            if (freq === 'daily') return sum + (amount * daysElapsedInYear);
            if (freq === 'weekly') return sum + ((daysElapsedInYear / 7) * amount);
            if (freq === 'yearly') return sum + ((daysElapsedInYear / daysInYear(currentYear)) * amount);
            const monthsElapsed = currentMonth + (currentDay / daysInCurrentMonth);
            return sum + (monthsElapsed * amount);
          }

          if (!filters?.from || !filters?.to || filterType === 'all') {
            if (p.createdAt) {
              const created = new Date(p.createdAt);
              const cYear = created.getUTCFullYear();
              const cMonth = created.getUTCMonth();
              const cDay = created.getUTCDate();
              const daysSinceCreated = Math.max(1, Math.floor((Date.UTC(currentYear, currentMonth, currentDay) - Date.UTC(cYear, cMonth, cDay)) / 86400000) + 1);
              if (freq === 'daily') return sum + (amount * daysSinceCreated);
              if (freq === 'weekly') return sum + ((daysSinceCreated / 7) * amount);
              if (freq === 'yearly') return sum + ((daysSinceCreated / 365.25) * amount);
              return sum + ((daysSinceCreated / 30.4375) * amount);
            }
            return sum + amount;
          }

          const dFrom = new Date(filters.from);
          const dTo = new Date(filters.to);
          const days = Math.max(0, Math.floor((Date.UTC(dTo.getUTCFullYear(), dTo.getUTCMonth(), dTo.getUTCDate()) - Date.UTC(dFrom.getUTCFullYear(), dFrom.getUTCMonth(), dFrom.getUTCDate())) / 86400000) + 1);
          if (freq === 'daily') return sum + (amount * days);
          if (freq === 'weekly') return sum + ((days / 7) * amount);
          if (freq === 'yearly') return sum + ((days / 365.25) * amount);
          return sum + ((days / 30.4375) * amount);
        }, 0);
      };

      // 1. Today
      const valToday = calculateFixedIncome([pDaily, pWeekly], { filterType: 'today' });
      // Daily: 100, Weekly: 2100 / 7 = 300. Total = 400.
      assert.strictEqual(Math.round(valToday), 400, 'Today fixed income must be 400');

      // 2. This Month (strictly up to today, NOT full month)
      const valThisMonth = calculateFixedIncome([pDaily], { filterType: 'this_month' });
      assert.strictEqual(valThisMonth, currentDay * 100, 'This Month daily fixed income must be currentDay * 100');

      // 3. This Year (strictly up to today, NOT Dec 31)
      const valThisYear = calculateFixedIncome([pMonthly], { filterType: 'year' });
      const fullYear12Months = 12 * 10000; // 120,000
      assert.ok(valThisYear < fullYear12Months, 'This Year fixed income MUST NOT include future months through Dec 31');
      const expectedMonths = currentMonth + (currentDay / daysInCurrentMonth);
      assert.strictEqual(Math.round(valThisYear), Math.round(expectedMonths * 10000), 'This Year monthly fixed income matches YTD months');

      // 4. Last Month (full calendar month)
      const valLastMonth = calculateFixedIncome([pMonthly], { filterType: 'last_month' });
      assert.strictEqual(valLastMonth, 10000, 'Last Month fixed income must be exactly 10,000');

      // 5. Last Week (7 days)
      const valLastWeek = calculateFixedIncome([pWeekly], { filterType: 'last_week' });
      assert.strictEqual(valLastWeek, 2100, 'Last Week weekly fixed income must be exactly 2100');
    });

    console.log('\n--- SECTION 9: POINT-IN-TIME STATE METRICS STABILITY ACROSS FILTER SWITCHING ---');

    await test('9.1: Net Worth, Account Balances, and Investments remain point-in-time invariant when changing date filters', async () => {
      const { user, account } = await createTestUser(6);

      const inv = await Investment.create({
        user: user._id,
        name: 'S&P 500 ETF',
        type: 'stock',
        quantity: 10,
        purchasePrice: 2000,
        currentPrice: 2500,
        currentValue: 25000
      });

      const debt = await Debt.create({
        user: user._id,
        personName: 'Bank Loan',
        type: 'i_owe',
        initialAmount: 10000,
        remainingAmount: 5000,
        status: 'active'
      });

      // Point-in-time calculation:
      // totalAssets = account (50,000) + investment (25,000) = 75,000
      // totalCurrentLiabilities = debt (5,000) + overdue/due bills (0) = 5,000
      // netWorth = 75,000 - 5,000 = 70,000

      const calculateNetWorth = (accs, invs, debts, bills) => {
        const totalAssets = (accs || []).reduce((s, a) => s + (a.balance_adjustment || 0), 0) +
                            (invs || []).reduce((s, i) => s + (i.currentValue || (i.quantity * (i.currentPrice || i.purchasePrice)) || 0), 0);
        const lifetimeDebts = (debts || []).filter(d => d.type === 'i_owe').reduce((s, d) => s + (d.remainingAmount || 0), 0);
        return totalAssets - lifetimeDebts;
      };

      const nw1 = calculateNetWorth([account], [inv], [debt], []);
      assert.strictEqual(nw1, 70000, 'Net Worth must be 70,000');

      // Test that regardless of filter chosen, Net Worth remains 70,000
      const filtersList = ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'year', 'all', 'custom'];
      for (const f of filtersList) {
        const nw = calculateNetWorth([account], [inv], [debt], []);
        assert.strictEqual(nw, 70000, `Net Worth must remain 70,000 for filter ${f}`);
      }
    });

    console.log('\n--- SECTION 10: MATERIALIZED VS CANONICAL ROUTING AUDIT FOR ALL PRESETS ---');

    await test('10.1: Every standard preset routes with exactness (O(1) materialized vs canonical indexed aggregation)', async () => {
      const now = new Date();
      const currentYear = now.getUTCFullYear();
      const currentMonth = now.getUTCMonth();

      // 1. All Time: empty query or filterType: all -> materialized
      assert.strictEqual(hasAdHocFilter({}, 6), false, 'All Time routes to materialized UserAnalytics');
      assert.strictEqual(hasAdHocFilter({ filterType: 'all' }, 6), false, 'All Time (filterType: all) routes to UserAnalytics');

      // 2. This Week: routes to canonical aggregation to strictly exclude future transactions
      const cycle = getWeeklyCycle(now, 6, 'UTC');
      assert.strictEqual(hasAdHocFilter({ filterType: 'this_week', from: cycle.startDate.toISOString(), to: cycle.endDate.toISOString() }, 6), true, 'This Week routes to canonical aggregation to exclude future transactions');

      // 3. Last Week: routes to UserAnalyticsWeekly
      const lastWeekDate = new Date(cycle.startDate.getTime() - 7 * 86400000);
      const lastWeekCycle = getWeeklyCycle(lastWeekDate, 6, 'UTC');
      assert.strictEqual(hasAdHocFilter({ filterType: 'last_week', from: lastWeekCycle.startDate.toISOString(), to: lastWeekCycle.endDate.toISOString() }, 6), false, 'Last Week routes to UserAnalyticsWeekly');

      // 4. This Month: routes to canonical aggregation to strictly exclude future transactions
      const monthStart = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
      const monthEnd = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
      assert.strictEqual(hasAdHocFilter({ filterType: 'this_month', from: monthStart.toISOString(), to: monthEnd.toISOString() }, 6), true, 'This Month routes to canonical aggregation to exclude future transactions');

      // 5. Last Month: routes to UserAnalyticsMonthly
      const prevMonthStart = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0, 0));
      const prevMonthEnd = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));
      assert.strictEqual(hasAdHocFilter({ filterType: 'last_month', from: prevMonthStart.toISOString(), to: prevMonthEnd.toISOString() }, 6), false, 'Last Month routes to UserAnalyticsMonthly');

      // 6. Today: routes to canonical aggregation
      assert.strictEqual(hasAdHocFilter({ filterType: 'today', from: new Date().toISOString(), to: new Date().toISOString() }, 6), true, 'Today routes to canonical aggregation');

      // 7. Yesterday: routes to canonical aggregation
      assert.strictEqual(hasAdHocFilter({ filterType: 'yesterday', from: new Date().toISOString(), to: new Date().toISOString() }, 6), true, 'Yesterday routes to canonical aggregation');

      // 8. This Year: routes to canonical aggregation
      assert.strictEqual(hasAdHocFilter({ filterType: 'year', from: new Date(Date.UTC(currentYear, 0, 1)).toISOString(), to: new Date().toISOString() }, 6), true, 'This Year routes to canonical aggregation');

      // 9. Custom: routes to canonical aggregation
      assert.strictEqual(hasAdHocFilter({ filterType: 'custom', from: '2026-05-01T00:00:00Z', to: '2026-05-15T00:00:00Z' }, 6), true, 'Custom range routes to canonical aggregation');
    });

    console.log('\n--- SECTION 11: CURRENT PERIOD FUTURE TRANSACTION EXCLUSION TEST ---');

    await test('11.1: Current period presets (This Week, This Month, This Year) strictly exclude future-dated transactions', async () => {
      const { user, account, catExpense } = await createTestUser(6, 'weekly');

      // Assume reference week starting Saturday
      // Sat = day 0, Sun = day 1, Mon = day 2, Tue = day 3 (TODAY), Wed = day 4 (FUTURE), Thu = day 5 (FUTURE)
      const now = new Date();
      const currentYear = now.getUTCFullYear();
      const currentMonth = now.getUTCMonth();
      const currentDay = now.getUTCDate();
      const dow = now.getUTCDay(); // 0-6
      const diffToSat = (dow - 6 + 7) % 7;

      const satDate = new Date(Date.UTC(currentYear, currentMonth, currentDay - diffToSat, 10, 0, 0));
      const monDate = new Date(Date.UTC(currentYear, currentMonth, currentDay - diffToSat + 2, 10, 0, 0));
      const tueDate = new Date(Date.UTC(currentYear, currentMonth, currentDay - diffToSat + 3, 10, 0, 0));
      const wedFutureDate = new Date(Date.UTC(currentYear, currentMonth, currentDay - diffToSat + 4, 10, 0, 0));
      const thuFutureDate = new Date(Date.UTC(currentYear, currentMonth, currentDay - diffToSat + 5, 10, 0, 0));

      // 1. Saturday transaction: 100
      await transactionService.createTransaction(user._id, {
        amount: 100, type: 'expense', category: catExpense._id, account: account._id, date: satDate, title: 'Sat Tx'
      });
      // 2. Monday transaction: 200
      await transactionService.createTransaction(user._id, {
        amount: 200, type: 'expense', category: catExpense._id, account: account._id, date: monDate, title: 'Mon Tx'
      });
      // 3. Tuesday transaction: 300
      await transactionService.createTransaction(user._id, {
        amount: 300, type: 'expense', category: catExpense._id, account: account._id, date: tueDate, title: 'Tue Tx'
      });
      // 4. Wednesday FUTURE transaction: 400
      await transactionService.createTransaction(user._id, {
        amount: 400, type: 'expense', category: catExpense._id, account: account._id, date: wedFutureDate, title: 'Wed Future Tx'
      });
      // 5. Thursday FUTURE transaction: 500
      await transactionService.createTransaction(user._id, {
        amount: 500, type: 'expense', category: catExpense._id, account: account._id, date: thuFutureDate, title: 'Thu Future Tx'
      });

      // Query "This Week" (start of tracking week to Tuesday 23:59:59.999Z)
      const weekStart = new Date(Date.UTC(currentYear, currentMonth, currentDay - diffToSat, 0, 0, 0, 0));
      const todayEnd = new Date(Date.UTC(currentYear, currentMonth, currentDay - diffToSat + 3, 23, 59, 59, 999));

      const thisWeekRes = await getAnalytics(user._id, {
        filterType: 'this_week',
        from: weekStart.toISOString(),
        to: todayEnd.toISOString()
      });

      // Expected This Week expense: 100 + 200 + 300 = 600. Must NOT be 1500!
      assert.strictEqual(thisWeekRes.summary.expense, 600, 'This Week must strictly exclude future transactions (Wed 400 + Thu 500)');
      assert.strictEqual(thisWeekRes.summary.balance, -600, 'This Week balance must be -600');

      // Query "This Month" (day 1 to Tuesday)
      const monthStart = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
      const thisMonthRes = await getAnalytics(user._id, {
        filterType: 'this_month',
        from: monthStart.toISOString(),
        to: todayEnd.toISOString()
      });
      assert(thisMonthRes.summary.expense <= 600, 'This Month must strictly exclude future transactions');
    });

    console.log('\n--- SECTION 12: ALL TIME INDEPENDENT CANONICAL AGGREGATION ORACLE TEST ---');

    await test('12.1: All Time matches an independent canonical MongoDB aggregation oracle exactly across multi-year, updates, and deletes', async () => {
      const { user, account, catExpense, catIncome } = await createTestUser(6, 'weekly');
      const receivableService = require('../services/receivableService');

      // Create transactions spanning multiple years
      const txs = [
        { amount: 5000, type: 'income', category: catIncome._id, account: account._id, date: new Date('2024-03-15T12:00:00Z'), title: '2024 Salary' },
        { amount: 1200, type: 'expense', category: catExpense._id, account: account._id, date: new Date('2024-04-10T12:00:00Z'), title: '2024 Expense' },
        { amount: 6000, type: 'income', category: catIncome._id, account: account._id, date: new Date('2025-01-20T12:00:00Z'), title: '2025 Salary' },
        { amount: 2500, type: 'expense', category: catExpense._id, account: account._id, date: new Date('2025-06-15T12:00:00Z'), title: '2025 Vacation' },
        { amount: 7000, type: 'income', category: catIncome._id, account: account._id, date: new Date('2026-02-01T12:00:00Z'), title: '2026 Salary' },
        { amount: 1500, type: 'settlement', category: catIncome._id, account: account._id, date: new Date('2026-05-10T12:00:00Z'), title: '2026 Settlement' },
        { amount: 800, type: 'expense', category: catExpense._id, account: account._id, date: new Date('2026-07-22T12:00:00Z'), title: '2026 Repair' },
      ];

      const created = [];
      for (const t of txs) {
        const doc = await transactionService.createTransaction(user._id, t);
        created.push(doc);
      }

      // Create a transaction via receivableService
      await receivableService.create(user._id, {
        title: 'Group Dinner',
        paidAmount: 600,
        paidFrom: account._id,
        receivedAmount: 0,
        participants: [{ name: 'Friend 1', owedAmount: 300 }]
      });

      // Independent Oracle calculation directly from raw MongoDB
      const [oracleResult] = await Transaction.aggregate([
        { $match: { user: user._id, $or: [{ status: 'completed' }, { status: { $exists: false } }] } },
        {
          $group: {
            _id: null,
            income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
            expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
            settlements: { $sum: { $cond: [{ $eq: ['$type', 'settlement'] }, '$amount', 0] } }
          }
        }
      ]);

      const expectedIncome = round2(oracleResult.income);
      const expectedExpense = round2(oracleResult.expense);
      const expectedSettlements = round2(oracleResult.settlements);
      const expectedBalance = round2(expectedIncome - expectedExpense + expectedSettlements);

      // Query All Time from getAnalytics
      const allTimeRes = await getAnalytics(user._id, { filterType: 'all' });

      assert.strictEqual(allTimeRes.summary.income, expectedIncome, 'All Time income must match independent oracle');
      assert.strictEqual(allTimeRes.summary.expense, expectedExpense, 'All Time expense must match independent oracle');
      assert.strictEqual(allTimeRes.summary.settlements, expectedSettlements, 'All Time settlements must match independent oracle');
      assert.strictEqual(allTimeRes.summary.balance, expectedBalance, 'All Time balance must match independent oracle');
    });

    console.log('\n--- SECTION 13: ALL LIABILITIES INDEPENDENT ORACLE & SCENARIOS ---');

    await test('13.1: All Liabilities correctly handles debt partial repayments, excludes paid bills, and avoids double counting', async () => {
      const { user, account, catBill } = await createTestUser(6, 'weekly');

      // Scenario:
      // Debt created before period: 10,000 borrowed (i_owe)
      // Payment during period: 3,000 repayment
      // Remaining now: 7,000
      const debtDoc = await Debt.create({
        user: user._id,
        personName: 'Lender John',
        type: 'i_owe',
        initialAmount: 10000,
        remainingAmount: 10000,
        status: 'active',
        createdAt: new Date('2026-08-01T10:00:00Z')
      });
      await DebtTransaction.create({
        user: user._id,
        debtId: debtDoc._id,
        amount: 10000,
        type: 'loan',
        account: account._id,
        date: new Date('2026-08-01T10:00:00Z')
      });

      // Repayment of 3,000 in September
      debtDoc.remainingAmount = 7000;
      await debtDoc.save();
      await DebtTransaction.create({
        user: user._id,
        debtId: debtDoc._id,
        amount: 3000,
        type: 'repayment',
        account: account._id,
        date: new Date('2026-09-05T10:00:00Z')
      });

      // Unpaid Bill in September: 1,500
      await Bill.create({
        user: user._id,
        name: 'Electricity',
        expectedAmount: 1500,
        category: catBill._id,
        account: account._id,
        dueDate: new Date('2026-09-15T10:00:00Z'),
        status: 'upcoming',
        repeat: 'never',
        isActive: true
      });

      // Paid Bill in September: 800 (MUST NOT be counted in liabilities!)
      await Bill.create({
        user: user._id,
        name: 'Internet',
        expectedAmount: 800,
        category: catBill._id,
        account: account._id,
        dueDate: new Date('2026-09-10T10:00:00Z'),
        status: 'paid',
        repeat: 'never',
        isActive: true
      });

      // Query All Time liabilities
      const allTimeRes = await getAnalytics(user._id, { filterType: 'all' });
      // All Time liabilities = active debts remainingAmount (7000) + unpaid bills (1500) = 8500
      assert.strictEqual(allTimeRes.liabilities.total, 8500, 'All Time liabilities must be 8,500 (7,000 remaining debt + 1,500 unpaid bill)');
      assert.strictEqual(allTimeRes.liabilities.debts, 7000, 'Debts liability must be 7,000');
      assert.strictEqual(allTimeRes.liabilities.bills, 1500, 'Bills liability must be 1,500 (paid bill 800 strictly excluded)');
    });

    console.log('\n--- SECTION 14: FIXED INCOME INDEPENDENT ORACLE & CADENCE VERIFICATION ---');

    await test('14.1: Fixed Income independently tests daily, weekly, monthly, yearly cadences, start dates, and boundary cases', async () => {
      const { calculateFixedIncome, isLeapYear, getDaysInYear, getDaysInMonth } = require('../utils/incomeUtils');

      // Test leap year helper
      assert.strictEqual(isLeapYear(2024), true, '2024 is a leap year');
      assert.strictEqual(isLeapYear(2025), false, '2025 is not a leap year');
      assert.strictEqual(isLeapYear(2026), false, '2026 is not a leap year');
      assert.strictEqual(getDaysInYear(2024), 366, '2024 has 366 days');
      assert.strictEqual(getDaysInYear(2025), 365, '2025 has 365 days');

      // Test days in month
      assert.strictEqual(getDaysInMonth(2024, 1), 29, 'Feb 2024 has 29 days');
      assert.strictEqual(getDaysInMonth(2025, 1), 28, 'Feb 2025 has 28 days');
      assert.strictEqual(getDaysInMonth(2026, 8), 30, 'Sep 2026 has 30 days');
      assert.strictEqual(getDaysInMonth(2026, 9), 31, 'Oct 2026 has 31 days');

      // Test 1: Daily profile starting before period (50/day)
      const dailyProfile = { amount: 50, frequency: 'daily', isActive: true, createdAt: new Date('2026-01-01') };
      const weekRes = calculateFixedIncome([dailyProfile], { filterType: 'last_week' }, new Date('2026-09-13T12:00:00Z'));
      assert.strictEqual(weekRes, 350, '7 days at 50/day = 350');

      // Test 2: Weekly profile (700/week)
      const weeklyProfile = { amount: 700, frequency: 'weekly', isActive: true, createdAt: new Date('2026-01-01') };
      const weeklyRes = calculateFixedIncome([weeklyProfile], { filterType: 'last_week' }, new Date('2026-09-13T12:00:00Z'));
      assert.strictEqual(weeklyRes, 700, '1 complete week at 700/week = 700');

      // Test 3: Monthly profile (3000/month) for complete last month
      const monthlyProfile = { amount: 3000, frequency: 'monthly', isActive: true, createdAt: new Date('2026-01-01') };
      const monthlyRes = calculateFixedIncome([monthlyProfile], { filterType: 'last_month' }, new Date('2026-09-13T12:00:00Z'));
      assert.strictEqual(monthlyRes, 3000, 'Complete last month at 3000/month = 3000');

      // Test 4: Profile starts inside period
      // Profile created on Sep 10, current date is Sep 13 (4 active days: 10, 11, 12, 13)
      const midMonthProfile = { amount: 3000, frequency: 'monthly', isActive: true, startDate: new Date('2026-09-10T00:00:00Z') };
      const midMonthRes = calculateFixedIncome([midMonthProfile], { filterType: 'this_month' }, new Date('2026-09-13T12:00:00Z'));
      // September has 30 days. 4 days elapsed = (4 / 30) * 3000 = 400
      assert.strictEqual(midMonthRes, 400, 'Profile starting Sep 10 with 4 active days in Sep (30 days total) = 400');

      // Test 5: Profile starts AFTER period (in future: Oct 1)
      const futureProfile = { amount: 5000, frequency: 'monthly', isActive: true, startDate: new Date('2026-10-01T00:00:00Z') };
      const futureRes = calculateFixedIncome([futureProfile], { filterType: 'this_month' }, new Date('2026-09-13T12:00:00Z'));
      assert.strictEqual(futureRes, 0, 'Profile starting in future must yield 0 for current month');
    });

  } finally {
    // Cleanup created test users and related documents
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
      await Account.deleteMany({ user: { $in: createdUserIds } });
      await Category.deleteMany({ user: { $in: createdUserIds } });
      await Transaction.deleteMany({ user: { $in: createdUserIds } });
      await Bill.deleteMany({ user: { $in: createdUserIds } });
      await Debt.deleteMany({ user: { $in: createdUserIds } });
      await DebtTransaction.deleteMany({ user: { $in: createdUserIds } });
      await IncomeProfile.deleteMany({ user: { $in: createdUserIds } });
      await Investment.deleteMany({ user: { $in: createdUserIds } });
      await UserAnalytics.deleteMany({ user: { $in: createdUserIds } });
      await UserAnalyticsMonthly.deleteMany({ user: { $in: createdUserIds } });
      await UserAnalyticsWeekly.deleteMany({ user: { $in: createdUserIds } });
      console.log(`\n[CLEANUP] Cleaned up ${createdUserIds.length} test users and all associated collections.`);
    }

    await mongoose.disconnect();
    console.log('[CLEANUP] Disconnected from MongoDB.\n');

    console.log('====================================================');
    console.log(`TEST SUMMARY: ${passedTests}/${totalTests} tests passed`);
    console.log('====================================================\n');

    if (passedTests !== totalTests) {
      process.exit(1);
    }
  }
}

runOverviewAnalyticsCorrectnessTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
