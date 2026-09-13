/**
 * Comprehensive Weekly Analytics Test Suite for Finova
 * Validates persistent UserAnalyticsWeekly against canonical Transaction data.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Investment = require('../models/Investment');
const UserAnalytics = require('../models/UserAnalytics');
const UserAnalyticsMonthly = require('../models/UserAnalyticsMonthly');
const UserAnalyticsWeekly = require('../models/UserAnalyticsWeekly');
const transactionService = require('../services/transactionService');
const analyticsService = require('../services/analyticsService');
const analyticsEngine = require('../services/analyticsEngine');
const { getWeeklyCycle, isMatchingWeeklyCycle } = require('../utils/cycleUtils');

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failedCount++;
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passedCount++;
  }
}

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

async function runSuite() {
  console.log('====================================================');
  console.log('🧪 FINOVA PERSISTENT WEEKLY ANALYTICS TEST SUITE');
  console.log('====================================================\n');

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in environment.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas.\n');

  let testUserSat = null;
  let testUserSun = null;
  let testUserWed = null;
  let testUserB = null;

  try {
    // ─── SETUP: Isolated Test Users with Distinct Cycle Start Days ─────
    console.log('--- SETUP: Isolated Test Users ---');
    // User 1: Saturday Start (Default: 6)
    testUserSat = await User.create({
      email: `test-weekly-sat-${Date.now()}@finova.test`,
      name: 'Test Sat User',
      preferences: { trackingPeriod: 'weekly', trackingStartDayWeekly: 6, trackingStartDayMonthly: 1 },
    });

    // User 2: Sunday Start (0)
    testUserSun = await User.create({
      email: `test-weekly-sun-${Date.now()}@finova.test`,
      name: 'Test Sun User',
      preferences: { trackingPeriod: 'weekly', trackingStartDayWeekly: 0, trackingStartDayMonthly: 1 },
    });

    // User 3: Wednesday Start (3)
    testUserWed = await User.create({
      email: `test-weekly-wed-${Date.now()}@finova.test`,
      name: 'Test Wed User',
      preferences: { trackingPeriod: 'weekly', trackingStartDayWeekly: 3, trackingStartDayMonthly: 1 },
    });

    // User B: Tenant Isolation
    testUserB = await User.create({
      email: `test-weekly-b-${Date.now()}@finova.test`,
      name: 'Test User B',
      preferences: { trackingPeriod: 'weekly', trackingStartDayWeekly: 6, trackingStartDayMonthly: 1 },
    });

    // Setup accounts & categories for User Sat
    const accCash = await Account.create({ user: testUserSat._id, name: 'Cash Wallet', type: 'cash', balance: 5000 });
    const accBank = await Account.create({ user: testUserSat._id, name: 'Bank Account', type: 'bank', balance: 20000 });
    const catFood = await Category.create({ user: testUserSat._id, name: 'Food', type: 'expense', icon: 'Utensils' });
    const catSalary = await Category.create({ user: testUserSat._id, name: 'Salary', type: 'income', icon: 'Briefcase' });

    assert(testUserSat && testUserSun && testUserWed, 'Test users with Saturday, Sunday, Wednesday cycles created');

    // ─── TEST 1-3: EMPTY / NEW USER INITIALIZATION ─────────────────────
    console.log('\n--- TESTS 1-3: Empty / New User Initialization ---');
    const emptyWeeklyDocs = await UserAnalyticsWeekly.find({ user: testUserSat._id });
    assert(emptyWeeklyDocs.length === 0, 'Zero weekly documents initially exist');

    const emptyRes = await analyticsService.getAnalytics(testUserSat._id);
    assert(emptyRes.summary.income === 0, 'Empty user summary.income is 0');
    assert(emptyRes.summary.expense === 0, 'Empty user summary.expense is 0');
    assert(emptyRes.summary.balance === 0, 'Empty user summary.balance is 0');
    assert(Array.isArray(emptyRes.weekly), 'Response contains weekly array');
    assert(emptyRes.weekly.length === 0, 'Empty user weekly array is empty');

    // ─── TEST 4-6: CYCLE UTILITY CANONICAL BOUNDARIES ──────────────────
    console.log('\n--- TESTS 4-6: Canonical Cycle Boundary Calculations ---');
    // Saturday cycle around 2026-09-09 (Wednesday)
    const satCycle = getWeeklyCycle('2026-09-09T14:30:00.000Z', 6);
    assert(satCycle.weekKey === '2026-09-05', `Saturday cycle weekKey is 2026-09-05 (got ${satCycle.weekKey})`);
    assert(satCycle.startDate.toISOString() === '2026-09-05T00:00:00.000Z', 'Saturday cycle start is Saturday 00:00:00Z');
    assert(satCycle.endDate.toISOString() === '2026-09-11T23:59:59.999Z', 'Saturday cycle end is Friday 23:59:59.999Z');

    // Sunday cycle around 2026-09-09 (Wednesday)
    const sunCycle = getWeeklyCycle('2026-09-09T14:30:00.000Z', 0);
    assert(sunCycle.weekKey === '2026-09-06', `Sunday cycle weekKey is 2026-09-06 (got ${sunCycle.weekKey})`);
    assert(sunCycle.startDate.toISOString() === '2026-09-06T00:00:00.000Z', 'Sunday cycle start is Sunday 00:00:00Z');
    assert(sunCycle.endDate.toISOString() === '2026-09-12T23:59:59.999Z', 'Sunday cycle end is Saturday 23:59:59.999Z');

    // Wednesday cycle around 2026-09-09 (Wednesday)
    const wedCycle = getWeeklyCycle('2026-09-09T14:30:00.000Z', 3);
    assert(wedCycle.weekKey === '2026-09-09', `Wednesday cycle weekKey is 2026-09-09 (got ${wedCycle.weekKey})`);
    assert(wedCycle.startDate.toISOString() === '2026-09-09T00:00:00.000Z', 'Wednesday cycle start is Wednesday 00:00:00Z');
    assert(wedCycle.endDate.toISOString() === '2026-09-15T23:59:59.999Z', 'Wednesday cycle end is Tuesday 23:59:59.999Z');

    // ─── TEST 7-10: SINGLE TRANSACTION PERSISTENCE & IMMEDIATE REAL-TIME
    console.log('\n--- TESTS 7-10: Single Transaction Persistence in Current Week ---');
    const tx1 = await transactionService.createTransaction(testUserSat._id, {
      title: 'Groceries Wednesday',
      amount: 350,
      type: 'expense',
      category: catFood._id,
      account: accCash._id,
      date: new Date('2026-09-09T12:00:00.000Z'),
    });

    const weeklyDoc1 = await waitFor(async () => {
      const doc = await UserAnalyticsWeekly.findOne({ user: testUserSat._id, weekKey: '2026-09-05' });
      return (doc && doc.summary?.expense === 350) ? doc : null;
    });

    assert(weeklyDoc1 !== null, 'UserAnalyticsWeekly document created for week 2026-09-05');
    assert(weeklyDoc1.summary.expense === 350, `Weekly expense equals 350 (got ${weeklyDoc1.summary.expense})`);
    assert(weeklyDoc1.summary.balance === -350, `Weekly balance equals -350 (got ${weeklyDoc1.summary.balance})`);
    assert(weeklyDoc1.cycleStartDay === 6, 'Weekly document recorded cycleStartDay 6');
    assert(weeklyDoc1.categoryTotals.get(catFood._id.toString()).amount === 350, 'Weekly Food category total is 350');

    // ─── TEST 11-14: MULTIPLE TRANSACTIONS IN SAME WEEK ────────────────
    console.log('\n--- TESTS 11-14: Multiple Transactions in Same Week ---');
    await transactionService.createTransaction(testUserSat._id, {
      title: 'Salary Deposit',
      amount: 15000,
      type: 'income',
      category: catSalary._id,
      account: accBank._id,
      date: new Date('2026-09-07T09:00:00.000Z'),
    });
    await transactionService.createTransaction(testUserSat._id, {
      title: 'Dinner Friday',
      amount: 150,
      type: 'expense',
      category: catFood._id,
      account: accCash._id,
      date: new Date('2026-09-11T20:00:00.000Z'),
    });

    const weeklyDocMulti = await waitFor(async () => {
      const doc = await UserAnalyticsWeekly.findOne({ user: testUserSat._id, weekKey: '2026-09-05' });
      return (doc && doc.summary?.income === 15000 && doc.summary?.expense === 500) ? doc : null;
    });

    assert(weeklyDocMulti.summary.income === 15000, `Income equals 15,000 (got ${weeklyDocMulti.summary.income})`);
    assert(weeklyDocMulti.summary.expense === 500, `Expense equals 500 (350+150, got ${weeklyDocMulti.summary.expense})`);
    assert(weeklyDocMulti.summary.balance === 14500, `Net balance equals 14,500 (got ${weeklyDocMulti.summary.balance})`);

    // ─── TEST 15-18: EXACT CYCLE BOUNDARIES & MILLISECOND PRECISION ─────
    console.log('\n--- TESTS 15-18: Exact Cycle Boundaries & Millisecond Offsets ---');
    // Friday at 23:59:59.999Z (Last millisecond of current week)
    await transactionService.createTransaction(testUserSat._id, {
      title: 'Late Friday Midnight',
      amount: 80,
      type: 'expense',
      category: catFood._id,
      account: accCash._id,
      date: new Date('2026-09-11T23:59:59.999Z'),
    });
    // Saturday at 00:00:00.000Z (First millisecond of next week!)
    await transactionService.createTransaction(testUserSat._id, {
      title: 'Early Saturday Midnight',
      amount: 120,
      type: 'expense',
      category: catFood._id,
      account: accCash._id,
      date: new Date('2026-09-12T00:00:00.000Z'),
    });

    const [weekCurr, weekNext] = await waitFor(async () => {
      const c = await UserAnalyticsWeekly.findOne({ user: testUserSat._id, weekKey: '2026-09-05' });
      const n = await UserAnalyticsWeekly.findOne({ user: testUserSat._id, weekKey: '2026-09-12' });
      return (c && n && c.summary?.expense === 580 && n.summary?.expense === 120) ? [c, n] : null;
    });

    assert(weekCurr.summary.expense === 580, `Friday 23:59:59.999Z grouped in 2026-09-05 (got ${weekCurr.summary.expense})`);
    assert(weekNext !== null && weekNext.summary.expense === 120, `Saturday 00:00:00.000Z grouped in next week 2026-09-12 (got ${weekNext?.summary?.expense})`);

    // ─── TEST 19-22: MONTH AND YEAR CROSSOVER WEEKS ────────────────────
    console.log('\n--- TESTS 19-22: Month and Year Crossover Weeks ---');
    // Week spanning August and September: Saturday 2026-08-29 to Friday 2026-09-04
    await transactionService.createTransaction(testUserSat._id, {
      title: 'August 31 Crossover',
      amount: 200,
      type: 'expense',
      category: catFood._id,
      account: accCash._id,
      date: new Date('2026-08-31T15:00:00.000Z'),
    });
    await transactionService.createTransaction(testUserSat._id, {
      title: 'September 2 Crossover',
      amount: 300,
      type: 'expense',
      category: catFood._id,
      account: accCash._id,
      date: new Date('2026-09-02T10:00:00.000Z'),
    });

    // Week spanning Year crossover: Saturday 2025-12-27 to Friday 2026-01-02
    await transactionService.createTransaction(testUserSat._id, {
      title: 'New Years Eve 2025',
      amount: 1000,
      type: 'income',
      category: catSalary._id,
      account: accBank._id,
      date: new Date('2025-12-31T20:00:00.000Z'),
    });
    await transactionService.createTransaction(testUserSat._id, {
      title: 'New Years Day 2026',
      amount: 500,
      type: 'expense',
      category: catFood._id,
      account: accCash._id,
      date: new Date('2026-01-01T12:00:00.000Z'),
    });

    const crossoverMonthWeek = await waitFor(async () => {
      const doc = await UserAnalyticsWeekly.findOne({ user: testUserSat._id, weekKey: '2026-08-29' });
      return (doc && doc.summary?.expense === 500) ? doc : null;
    });
    assert(crossoverMonthWeek.summary.expense === 500, `Month crossover week unified under 2026-08-29 (200+300, got ${crossoverMonthWeek.summary.expense})`);

    const crossoverYearWeek = await waitFor(async () => {
      const doc = await UserAnalyticsWeekly.findOne({ user: testUserSat._id, weekKey: '2025-12-27' });
      return (doc && doc.summary?.income === 1000 && doc.summary?.expense === 500) ? doc : null;
    });
    assert(crossoverYearWeek.summary.income === 1000, `Year crossover income is 1,000 (got ${crossoverYearWeek.summary.income})`);
    assert(crossoverYearWeek.summary.expense === 500, `Year crossover expense is 500 (got ${crossoverYearWeek.summary.expense})`);
    assert(crossoverYearWeek.summary.balance === 500, `Year crossover balance is 500 (got ${crossoverYearWeek.summary.balance})`);

    // ─── TEST 23-26: TRANSACTION UPDATE & CROSS-WEEK SHIFTS ─────────────
    console.log('\n--- TESTS 23-26: Transaction Update & Cross-Week Date Shifts ---');
    // Shift tx1 from 2026-09-09 (Week 2026-09-05) to 2026-09-14 (Week 2026-09-12) and change amount 350 -> 450
    const weekBeforeOld = await UserAnalyticsWeekly.findOne({ user: testUserSat._id, weekKey: '2026-09-05' });
    const weekBeforeNew = await UserAnalyticsWeekly.findOne({ user: testUserSat._id, weekKey: '2026-09-12' });

    await transactionService.updateTransaction(testUserSat._id, tx1._id, {
      title: 'Groceries Shifted to Next Week',
      amount: 450,
      type: 'expense',
      category: catFood._id,
      account: accCash._id,
      date: new Date('2026-09-14T12:00:00.000Z'),
    });
    const [weekAfterOld, weekAfterNew] = await waitFor(async () => {
      const o = await UserAnalyticsWeekly.findOne({ user: testUserSat._id, weekKey: '2026-09-05' });
      const n = await UserAnalyticsWeekly.findOne({ user: testUserSat._id, weekKey: '2026-09-12' });
      if (o && n && o.summary.expense === weekBeforeOld.summary.expense - 350 && n.summary.expense === weekBeforeNew.summary.expense + 450) {
        return [o, n];
      }
      return null;
    });

    assert(weekAfterOld && weekAfterOld.summary.expense === weekBeforeOld.summary.expense - 350,
      `Old week correctly decremented by 350 (${weekBeforeOld.summary.expense} -> ${weekAfterOld?.summary?.expense})`);
    assert(weekAfterNew && weekAfterNew.summary.expense === weekBeforeNew.summary.expense + 450,
      `New week correctly incremented by 450 (${weekBeforeNew.summary.expense} -> ${weekAfterNew?.summary?.expense})`);

    // ─── TEST 27-28: TRANSACTION DELETION & ZERO-ENTRY PRUNING ──────────
    console.log('\n--- TESTS 27-28: Transaction Deletion & Zero-Entry Pruning ---');
    const catTemp = await Category.create({ user: testUserSat._id, name: 'TempCat', type: 'expense' });
    const tempTx = await transactionService.createTransaction(testUserSat._id, {
      title: 'Temporary Tx',
      amount: 99,
      type: 'expense',
      category: catTemp._id,
      account: accCash._id,
      date: new Date('2026-09-14T15:00:00.000Z'),
    });
    await sleep(200);

    await transactionService.deleteTransaction(testUserSat._id, tempTx._id);
    await sleep(400);
    await analyticsEngine.pruneZeroEntries(testUserSat._id, '2026-09', '2026-09-12');

    const prunedWeek = await UserAnalyticsWeekly.findOne({ user: testUserSat._id, weekKey: '2026-09-12' });
    assert(!prunedWeek.categoryTotals?.get(catTemp._id.toString()), 'Zeroed category pruned cleanly from weekly categoryTotals');

    // ─── TEST 29-30: BULK IMPORT WITH CONSOLIDATED WEEKLY BULKWRITE ─────
    console.log('\n--- TESTS 29-30: Bulk Import with Consolidated Weekly Deltas ---');
    const importBatch = [];
    for (let i = 0; i < 60; i++) {
      importBatch.push({
        title: `Import Item ${i}`,
        amount: 50,
        type: i % 5 === 0 ? 'income' : 'expense',
        category: i % 5 === 0 ? catSalary.name : catFood.name,
        account: accCash.name,
        date: new Date(new Date('2026-09-01T00:00:00Z').getTime() + i * 3600000 * 12).toISOString(),
      });
    }

    const preImportCount = await Transaction.countDocuments({ user: testUserSat._id });
    await transactionService.importTransactions(testUserSat._id, { transactions: importBatch });
    await sleep(500);

    const postImportCount = await Transaction.countDocuments({ user: testUserSat._id });
    assert(postImportCount === preImportCount + 60, 'All 60 import transactions persisted');

    // ─── TEST 31-33: CANONICAL MATHEMATICAL CONVERGENCE (ORACLE) ────────
    console.log('\n--- TESTS 31-33: Canonical Mathematical Reconciliation ---');
    // Compare canonical aggregation of transactions in week 2026-09-05 against UserAnalyticsWeekly
    const weekBounds = getWeeklyCycle('2026-09-07T00:00:00Z', 6);
    const [canonicalWeekAgg] = await Transaction.aggregate([
      {
        $match: {
          user: testUserSat._id,
          status: 'completed',
          date: { $gte: weekBounds.startDate, $lte: weekBounds.endDate },
        },
      },
      {
        $group: {
          _id: null,
          income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
          expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
        },
      },
    ]);

    const materializedWeek = await UserAnalyticsWeekly.findOne({ user: testUserSat._id, weekKey: weekBounds.weekKey });
    assert(materializedWeek.summary.income === (canonicalWeekAgg?.income || 0),
      `Weekly income matches canonical (${materializedWeek.summary.income} === ${canonicalWeekAgg?.income || 0})`);
    assert(materializedWeek.summary.expense === (canonicalWeekAgg?.expense || 0),
      `Weekly expense matches canonical (${materializedWeek.summary.expense} === ${canonicalWeekAgg?.expense || 0})`);

    // ─── TEST 34-36: PREFERENCE CHANGE (SATURDAY -> SUNDAY REALIGNMENT) ─
    console.log('\n--- TESTS 34-36: Tracking Preference Change & Historical Realignment ---');
    // User Sat changes start day to Sunday (0)
    testUserSat.preferences.trackingStartDayWeekly = 0;
    await testUserSat.save();

    // Rebuild triggers to realign historical buckets
    await analyticsEngine.rebuildUserAnalytics(testUserSat._id);

    const allRealignedWeeks = await UserAnalyticsWeekly.find({ user: testUserSat._id });
    for (const w of allRealignedWeeks) {
      assert(w.cycleStartDay === 0, `Bucket ${w.weekKey} cycleStartDay is 0 (Sunday)`);
      const cycleStartDow = new Date(w.startDate).getUTCDay();
      assert(cycleStartDow === 0, `Bucket ${w.weekKey} start date is Sunday (got day ${cycleStartDow})`);
    }

    // ─── TEST 37-40: QUERY ROUTING & AD-HOC FILTER PRESERVATION ─────────
    console.log('\n--- TESTS 37-40: Analytics Query Routing & Filter Preservation ---');
    const sunWeekBounds = getWeeklyCycle('2026-09-08T00:00:00Z', 0);

    // Unfiltered tracking week query: served from UserAnalyticsWeekly in O(1)
    const weeklyQueryRes = await analyticsService.getAnalytics(testUserSat._id, {
      from: sunWeekBounds.startDate.toISOString(),
      to: sunWeekBounds.endDate.toISOString(),
    });
    assert(weeklyQueryRes.summary !== undefined, 'Weekly query returned summary');
    assert(Array.isArray(weeklyQueryRes.weekly), 'Weekly query returned weekly array');

    // Ad-hoc filtered query (Week + Food category): MUST route to canonical aggregation!
    const filteredQueryRes = await analyticsService.getAnalytics(testUserSat._id, {
      from: sunWeekBounds.startDate.toISOString(),
      to: sunWeekBounds.endDate.toISOString(),
      category: catFood._id.toString(),
    });
    assert(filteredQueryRes.summary.income === 0, 'Category filter for Food returned 0 income');
    assert(filteredQueryRes.summary.expense > 0, `Category filter for Food returned filtered expense (${filteredQueryRes.summary.expense})`);

    // ─── TEST 41-43: TENANT ISOLATION ──────────────────────────────────
    console.log('\n--- TESTS 41-43: Tenant Isolation ---');
    const userBDocs = await UserAnalyticsWeekly.find({ user: testUserB._id });
    assert(userBDocs.length === 0, 'User B has zero weekly documents');

    const accB = await Account.create({ user: testUserB._id, name: 'User B Cash', type: 'cash', balance: 50000 });
    const catB = await Category.create({ user: testUserB._id, name: 'User B Expense', type: 'expense' });

    await transactionService.createTransaction(testUserB._id, {
      title: 'User B Expense',
      amount: 9999,
      type: 'expense',
      category: catB._id,
      account: accB._id,
      date: new Date('2026-09-08T12:00:00Z'),
    });

    const userBDocAfter = await waitFor(async () => {
      const doc = await UserAnalyticsWeekly.findOne({ user: testUserB._id });
      return (doc && doc.summary?.expense === 9999) ? doc : null;
    });

    const userSatDocAfter = await UserAnalyticsWeekly.findOne({ user: testUserSat._id, weekKey: userBDocAfter.weekKey });

    assert(userBDocAfter.summary.expense === 9999, 'User B weekly expense is 9,999');
    assert(!userSatDocAfter || userSatDocAfter.summary.expense !== 9999, 'User Sat weekly analytics strictly isolated from User B');

    // ─── TEST 44-46: CONCURRENT SAME-WEEK MUTATIONS ─────────────────────
    console.log('\n--- TESTS 44-46: Concurrent Same-Week Mutations ---');
    const p1 = transactionService.createTransaction(testUserSat._id, {
      title: 'Concurrent Tx 1',
      amount: 111,
      type: 'expense',
      category: catFood._id,
      account: accCash._id,
      date: new Date('2026-09-08T14:00:00Z'),
    });
    const p2 = transactionService.createTransaction(testUserSat._id, {
      title: 'Concurrent Tx 2',
      amount: 222,
      type: 'expense',
      category: catFood._id,
      account: accCash._id,
      date: new Date('2026-09-08T14:05:00Z'),
    });
    await Promise.all([p1, p2]);

    const [canonicalConcurrentAgg] = await Transaction.aggregate([
      {
        $match: {
          user: testUserSat._id,
          status: 'completed',
          date: { $gte: sunWeekBounds.startDate, $lte: sunWeekBounds.endDate },
        },
      },
      {
        $group: {
          _id: null,
          expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
        },
      },
    ]);

    const finalWeekDoc = await waitFor(async () => {
      const doc = await UserAnalyticsWeekly.findOne({ user: testUserSat._id, weekKey: sunWeekBounds.weekKey });
      return (doc && doc.summary?.expense === canonicalConcurrentAgg.expense) ? doc : null;
    });

    assert(finalWeekDoc && finalWeekDoc.summary.expense === canonicalConcurrentAgg.expense,
      `Concurrent mutations reconciled with exact canonical equality (${finalWeekDoc?.summary?.expense} === ${canonicalConcurrentAgg.expense})`);

    // ─── TEST 47-50: FRONTEND RESPONSE CONTRACT REGRESSION ─────────────
    console.log('\n--- TESTS 47-50: Frontend Contract Compatibility ---');
    const fullRes = await analyticsService.getAnalytics(testUserSat._id);
    assert('summary' in fullRes, 'Response contains summary');
    assert('monthly' in fullRes, 'Response contains monthly');
    assert('weekly' in fullRes, 'Response contains weekly');
    assert('categories' in fullRes, 'Response contains categories');
    assert('accounts' in fullRes, 'Response contains accounts');
    assert('heatmap' in fullRes, 'Response contains heatmap');
    assert(Array.isArray(fullRes.transactions), 'Response contains transactions array');
    assert(fullRes.transactions.length === 0, 'transactions array is empty to prevent OOM');

  } finally {
    // ─── TEARDOWN TEST DATA ──────────────────────────────────────────
    console.log('\n--- TEARDOWN: Cleaning up synthetic test users ---');
    const testUserIds = [testUserSat?._id, testUserSun?._id, testUserWed?._id, testUserB?._id].filter(Boolean);
    for (const uid of testUserIds) {
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
  console.log(`🎉 TEST RUN COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runSuite().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}
