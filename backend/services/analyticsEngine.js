const mongoose = require('mongoose');
const UserAnalytics = require('../models/UserAnalytics');
const UserAnalyticsMonthly = require('../models/UserAnalyticsMonthly');
const UserAnalyticsWeekly = require('../models/UserAnalyticsWeekly');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Account = require('../models/Account');
const Bill = require('../models/Bill');
const Debt = require('../models/Debt');
const DebtTransaction = require('../models/DebtTransaction');
const IncomeProfile = require('../models/IncomeProfile');
const { getWeeklyCycle, isMatchingWeeklyCycle } = require('../utils/cycleUtils');

const round2 = (num) => Math.round((Number(num) || 0) * 100) / 100;

/**
 * Format a Date or date string to 'YYYY-MM' in UTC
 */
const toYearMonth = (dateVal) => {
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 7);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * Fetch authoritative user preference for weekly tracking cycle
 */
const getUserTrackingStartDay = async (userId) => {
  try {
    const userDoc = await User.findById(userId).select('preferences.trackingStartDayWeekly').lean();
    return userDoc?.preferences?.trackingStartDayWeekly ?? 6;
  } catch (err) {
    return 6;
  }
};

/**
 * Compute the directional delta of a transaction for analytics counters.
 * Multiplier is +1 for addition, -1 for subtraction.
 */
const computeTransactionDelta = (tx, multiplier = 1, startDayPref = 6) => {
  const amount = round2(tx.amount);
  const d = tx.date ? new Date(tx.date) : new Date();
  const month = toYearMonth(d);
  const year = d.getUTCFullYear();
  const monthNum = d.getUTCMonth() + 1;
  const dow = d.getUTCDay(); // 0 (Sun) to 6 (Sat) in UTC
  const type = tx.type;

  const weekCycle = getWeeklyCycle(d, startDayPref);

  const catId = (tx.category?._id || tx.category)?.toString() || null;
  const accId = (tx.account?._id || tx.account)?.toString() || null;
  const fromId = (tx.from_account?._id || tx.from_account)?.toString() || null;
  const toId = (tx.to_account?._id || tx.to_account)?.toString() || null;

  let income = 0;
  let expense = 0;
  let settlements = 0;
  let balance = 0;
  let heatmap = 0;

  if (type === 'income') {
    income = round2(amount * multiplier);
    balance = round2(amount * multiplier);
  } else if (type === 'expense') {
    expense = round2(amount * multiplier);
    balance = round2(-amount * multiplier);
    heatmap = round2(amount * multiplier);
  } else if (type === 'settlement') {
    settlements = round2(amount * multiplier);
    balance = round2(amount * multiplier);
  }

  return {
    amount,
    multiplier,
    effectiveAmount: round2(amount * multiplier),
    month,
    year,
    monthNum,
    dow,
    weekKey: weekCycle.weekKey,
    startDate: weekCycle.startDate,
    endDate: weekCycle.endDate,
    cycleStartDay: weekCycle.cycleStartDay,
    type,
    catId,
    accId,
    fromId,
    toId,
    income,
    expense,
    settlements,
    balance,
    heatmap,
  };
};

/**
 * Construct MongoDB $inc update objects for UserAnalytics, UserAnalyticsMonthly, & UserAnalyticsWeekly
 */
const buildIncPayloads = (delta) => {
  const incAll = {};
  const incMonthly = {};
  const incWeekly = {};

  if (delta.income !== 0) {
    incAll['summary.income'] = delta.income;
    incMonthly['summary.income'] = delta.income;
    incWeekly['summary.income'] = delta.income;
  }
  if (delta.expense !== 0) {
    incAll['summary.expense'] = delta.expense;
    incMonthly['summary.expense'] = delta.expense;
    incWeekly['summary.expense'] = delta.expense;
  }
  if (delta.settlements !== 0) {
    incAll['summary.settlements'] = delta.settlements;
    incMonthly['summary.settlements'] = delta.settlements;
    incWeekly['summary.settlements'] = delta.settlements;
  }
  if (delta.balance !== 0) {
    incAll['summary.balance'] = delta.balance;
    incMonthly['summary.balance'] = delta.balance;
    incWeekly['summary.balance'] = delta.balance;
  }
  if (delta.heatmap !== 0) {
    incAll[`heatmap.${delta.dow}`] = delta.heatmap;
    incMonthly[`heatmap.${delta.dow}`] = delta.heatmap;
  }

  // Category totals
  if (delta.catId && (delta.type === 'income' || delta.type === 'expense')) {
    incAll[`categoryTotals.${delta.catId}.amount`] = delta.effectiveAmount;
    incAll[`categoryTotals.${delta.catId}.count`] = 1 * delta.multiplier;
    incMonthly[`categoryTotals.${delta.catId}.amount`] = delta.effectiveAmount;
    incMonthly[`categoryTotals.${delta.catId}.count`] = 1 * delta.multiplier;
    incWeekly[`categoryTotals.${delta.catId}.amount`] = delta.effectiveAmount;
    incWeekly[`categoryTotals.${delta.catId}.count`] = 1 * delta.multiplier;
  }

  // Account totals
  if (delta.accId) {
    if (delta.type === 'income') {
      incAll[`accountTotals.${delta.accId}.income`] = delta.income;
      incMonthly[`accountTotals.${delta.accId}.income`] = delta.income;
      incWeekly[`accountTotals.${delta.accId}.income`] = delta.income;
    } else if (delta.type === 'expense') {
      incAll[`accountTotals.${delta.accId}.expense`] = delta.expense;
      incMonthly[`accountTotals.${delta.accId}.expense`] = delta.expense;
      incWeekly[`accountTotals.${delta.accId}.expense`] = delta.expense;
    } else if (delta.type === 'settlement') {
      incAll[`accountTotals.${delta.accId}.settlements`] = delta.settlements;
      incMonthly[`accountTotals.${delta.accId}.settlements`] = delta.settlements;
      incWeekly[`accountTotals.${delta.accId}.settlements`] = delta.settlements;
    }
  }

  // Transfer totals
  if (delta.type === 'transfer') {
    if (delta.fromId) {
      incAll[`accountTotals.${delta.fromId}.transferOut`] = delta.effectiveAmount;
      incMonthly[`accountTotals.${delta.fromId}.transferOut`] = delta.effectiveAmount;
      incWeekly[`accountTotals.${delta.fromId}.transferOut`] = delta.effectiveAmount;
    }
    if (delta.toId) {
      incAll[`accountTotals.${delta.toId}.transferIn`] = delta.effectiveAmount;
      incMonthly[`accountTotals.${delta.toId}.transferIn`] = delta.effectiveAmount;
      incWeekly[`accountTotals.${delta.toId}.transferIn`] = delta.effectiveAmount;
    }
  }

  return { incAll, incMonthly, incWeekly };
};

/**
 * Flag an analytics document as needing reconciliation when an error occurs.
 * Guarantees zero silent drift and observable recovery path.
 */
const markReconciliationNeeded = async (userId, reason) => {
  try {
    console.error(`[ANALYTICS_DRIFT_ALERT] Marking reconciliation needed for user ${userId}: ${reason}`);
    await UserAnalytics.updateOne(
      { user: userId },
      {
        $set: {
          needsReconciliation: true,
          reconciliationReason: String(reason).slice(0, 500),
          'lastError.message': String(reason).slice(0, 500),
          'lastError.at': new Date(),
        },
        $setOnInsert: { user: userId },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error('[ANALYTICS_DRIFT_FATAL] Failed to persist reconciliation flag:', err.message);
  }
};

/**
 * Apply a single transaction delta (Create: +1, Delete: -1)
 */
const applyTransactionDelta = async (userId, tx, multiplier = 1, session = null, opts = {}) => {
  if (!userId || !tx) return;
  try {
    const startDayPref = opts.trackingStartDayWeekly !== undefined
      ? opts.trackingStartDayWeekly
      : await getUserTrackingStartDay(userId);

    const delta = computeTransactionDelta(tx, multiplier, startDayPref);
    const { incAll, incMonthly, incWeekly } = buildIncPayloads(delta);

    const writeOpts = session ? { session, upsert: true } : { upsert: true };

    // 1. Update Lifetime Store with optimistic version increment
    if (Object.keys(incAll).length > 0) {
      const setOnInsert = { user: userId };
      if (delta.catId) {
        setOnInsert[`categoryTotals.${delta.catId}.type`] = delta.type;
      }
      incAll.version = 1;
      await UserAnalytics.updateOne(
        { user: userId },
        {
          $inc: incAll,
          $set: { lastReconciledAt: new Date() },
          $setOnInsert: setOnInsert,
        },
        writeOpts
      );
    }

    // 2. Update Monthly Store
    if (Object.keys(incMonthly).length > 0) {
      const setOnInsert = {
        user: userId,
        month: delta.month,
        year: delta.year,
        monthNum: delta.monthNum,
      };
      if (delta.catId) {
        setOnInsert[`categoryTotals.${delta.catId}.type`] = delta.type;
      }
      await UserAnalyticsMonthly.updateOne(
        { user: userId, month: delta.month },
        {
          $inc: incMonthly,
          $set: { lastReconciledAt: new Date() },
          $setOnInsert: setOnInsert,
        },
        writeOpts
      );
    }

    // 3. Update Weekly Store
    if (Object.keys(incWeekly).length > 0) {
      const setOnInsert = {
        user: userId,
        weekKey: delta.weekKey,
        startDate: delta.startDate,
        endDate: delta.endDate,
        cycleStartDay: delta.cycleStartDay,
      };
      if (delta.catId) {
        setOnInsert[`categoryTotals.${delta.catId}.type`] = delta.type;
      }
      await UserAnalyticsWeekly.updateOne(
        { user: userId, weekKey: delta.weekKey },
        {
          $inc: incWeekly,
          $set: { lastReconciledAt: new Date() },
          $setOnInsert: setOnInsert,
        },
        writeOpts
      );
    }

    // If subtracting, prune any zeroed category or account entries asynchronously
    if (multiplier < 0) {
      pruneZeroEntries(userId, delta.month, delta.weekKey).catch(() => {});
    }
  } catch (err) {
    await markReconciliationNeeded(userId, `applyTransactionDelta: ${err.message}`);
    throw err;
  }
};

/**
 * Apply an update to an existing transaction (reverses old, applies new)
 */
const applyTransactionUpdate = async (userId, oldTx, newTx, session = null, opts = {}) => {
  if (!userId || !oldTx || !newTx) return;

  try {
    const startDayPref = opts.trackingStartDayWeekly !== undefined
      ? opts.trackingStartDayWeekly
      : await getUserTrackingStartDay(userId);

    const oldDelta = computeTransactionDelta(oldTx, -1, startDayPref);
    const newDelta = computeTransactionDelta(newTx, 1, startDayPref);

    const writeOpts = session ? { session, upsert: true } : { upsert: true };

    // 1. Lifetime Store Update (combine old negation + new addition)
    const { incAll: oldIncAll } = buildIncPayloads(oldDelta);
    const { incAll: newIncAll } = buildIncPayloads(newDelta);

    const combinedAll = {};
    for (const [key, val] of Object.entries(oldIncAll)) combinedAll[key] = (combinedAll[key] || 0) + val;
    for (const [key, val] of Object.entries(newIncAll)) combinedAll[key] = (combinedAll[key] || 0) + val;

    const filteredAll = {};
    for (const [k, v] of Object.entries(combinedAll)) if (v !== 0) filteredAll[k] = v;

    if (Object.keys(filteredAll).length > 0) {
      filteredAll.version = 1;
      await UserAnalytics.updateOne(
        { user: userId },
        {
          $inc: filteredAll,
          $set: { lastReconciledAt: new Date() },
          $setOnInsert: { user: userId },
        },
        writeOpts
      );
    }

    // 2. Monthly Store Update
    if (oldDelta.month === newDelta.month) {
      const { incMonthly: oldIncM } = buildIncPayloads(oldDelta);
      const { incMonthly: newIncM } = buildIncPayloads(newDelta);
      const combinedM = {};
      for (const [key, val] of Object.entries(oldIncM)) combinedM[key] = (combinedM[key] || 0) + val;
      for (const [key, val] of Object.entries(newIncM)) combinedM[key] = (combinedM[key] || 0) + val;

      const filteredM = {};
      for (const [k, v] of Object.entries(combinedM)) if (v !== 0) filteredM[k] = v;

      if (Object.keys(filteredM).length > 0) {
        await UserAnalyticsMonthly.updateOne(
          { user: userId, month: newDelta.month },
          {
            $inc: filteredM,
            $set: { lastReconciledAt: new Date() },
            $setOnInsert: {
              user: userId,
              month: newDelta.month,
              year: newDelta.year,
              monthNum: newDelta.monthNum,
            },
          },
          writeOpts
        );
      }
    } else {
      // Cross-month date shift: subtract from old month, add to new month
      const { incMonthly: oldIncM } = buildIncPayloads(oldDelta);
      const { incMonthly: newIncM } = buildIncPayloads(newDelta);

      if (Object.keys(oldIncM).length > 0) {
        await UserAnalyticsMonthly.updateOne(
          { user: userId, month: oldDelta.month },
          {
            $inc: oldIncM,
            $set: { lastReconciledAt: new Date() },
            $setOnInsert: {
              user: userId,
              month: oldDelta.month,
              year: oldDelta.year,
              monthNum: oldDelta.monthNum,
            },
          },
          writeOpts
        );
      }
      if (Object.keys(newIncM).length > 0) {
        await UserAnalyticsMonthly.updateOne(
          { user: userId, month: newDelta.month },
          {
            $inc: newIncM,
            $set: { lastReconciledAt: new Date() },
            $setOnInsert: {
              user: userId,
              month: newDelta.month,
              year: newDelta.year,
              monthNum: newDelta.monthNum,
            },
          },
          writeOpts
        );
      }
    }

    // 3. Weekly Store Update
    if (oldDelta.weekKey === newDelta.weekKey) {
      // Same week: combine into one atomic operation
      const { incWeekly: oldIncW } = buildIncPayloads(oldDelta);
      const { incWeekly: newIncW } = buildIncPayloads(newDelta);
      const combinedW = {};
      for (const [key, val] of Object.entries(oldIncW)) combinedW[key] = (combinedW[key] || 0) + val;
      for (const [key, val] of Object.entries(newIncW)) combinedW[key] = (combinedW[key] || 0) + val;

      const filteredW = {};
      for (const [k, v] of Object.entries(combinedW)) if (v !== 0) filteredW[k] = v;

      if (Object.keys(filteredW).length > 0) {
        await UserAnalyticsWeekly.updateOne(
          { user: userId, weekKey: newDelta.weekKey },
          {
            $inc: filteredW,
            $set: { lastReconciledAt: new Date() },
            $setOnInsert: {
              user: userId,
              weekKey: newDelta.weekKey,
              startDate: newDelta.startDate,
              endDate: newDelta.endDate,
              cycleStartDay: newDelta.cycleStartDay,
            },
          },
          writeOpts
        );
      }
    } else {
      // Cross-week date shift: subtract from old week, add to new week
      const { incWeekly: oldIncW } = buildIncPayloads(oldDelta);
      const { incWeekly: newIncW } = buildIncPayloads(newDelta);

      if (Object.keys(oldIncW).length > 0) {
        await UserAnalyticsWeekly.updateOne(
          { user: userId, weekKey: oldDelta.weekKey },
          {
            $inc: oldIncW,
            $set: { lastReconciledAt: new Date() },
            $setOnInsert: {
              user: userId,
              weekKey: oldDelta.weekKey,
              startDate: oldDelta.startDate,
              endDate: oldDelta.endDate,
              cycleStartDay: oldDelta.cycleStartDay,
            },
          },
          writeOpts
        );
      }
      if (Object.keys(newIncW).length > 0) {
        await UserAnalyticsWeekly.updateOne(
          { user: userId, weekKey: newDelta.weekKey },
          {
            $inc: newIncW,
            $set: { lastReconciledAt: new Date() },
            $setOnInsert: {
              user: userId,
              weekKey: newDelta.weekKey,
              startDate: newDelta.startDate,
              endDate: newDelta.endDate,
              cycleStartDay: newDelta.cycleStartDay,
            },
          },
          writeOpts
        );
      }
    }

    pruneZeroEntries(userId, oldDelta.month, oldDelta.weekKey).catch(() => {});
  } catch (err) {
    await markReconciliationNeeded(userId, `applyTransactionUpdate: ${err.message}`);
    throw err;
  }
};

/**
 * Apply bulk transaction deltas during CSV/JSON import
 */
const applyBulkTransactionDeltas = async (userId, transactions, session = null, opts = {}) => {
  if (!userId || !Array.isArray(transactions) || transactions.length === 0) return;

  try {
    const startDayPref = opts.trackingStartDayWeekly !== undefined
      ? opts.trackingStartDayWeekly
      : await getUserTrackingStartDay(userId);

    const aggregatedAll = {};
    const monthlyBuckets = new Map(); // month -> { inc, year, monthNum }
    const weeklyBuckets = new Map();  // weekKey -> { inc, startDate, endDate, cycleStartDay }

    for (const tx of transactions) {
      if (!tx || !tx.amount) continue;
      const delta = computeTransactionDelta(tx, 1, startDayPref);
      const { incAll, incMonthly, incWeekly } = buildIncPayloads(delta);

      // Accumulate All-time
      for (const [k, v] of Object.entries(incAll)) {
        aggregatedAll[k] = (aggregatedAll[k] || 0) + v;
      }

      // Accumulate Monthly
      if (!monthlyBuckets.has(delta.month)) {
        monthlyBuckets.set(delta.month, {
          inc: {},
          year: delta.year,
          monthNum: delta.monthNum,
        });
      }
      const mBucket = monthlyBuckets.get(delta.month);
      for (const [k, v] of Object.entries(incMonthly)) {
        mBucket.inc[k] = (mBucket.inc[k] || 0) + v;
      }

      // Accumulate Weekly
      if (!weeklyBuckets.has(delta.weekKey)) {
        weeklyBuckets.set(delta.weekKey, {
          inc: {},
          startDate: delta.startDate,
          endDate: delta.endDate,
          cycleStartDay: delta.cycleStartDay,
        });
      }
      const wBucket = weeklyBuckets.get(delta.weekKey);
      for (const [k, v] of Object.entries(incWeekly)) {
        wBucket.inc[k] = (wBucket.inc[k] || 0) + v;
      }
    }

    const writeOpts = session ? { session, upsert: true } : { upsert: true };

    // 1. Atomic update for All-Time Lifetime Store
    if (Object.keys(aggregatedAll).length > 0) {
      aggregatedAll.version = 1;
      await UserAnalytics.updateOne(
        { user: userId },
        {
          $inc: aggregatedAll,
          $set: { lastReconciledAt: new Date() },
          $setOnInsert: { user: userId },
        },
        writeOpts
      );
    }

    // 2. Bulk write for Monthly Store (at most 1 op per unique month)
    if (monthlyBuckets.size > 0) {
      const monthlyOps = [];
      for (const [month, data] of monthlyBuckets.entries()) {
        if (Object.keys(data.inc).length > 0) {
          monthlyOps.push({
            updateOne: {
              filter: { user: userId, month },
              update: {
                $inc: data.inc,
                $set: { lastReconciledAt: new Date() },
                $setOnInsert: {
                  user: userId,
                  month,
                  year: data.year,
                  monthNum: data.monthNum,
                },
              },
              upsert: true,
            },
          });
        }
      }

      if (monthlyOps.length > 0) {
        if (session) {
          await UserAnalyticsMonthly.bulkWrite(monthlyOps, { session });
        } else {
          await UserAnalyticsMonthly.bulkWrite(monthlyOps);
        }
      }
    }

    // 3. Bulk write for Weekly Store (at most 1 op per unique week)
    if (weeklyBuckets.size > 0) {
      const weeklyOps = [];
      for (const [weekKey, data] of weeklyBuckets.entries()) {
        if (Object.keys(data.inc).length > 0) {
          weeklyOps.push({
            updateOne: {
              filter: { user: userId, weekKey },
              update: {
                $inc: data.inc,
                $set: { lastReconciledAt: new Date() },
                $setOnInsert: {
                  user: userId,
                  weekKey,
                  startDate: data.startDate,
                  endDate: data.endDate,
                  cycleStartDay: data.cycleStartDay,
                },
              },
              upsert: true,
            },
          });
        }
      }

      if (weeklyOps.length > 0) {
        if (session) {
          await UserAnalyticsWeekly.bulkWrite(weeklyOps, { session });
        } else {
          await UserAnalyticsWeekly.bulkWrite(weeklyOps);
        }
      }
    }
  } catch (err) {
    await markReconciliationNeeded(userId, `applyBulkTransactionDeltas: ${err.message}`);
    throw err;
  }
};

/**
 * Prune zeroed categoryTotals and accountTotals keys to prevent document bloat
 */
const pruneZeroEntries = async (userId, month = null, weekKey = null) => {
  try {
    const userDoc = await UserAnalytics.findOne({ user: userId });
    if (userDoc) {
      const unsets = {};
      if (userDoc.categoryTotals) {
        for (const [catId, val] of userDoc.categoryTotals.entries()) {
          if (Math.abs(val.amount || 0) < 0.001 && (val.count || 0) <= 0) {
            unsets[`categoryTotals.${catId}`] = 1;
          }
        }
      }
      if (userDoc.accountTotals) {
        for (const [accId, val] of userDoc.accountTotals.entries()) {
          if (
            Math.abs(val.income || 0) < 0.001 &&
            Math.abs(val.expense || 0) < 0.001 &&
            Math.abs(val.settlements || 0) < 0.001 &&
            Math.abs(val.transferIn || 0) < 0.001 &&
            Math.abs(val.transferOut || 0) < 0.001
          ) {
            unsets[`accountTotals.${accId}`] = 1;
          }
        }
      }
      if (Object.keys(unsets).length > 0) {
        await UserAnalytics.updateOne({ user: userId }, { $unset: unsets });
      }
    }

    if (month) {
      const mDoc = await UserAnalyticsMonthly.findOne({ user: userId, month });
      if (mDoc) {
        const unsetsM = {};
        if (mDoc.categoryTotals) {
          for (const [catId, val] of mDoc.categoryTotals.entries()) {
            if (Math.abs(val.amount || 0) < 0.001 && (val.count || 0) <= 0) {
              unsetsM[`categoryTotals.${catId}`] = 1;
            }
          }
        }
        if (mDoc.accountTotals) {
          for (const [accId, val] of mDoc.accountTotals.entries()) {
            if (
              Math.abs(val.income || 0) < 0.001 &&
              Math.abs(val.expense || 0) < 0.001 &&
              Math.abs(val.settlements || 0) < 0.001
            ) {
              unsetsM[`accountTotals.${accId}`] = 1;
            }
          }
        }
        if (Object.keys(unsetsM).length > 0) {
          await UserAnalyticsMonthly.updateOne({ user: userId, month }, { $unset: unsetsM });
        }
      }
    }

    if (weekKey) {
      const wDoc = await UserAnalyticsWeekly.findOne({ user: userId, weekKey });
      if (wDoc) {
        const unsetsW = {};
        if (wDoc.categoryTotals) {
          for (const [catId, val] of wDoc.categoryTotals.entries()) {
            if (Math.abs(val.amount || 0) < 0.001 && (val.count || 0) <= 0) {
              unsetsW[`categoryTotals.${catId}`] = 1;
            }
          }
        }
        if (wDoc.accountTotals) {
          for (const [accId, val] of wDoc.accountTotals.entries()) {
            if (
              Math.abs(val.income || 0) < 0.001 &&
              Math.abs(val.expense || 0) < 0.001 &&
              Math.abs(val.settlements || 0) < 0.001
            ) {
              unsetsW[`accountTotals.${accId}`] = 1;
            }
          }
        }
        if (Object.keys(unsetsW).length > 0) {
          await UserAnalyticsWeekly.updateOne({ user: userId, weekKey }, { $unset: unsetsW });
        }
      }
    }
  } catch (err) {
    // Non-fatal cleanup
  }
};

/**
 * Filter Evaluation: Checks whether a query contains ad-hoc filters that require
 * canonical direct aggregation, or can be served in O(1) from persistent stores.
 */
const hasAdHocFilter = (query = {}, userPrefWeekStart = 6) => {
  if (query.account || query.category || query.search) return true;

  // Explicit preset indicators:
  // "This Week", "This Month", "This Year", "Today", "Yesterday", and "Custom"
  // MUST NOT include future transactions, so they route to canonical indexed aggregation
  // where date <= todayEnd is strictly enforced.
  if (
    query.filterType === 'today' ||
    query.filterType === 'yesterday' ||
    query.filterType === 'this_week' ||
    query.filterType === 'this_month' ||
    query.filterType === 'year' ||
    query.filterType === 'custom'
  ) {
    return true; // Always canonical
  }

  if (query.from || query.to) {
    if (!query.from || !query.to) return true;
    const dFrom = new Date(query.from);
    const dTo = new Date(query.to);
    if (Number.isNaN(dFrom.getTime()) || Number.isNaN(dTo.getTime())) return true;

    // Check for single-day range without explicit weekly/monthly preset
    const durationHours = (dTo.getTime() - dFrom.getTime()) / 3600000;
    if (durationHours <= 25) {
      return true; // Single day -> canonical
    }

    // 1. Check if the range matches a canonical single tracking week (e.g. "Last Week")
    if (isMatchingWeeklyCycle(query.from, query.to, userPrefWeekStart)) {
      return false; // Completed tracking week! Served from UserAnalyticsWeekly in O(1)
    }

    // 2. Multi-month spans (e.g. "This Year", multi-month custom ranges) are AD-HOC!
    // Route directly to canonical MongoDB aggregation on Transaction for 100% precision.
    const fromMonth = toYearMonth(dFrom);
    const toMonth = toYearMonth(dTo);
    if (fromMonth !== toMonth) {
      return true;
    }

    // 3. Check if whole-month aligned (e.g. "Last Month")
    const isStartUTC = dFrom.getUTCDate() === 1 && dFrom.getUTCHours() === 0 && dFrom.getUTCMinutes() === 0;
    const isStartLocal = dFrom.getDate() === 1 && dFrom.getHours() === 0 && dFrom.getMinutes() === 0;
    if (!isStartUTC && !isStartLocal) {
      return true; // Partial start day
    }

    const lastDayUTC = new Date(Date.UTC(dTo.getUTCFullYear(), dTo.getUTCMonth() + 1, 0)).getUTCDate();
    const isEndUTC = (dTo.getUTCDate() === lastDayUTC && dTo.getUTCHours() >= 23) ||
      (dTo.getUTCDate() === 1 && dTo.getUTCHours() === 0 && dTo.getTime() > dFrom.getTime());

    const lastDayLocal = new Date(dTo.getFullYear(), dTo.getMonth() + 1, 0).getDate();
    const isEndLocal = (dTo.getDate() === lastDayLocal && dTo.getHours() >= 23) ||
      (dTo.getDate() === 1 && dTo.getHours() === 0 && dTo.getTime() > dFrom.getTime());

    if (!isEndUTC && !isEndLocal) {
      return true; // Partial month (e.g. month to date) -> must be canonical
    }
  }
  return false;
};

/**
 * Deterministic Rebuild / Reconcile Engine
 * Calculates canonical analytics from all Transaction documents for userId,
 * and atomically replaces/updates all materialized stores with OCC versioning.
 */
const rebuildUserAnalytics = async (userId, session = null) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const opts = session ? { session } : {};

  // Mark rebuilding in progress to prevent duplicate concurrent rebuild invocations
  await UserAnalytics.updateOne({ user: userId }, { $set: { isRebuilding: true } }, { upsert: true });

  try {
    const trackingStartDayWeekly = await getUserTrackingStartDay(userId);

  let attempts = 0;
  let rebuiltDoc = null;

  while (attempts < 3) {
    attempts++;
    const existingDoc = await UserAnalytics.findOne({ user: userId }).select('version').lean();
    const currentVersion = existingDoc?.version || 0;

    // 1. Lifetime Aggregation
    const [lifetimeResult] = await Transaction.aggregate([
      { $match: { user: userObjectId, $or: [{ status: 'completed' }, { status: { $exists: false } }] } },
      {
        $facet: {
          summary: [
            { $group: { _id: '$type', total: { $sum: '$amount' } } },
          ],
          heatmap: [
            { $match: { type: 'expense' } },
            { $group: { _id: { $dayOfWeek: '$date' }, amount: { $sum: '$amount' } } },
          ],
          categories: [
            { $match: { category: { $exists: true, $ne: null } } },
            {
              $group: {
                _id: { category: '$category', type: '$type' },
                amount: { $sum: '$amount' },
                count: { $sum: 1 },
              },
            },
          ],
          accounts: [
            {
              $group: {
                _id: '$account',
                income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
                expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
                settlements: { $sum: { $cond: [{ $eq: ['$type', 'settlement'] }, '$amount', 0] } },
              },
            },
          ],
          transfersOut: [
            { $match: { type: 'transfer', from_account: { $exists: true, $ne: null } } },
            { $group: { _id: '$from_account', amount: { $sum: '$amount' } } },
          ],
          transfersIn: [
            { $match: { type: 'transfer', to_account: { $exists: true, $ne: null } } },
            { $group: { _id: '$to_account', amount: { $sum: '$amount' } } },
          ],
        },
      },
    ]);

    const summary = { income: 0, expense: 0, settlements: 0, balance: 0 };
    if (lifetimeResult?.summary) {
      for (const item of lifetimeResult.summary) {
        if (item._id === 'income') summary.income = round2(item.total);
        if (item._id === 'expense') summary.expense = round2(item.total);
        if (item._id === 'settlement') summary.settlements = round2(item.total);
      }
    }
    summary.balance = round2(summary.income - summary.expense + summary.settlements);

    const heatmap = [0, 0, 0, 0, 0, 0, 0];
    if (lifetimeResult?.heatmap) {
      for (const item of lifetimeResult.heatmap) {
        const idx = item._id - 1;
        if (idx >= 0 && idx < 7) heatmap[idx] = round2(item.amount);
      }
    }

    const categoryTotals = new Map();
    if (lifetimeResult?.categories) {
      for (const item of lifetimeResult.categories) {
        if (item._id?.category && item.amount > 0) {
          categoryTotals.set(item._id.category.toString(), {
            amount: round2(item.amount),
            count: item.count,
            type: item._id.type,
          });
        }
      }
    }

    const accountTotals = new Map();
    if (lifetimeResult?.accounts) {
      for (const item of lifetimeResult.accounts) {
        if (item._id) {
          accountTotals.set(item._id.toString(), {
            income: round2(item.income),
            expense: round2(item.expense),
            settlements: round2(item.settlements),
            transferIn: 0,
            transferOut: 0,
          });
        }
      }
    }
    if (lifetimeResult?.transfersOut) {
      for (const item of lifetimeResult.transfersOut) {
        if (item._id) {
          const idStr = item._id.toString();
          const existing = accountTotals.get(idStr) || { income: 0, expense: 0, settlements: 0, transferIn: 0, transferOut: 0 };
          existing.transferOut = round2(item.amount);
          accountTotals.set(idStr, existing);
        }
      }
    }
    if (lifetimeResult?.transfersIn) {
      for (const item of lifetimeResult.transfersIn) {
        if (item._id) {
          const idStr = item._id.toString();
          const existing = accountTotals.get(idStr) || { income: 0, expense: 0, settlements: 0, transferIn: 0, transferOut: 0 };
          existing.transferIn = round2(item.amount);
          accountTotals.set(idStr, existing);
        }
      }
    }

    // Atomically replace UserAnalytics document matching expected version
    const filter = existingDoc
      ? { user: userId, version: currentVersion }
      : { user: userId, $or: [{ version: { $exists: false } }, { version: 0 }] };

    rebuiltDoc = await UserAnalytics.findOneAndUpdate(
      filter,
      {
        $set: {
          summary,
          heatmap,
          categoryTotals,
          accountTotals,
          isRebuilding: true,
        },
        $setOnInsert: { user: userId },
        $inc: { version: 1 },
      },
      { upsert: !existingDoc, returnDocument: 'after', ...opts }
    );

    if (rebuiltDoc) {
      break; // Successfully updated with version lock
    }

    console.warn(`[ANALYTICS] Concurrent transaction write detected during rebuild for user ${userId}. Retrying rebuild (attempt ${attempts})...`);
    await new Promise((r) => setTimeout(r, 50));
  }

  if (!rebuiltDoc) {
    rebuiltDoc = await UserAnalytics.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          needsReconciliation: true,
          reconciliationReason: 'OCC contention during rebuild',
          isRebuilding: true,
        },
        $inc: { version: 1 },
      },
      { returnDocument: 'after', ...opts }
    );
  }

  // 2. Monthly Aggregations
  const monthlyAgg = await Transaction.aggregate([
    { $match: { user: userObjectId, $or: [{ status: 'completed' }, { status: { $exists: false } }] } },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: '%Y-%m', date: '$date' } },
          type: '$type',
          dow: { $dayOfWeek: '$date' },
          category: '$category',
          account: '$account',
        },
        amount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const monthMap = new Map();
  for (const item of monthlyAgg) {
    const month = item._id.month;
    if (!month) continue;

    if (!monthMap.has(month)) {
      const [y, m] = month.split('-').map(Number);
      monthMap.set(month, {
        income: 0,
        expense: 0,
        settlements: 0,
        balance: 0,
        heatmap: [0, 0, 0, 0, 0, 0, 0],
        categoryTotals: new Map(),
        accountTotals: new Map(),
        year: y,
        monthNum: m,
      });
    }

    const mRecord = monthMap.get(month);
    const type = item._id.type;
    const amt = round2(item.amount);

    if (type === 'income') {
      mRecord.income = round2(mRecord.income + amt);
      mRecord.balance = round2(mRecord.balance + amt);
    } else if (type === 'expense') {
      mRecord.expense = round2(mRecord.expense + amt);
      mRecord.balance = round2(mRecord.balance - amt);
      const dowIdx = item._id.dow - 1;
      if (dowIdx >= 0 && dowIdx < 7) mRecord.heatmap[dowIdx] = round2(mRecord.heatmap[dowIdx] + amt);
    } else if (type === 'settlement') {
      mRecord.settlements = round2(mRecord.settlements + amt);
      mRecord.balance = round2(mRecord.balance + amt);
    }

    if (item._id.category && (type === 'income' || type === 'expense')) {
      const catStr = item._id.category.toString();
      const existingCat = mRecord.categoryTotals.get(catStr) || { amount: 0, count: 0, type };
      existingCat.amount = round2(existingCat.amount + amt);
      existingCat.count += item.count;
      mRecord.categoryTotals.set(catStr, existingCat);
    }

    if (item._id.account) {
      const accStr = item._id.account.toString();
      const existingAcc = mRecord.accountTotals.get(accStr) || { income: 0, expense: 0, settlements: 0 };
      if (type === 'income') existingAcc.income = round2(existingAcc.income + amt);
      if (type === 'expense') existingAcc.expense = round2(existingAcc.expense + amt);
      if (type === 'settlement') existingAcc.settlements = round2(existingAcc.settlements + amt);
      mRecord.accountTotals.set(accStr, existingAcc);
    }
  }

  if (monthMap.size > 0) {
    const bulkOps = [];
    for (const [month, data] of monthMap.entries()) {
      bulkOps.push({
        updateOne: {
          filter: { user: userId, month },
          update: {
            $set: {
              summary: {
                income: data.income,
                expense: data.expense,
                settlements: data.settlements,
                balance: data.balance,
              },
              heatmap: data.heatmap,
              categoryTotals: data.categoryTotals,
              accountTotals: data.accountTotals,
              year: data.year,
              monthNum: data.monthNum,
              lastReconciledAt: new Date(),
            },
            $setOnInsert: { user: userId, month },
          },
          upsert: true,
        },
      });
    }
    await UserAnalyticsMonthly.bulkWrite(bulkOps, opts);
  }

  // 3. Weekly Aggregations (Grouped by canonical tracking cycle)
  const cursor = Transaction.find({ user: userObjectId, $or: [{ status: 'completed' }, { status: { $exists: false } }] })
    .select('date amount type category account from_account to_account')
    .lean()
    .cursor({ batchSize: 1000 });

  const weekMap = new Map();
  for await (const tx of cursor) {
    const cycle = getWeeklyCycle(tx.date, trackingStartDayWeekly);
    const weekKey = cycle.weekKey;

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        cycleStartDay: cycle.cycleStartDay,
        income: 0,
        expense: 0,
        settlements: 0,
        balance: 0,
        categoryTotals: new Map(),
        accountTotals: new Map(),
      });
    }

    const wRecord = weekMap.get(weekKey);
    const amt = round2(tx.amount);
    const type = tx.type;

    if (type === 'income') {
      wRecord.income = round2(wRecord.income + amt);
      wRecord.balance = round2(wRecord.balance + amt);
    } else if (type === 'expense') {
      wRecord.expense = round2(wRecord.expense + amt);
      wRecord.balance = round2(wRecord.balance - amt);
    } else if (type === 'settlement') {
      wRecord.settlements = round2(wRecord.settlements + amt);
      wRecord.balance = round2(wRecord.balance + amt);
    }

    const catId = (tx.category?._id || tx.category)?.toString();
    if (catId && (type === 'income' || type === 'expense')) {
      const existingCat = wRecord.categoryTotals.get(catId) || { amount: 0, count: 0, type };
      existingCat.amount = round2(existingCat.amount + amt);
      existingCat.count += 1;
      wRecord.categoryTotals.set(catId, existingCat);
    }

    const accId = (tx.account?._id || tx.account)?.toString();
    if (accId) {
      const existingAcc = wRecord.accountTotals.get(accId) || { income: 0, expense: 0, settlements: 0 };
      if (type === 'income') existingAcc.income = round2(existingAcc.income + amt);
      if (type === 'expense') existingAcc.expense = round2(existingAcc.expense + amt);
      if (type === 'settlement') existingAcc.settlements = round2(existingAcc.settlements + amt);
      wRecord.accountTotals.set(accId, existingAcc);
    }

    if (type === 'transfer') {
      const fromId = (tx.from_account?._id || tx.from_account)?.toString();
      const toId = (tx.to_account?._id || tx.to_account)?.toString();
      if (fromId) {
        const fromAcc = wRecord.accountTotals.get(fromId) || { income: 0, expense: 0, settlements: 0, transferIn: 0, transferOut: 0 };
        fromAcc.transferOut = round2((fromAcc.transferOut || 0) + amt);
        wRecord.accountTotals.set(fromId, fromAcc);
      }
      if (toId) {
        const toAcc = wRecord.accountTotals.get(toId) || { income: 0, expense: 0, settlements: 0, transferIn: 0, transferOut: 0 };
        toAcc.transferIn = round2((toAcc.transferIn || 0) + amt);
        wRecord.accountTotals.set(toId, toAcc);
      }
    }
  }

  if (weekMap.size > 0) {
    const weeklyOps = [];
    for (const [weekKey, data] of weekMap.entries()) {
      weeklyOps.push({
        updateOne: {
          filter: { user: userId, weekKey },
          update: {
            $set: {
              summary: {
                income: data.income,
                expense: data.expense,
                settlements: data.settlements,
                balance: data.balance,
              },
              categoryTotals: data.categoryTotals,
              accountTotals: data.accountTotals,
              startDate: data.startDate,
              endDate: data.endDate,
              cycleStartDay: data.cycleStartDay,
              lastReconciledAt: new Date(),
            },
            $setOnInsert: { user: userId, weekKey },
          },
          upsert: true,
        },
      });
    }
    await UserAnalyticsWeekly.bulkWrite(weeklyOps, opts);
  }

  // Prune obsolete weekly buckets (e.g. after a start day preference change)
  await UserAnalyticsWeekly.deleteMany({
    user: userId,
    weekKey: { $nin: Array.from(weekMap.keys()) },
  }, opts);

  // 4. Mark rebuild complete across all tiers (Lifetime + Monthly + Weekly)
  rebuiltDoc = await UserAnalytics.findOneAndUpdate(
    { user: userId },
    {
      $set: {
        lastReconciledAt: new Date(),
        needsReconciliation: false,
        reconciliationReason: null,
        isRebuilding: false,
      },
    },
    { returnDocument: 'after', ...opts }
  );

  return rebuiltDoc;
  } catch (err) {
    await markReconciliationNeeded(userId, `rebuildUserAnalytics: ${err.message}`);
    throw err;
  } finally {
    await UserAnalytics.updateOne({ user: userId }, { $set: { isRebuilding: false } });
  }
};

/**
 * Helper to count exact occurrences of a repeating bill within [fromDate, toDate]
 */
const countBillOccurrences = (eventDate, frequency, fromDate, toDate) => {
  if (!eventDate) return 0;
  const start = new Date(eventDate);
  if (fromDate > toDate) return 0;

  if (frequency === 'never') {
    return (start >= fromDate && start <= toDate) ? 1 : 0;
  }

  const getOccurrence = (i) => {
    const d = new Date(start);
    if (frequency === 'daily') d.setUTCDate(d.getUTCDate() + i);
    else if (frequency === 'weekly') d.setUTCDate(d.getUTCDate() + i * 7);
    else if (frequency === 'yearly') d.setUTCFullYear(d.getUTCFullYear() + i);
    else if (frequency === 'monthly') {
      const targetMonth = d.getUTCMonth() + i;
      const expectedMonth = ((targetMonth % 12) + 12) % 12;
      d.setUTCMonth(targetMonth);
      if (d.getUTCMonth() !== expectedMonth) d.setUTCDate(0);
    }
    return d;
  };

  let count = 0;
  let i = 0;

  if (start < fromDate) {
    if (frequency === 'daily') i = Math.max(0, Math.floor((fromDate - start) / (1000 * 60 * 60 * 24)));
    else if (frequency === 'weekly') i = Math.max(0, Math.floor((fromDate - start) / (1000 * 60 * 60 * 24 * 7)));
    else if (frequency === 'monthly') i = Math.max(0, (fromDate.getUTCFullYear() - start.getUTCFullYear()) * 12 + (fromDate.getUTCMonth() - start.getUTCMonth()) - 1);
    else if (frequency === 'yearly') i = Math.max(0, fromDate.getUTCFullYear() - start.getUTCFullYear() - 1);
  } else if (start > toDate) {
    if (frequency === 'daily') i = Math.floor((fromDate - start) / (1000 * 60 * 60 * 24)) - 1;
    else if (frequency === 'weekly') i = Math.floor((fromDate - start) / (1000 * 60 * 60 * 24 * 7)) - 1;
    else if (frequency === 'monthly') i = (fromDate.getUTCFullYear() - start.getUTCFullYear()) * 12 + (fromDate.getUTCMonth() - start.getUTCMonth()) - 1;
    else if (frequency === 'yearly') i = fromDate.getUTCFullYear() - start.getUTCFullYear() - 1;
  }

  while (true) {
    const current = getOccurrence(i);
    if (current > toDate) break;
    if (current >= fromDate) {
      count++;
    }
    i++;
    if (i > 10000) break;
  }

  return count;
};

/**
 * Server-side authoritative liabilities calculator.
 * Scoped strictly to the selected date filter period.
 * Strictly excludes paid bills and accurately accounts for debts I owe.
 */
const calculateServerLiabilities = async (userId, from = null, to = null, filterType = 'all') => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth();
    const currentDate = now.getUTCDate();
    const todayStart = new Date(Date.UTC(currentYear, currentMonth, currentDate, 0, 0, 0, 0));
    const todayEnd = new Date(Date.UTC(currentYear, currentMonth, currentDate, 23, 59, 59, 999));

    let fromDate = from ? new Date(from) : null;
    let toDate = to ? new Date(to) : null;

    if (!fromDate || !toDate) {
      if (filterType === 'today') {
        fromDate = todayStart;
        toDate = todayEnd;
      } else if (filterType === 'yesterday') {
        fromDate = new Date(Date.UTC(currentYear, currentMonth, currentDate - 1, 0, 0, 0, 0));
        toDate = new Date(Date.UTC(currentYear, currentMonth, currentDate - 1, 23, 59, 59, 999));
      } else if (filterType === 'this_week') {
        const trackingStartDayWeekly = await getUserTrackingStartDay(userId);
        const cycle = getWeeklyCycle(now, trackingStartDayWeekly, 'UTC');
        fromDate = cycle.startDate;
        toDate = todayEnd;
      } else if (filterType === 'last_week') {
        const trackingStartDayWeekly = await getUserTrackingStartDay(userId);
        const lastWeekRef = new Date(Date.UTC(currentYear, currentMonth, currentDate - 7));
        const cycle = getWeeklyCycle(lastWeekRef, trackingStartDayWeekly, 'UTC');
        fromDate = cycle.startDate;
        toDate = cycle.endDate;
      } else if (filterType === 'this_month') {
        fromDate = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
        toDate = todayEnd;
      } else if (filterType === 'last_month') {
        fromDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0, 0));
        toDate = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));
      } else if (filterType === 'year') {
        fromDate = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0));
        toDate = todayEnd;
      }
    }

    const isAllTime = (!fromDate && !toDate) || (filterType === 'all' && !from && !to);

    // 1. Debts I Owe: Active debts I currently owe
    const activeDebts = await Debt.find({ user: userObjectId, type: 'i_owe', status: 'active' }).lean();

    let totalDebts = 0;
    if (isAllTime) {
      totalDebts = activeDebts.reduce((sum, d) => sum + (Number(d.remainingAmount) || 0), 0);
    } else {
      const debtIds = activeDebts.map(d => d._id);
      const debtTxs = await DebtTransaction.find({
        user: userObjectId,
        debtId: { $in: debtIds },
        type: 'loan'
      }).select('debtId date').lean();

      const loanTxMap = new Map();
      for (const tx of debtTxs) {
        loanTxMap.set(String(tx.debtId), tx.date);
      }

      totalDebts = activeDebts
        .filter(d => {
          const debtDateRaw = loanTxMap.get(String(d._id)) || d.dueDate || d.createdAt;
          if (!debtDateRaw) return true;
          const debtDate = new Date(debtDateRaw);
          return debtDate >= fromDate && debtDate <= toDate;
        })
        .reduce((sum, d) => sum + (Number(d.remainingAmount) || 0), 0);
    }

    // 2. Bills: Unpaid bills scoped to period
    let totalBills = 0;
    if (isAllTime) {
      const activeUnpaidBills = await Bill.find({
        user: userObjectId,
        isActive: { $ne: false },
        status: { $ne: 'paid' }
      }).lean();
      totalBills = activeUnpaidBills.reduce((sum, b) => sum + (Number(b.expectedAmount) || 0), 0);
    } else {
      let billFromDate = fromDate;
      let billToDate = toDate;
      const isCurrentPeriod = ['today', 'this_week', 'this_month', 'year'].includes(filterType) || (filterType === 'custom' && toDate && toDate >= todayStart);

      if (filterType === 'this_month') {
        billFromDate = fromDate || new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
        billToDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
      } else if (filterType === 'this_week') {
        const trackingStartDayWeekly = await getUserTrackingStartDay(userId);
        const cycle = getWeeklyCycle(now, trackingStartDayWeekly, 'UTC');
        billFromDate = cycle.startDate;
        billToDate = cycle.endDate;
      } else if (filterType === 'year') {
        billFromDate = fromDate || new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0));
        billToDate = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));
      } else if (filterType === 'last_month') {
        billFromDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0, 0));
        billToDate = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));
      } else if (filterType === 'last_week') {
        const trackingStartDayWeekly = await getUserTrackingStartDay(userId);
        const lastWeekRef = new Date(Date.UTC(currentYear, currentMonth, currentDate - 7));
        const cycle = getWeeklyCycle(lastWeekRef, trackingStartDayWeekly, 'UTC');
        billFromDate = cycle.startDate;
        billToDate = cycle.endDate;
      } else if (filterType === 'today') {
        billFromDate = todayStart;
        billToDate = todayEnd;
      } else if (filterType === 'yesterday') {
        billFromDate = new Date(Date.UTC(currentYear, currentMonth, currentDate - 1, 0, 0, 0, 0));
        billToDate = new Date(Date.UTC(currentYear, currentMonth, currentDate - 1, 23, 59, 59, 999));
      } else if (filterType === 'custom' && toDate) {
        billToDate = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate(), 23, 59, 59, 999));
      }

      const allActiveBills = await Bill.find({
        user: userObjectId,
        isActive: { $ne: false }
      }).lean();

      totalBills = allActiveBills.reduce((sum, b) => {
        const history = Array.isArray(b.paymentHistory) ? b.paymentHistory : [];
        const payments = history.length > 0
          ? history
          : (b.paymentDate ? [{ paidAt: b.paymentDate, dueDate: b.dueDate, amount: b.expectedAmount }] : []);

        if (b.repeat === 'never') {
          const dueDate = new Date(b.dueDate);
          const inDueRange = dueDate >= billFromDate && dueDate <= billToDate;
          const isOverduePast = isCurrentPeriod && (b.status === 'overdue' || (b.status !== 'paid' && dueDate < todayStart)) && dueDate < billFromDate;
          if (!inDueRange && !isOverduePast) return sum;

          return sum + (Number(b.expectedAmount) || 0);
        } else {
          const occurrences = countBillOccurrences(b.dueDate, b.repeat, billFromDate, billToDate);
          let totalCount = occurrences;
          const paidInRangeCount = payments.filter(p => {
            const pPaidAt = p.paidAt ? new Date(p.paidAt) : null;
            return pPaidAt && pPaidAt >= billFromDate && pPaidAt <= billToDate;
          }).length;
          totalCount = Math.max(totalCount, paidInRangeCount);

          if (totalCount <= 0) {
            const isOverduePast = isCurrentPeriod && (b.status === 'overdue' || (b.status !== 'paid' && new Date(b.dueDate) < todayStart));
            if (isOverduePast) {
              return sum + (Number(b.expectedAmount) || 0);
            }
            return sum;
          }

        return sum + (Number(b.expectedAmount) || 0) * totalCount;
      }
    }, 0);
  }

  return {
    total: round2(totalDebts + totalBills),
    debts: round2(totalDebts),
    bills: round2(totalBills)
  };
  } catch (err) {
    console.error('[ANALYTICS] calculateServerLiabilities error:', err.stack);
    return { total: 0, debts: 0, bills: 0 };
  }
};

/**
 * Calculate actual Fixed Income for a user.
 * Sums completed income transactions strictly in the category linked to active IncomeProfile(s).
 */
const calculateServerFixedIncome = async (userId, from = null, to = null, filterType = 'all', accountId = null, categoryId = null) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const activeProfiles = await IncomeProfile.find({ user: userObjectId, isActive: true }).lean().catch(() => []);
    const linkedCategoryIds = activeProfiles
      .map(p => p.category)
      .filter(Boolean)
      .map(id => (typeof id === 'object' && id._id ? id._id : id))
      .map(id => new mongoose.Types.ObjectId(id));

    if (linkedCategoryIds.length === 0) return 0;

    let targetCategoryIds = linkedCategoryIds;
    if (categoryId) {
      const filterCatObjId = new mongoose.Types.ObjectId(categoryId);
      const hasCat = linkedCategoryIds.some(id => id.equals(filterCatObjId));
      if (!hasCat) return 0;
      targetCategoryIds = [filterCatObjId];
    }

    const matchConditions = [
      { user: userObjectId },
      { type: 'income' },
      { category: { $in: targetCategoryIds } },
      { $or: [{ status: 'completed' }, { status: { $exists: false } }] }
    ];

    if (accountId) {
      const accObjId = new mongoose.Types.ObjectId(accountId);
      matchConditions.push({
        $or: [{ account: accObjId }, { to_account: accObjId }]
      });
    }

    if (from && to && filterType !== 'all') {
      matchConditions.push({
        date: { $gte: new Date(from), $lte: new Date(to) }
      });
    }

    const result = await Transaction.aggregate([
      { $match: { $and: matchConditions } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    return result.length > 0 ? round2(result[0].total) : 0;
  } catch (err) {
    console.error('[ANALYTICS] calculateServerFixedIncome error:', err.stack);
    return 0;
  }
};

/**
 * Retrieve Analytics for a user with O(1) / bounded reads from precomputed stores
 */
const getUserAnalytics = async (userId, query = {}) => {
  const trackingStartDayWeekly = await getUserTrackingStartDay(userId);

  // If the user requested ad-hoc filtering (account, category, search, or non-aligned date range)
  // serve via the indexed canonical pipeline to preserve 100% of existing query semantics.
  if (hasAdHocFilter(query, trackingStartDayWeekly)) {
    const { getCanonicalAnalytics } = require('./analyticsService');
    return await getCanonicalAnalytics(userId, query);
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  // 1. Fetch persistent stores and reference maps in parallel (single round-trip batch)
  let [lifetimeDoc, monthlyDocs, weeklyDocs, allCategories, allAccounts] = await Promise.all([
    UserAnalytics.findOne({ user: userId }).lean(),
    UserAnalyticsMonthly.find({ user: userId }).sort({ month: 1 }).lean(),
    UserAnalyticsWeekly.find({ user: userId }).sort({ startDate: -1 }).limit(12).lean(),
    Category.find({ user: userId }).select('name icon color type').lean(),
    Account.find({ user: userId }).select('name icon color type').lean(),
  ]);

  const catMap = new Map(allCategories.map((c) => [c._id.toString(), c]));
  const accMap = new Map(allAccounts.map((a) => [a._id.toString(), a]));

  // 2. Safe Initialization & Drift Check
  const isMissingOrIncomplete = !lifetimeDoc || !lifetimeDoc.lastReconciledAt;

  if (isMissingOrIncomplete) {
    const txCount = await Transaction.countDocuments({ user: userId });

    if (txCount === 0) {
      const from = query.from ? new Date(query.from) : null;
      const to = query.to ? new Date(query.to) : null;
      const liabilities = await calculateServerLiabilities(userId, from, to, query.filterType);
      const fixedIncome = await calculateServerFixedIncome(userId, from, to, query.filterType, query.account, query.category);

      return {
        summary: { income: 0, expense: 0, settlements: 0, balance: 0 },
        liabilities,
        fixedIncome,
        monthly: [],
        weekly: [],
        categories: [],
        accounts: [],
        heatmap: Array.from({ length: 7 }, (_, day) => ({ day, amount: 0 })),
        transactions: [],
      };
    }

    if (txCount <= 500) {
      lifetimeDoc = (await rebuildUserAnalytics(userId)).toObject();
      monthlyDocs = await UserAnalyticsMonthly.find({ user: userId }).sort({ month: 1 }).lean();
      weeklyDocs = await UserAnalyticsWeekly.find({ user: userId }).sort({ startDate: -1 }).limit(12).lean();
    } else {
      // Large dataset (> 500 transactions):
      // Trigger non-blocking background rebuild and return initializationPending: true
      if (!lifetimeDoc?.isRebuilding) {
        setImmediate(() => {
          rebuildUserAnalytics(userId).catch((err) => {
            console.error('[ANALYTICS] Background rebuild error for user', userId, err.message);
          });
        });
      }

      return {
        initializationPending: true,
        summary: { income: 0, expense: 0, settlements: 0, balance: 0 },
        liabilities: { total: 0, debts: 0, bills: 0 },
        fixedIncome: 0,
        monthly: [],
        weekly: [],
        categories: [],
        accounts: [],
        heatmap: Array.from({ length: 7 }, (_, day) => ({ day, amount: 0 })),
        transactions: [],
      };
    }
  } else if (lifetimeDoc.isRebuilding) {
    return {
      initializationPending: true,
      summary: { income: 0, expense: 0, settlements: 0, balance: 0 },
      liabilities: { total: 0, debts: 0, bills: 0 },
      fixedIncome: 0,
      monthly: [],
      weekly: [],
      categories: [],
      accounts: [],
      heatmap: Array.from({ length: 7 }, (_, day) => ({ day, amount: 0 })),
      transactions: [],
    };
  } else if (lifetimeDoc.needsReconciliation && !lifetimeDoc.isRebuilding) {
    // Self-healing: trigger non-blocking background reconciliation and serve canonical data immediately
    setImmediate(() => {
      rebuildUserAnalytics(userId).catch((err) => {
        console.error('[ANALYTICS] Self-healing rebuild error for user', userId, err.message);
      });
    });
    const { getCanonicalAnalytics } = require('./analyticsService');
    return await getCanonicalAnalytics(userId, query);
  }

  // 3. Determine Time Scope & Query Data
  let summary = lifetimeDoc.summary || { income: 0, expense: 0, settlements: 0, balance: 0 };
  let heatmapArr = lifetimeDoc.heatmap || [0, 0, 0, 0, 0, 0, 0];
  let catTotals = lifetimeDoc.categoryTotals || {};
  let accTotals = lifetimeDoc.accountTotals || {};

  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;

  if (from && to) {
    // 3A. Check if this is a single tracking week query (e.g. "this_week", "last_week")
    const isWeekly = isMatchingWeeklyCycle(query.from, query.to, trackingStartDayWeekly);
    if (isWeekly) {
      const targetCycle = getWeeklyCycle(from, trackingStartDayWeekly);
      let targetWeekDoc = weeklyDocs.find((w) => w.weekKey === targetCycle.weekKey);
      if (!targetWeekDoc) {
        targetWeekDoc = await UserAnalyticsWeekly.findOne({ user: userId, weekKey: targetCycle.weekKey }).lean();
      }

      if (targetWeekDoc) {
        summary = targetWeekDoc.summary || summary;
        catTotals = targetWeekDoc.categoryTotals || {};
        accTotals = targetWeekDoc.accountTotals || {};
      } else {
        const hasTxs = await Transaction.exists({
          user: userObjectId,
          status: 'completed',
          date: { $gte: targetCycle.startDate, $lte: targetCycle.endDate },
        });
        if (hasTxs) {
          if (!lifetimeDoc?.isRebuilding) {
            setImmediate(() => { rebuildUserAnalytics(userId).catch(() => {}); });
          }
          const { getCanonicalAnalytics } = require('./analyticsService');
          return await getCanonicalAnalytics(userId, query);
        }
        summary = { income: 0, expense: 0, settlements: 0, balance: 0 };
        catTotals = {};
        accTotals = {};
      }
    } else {
      // 3B. Monthly or Multi-Month Scope
      const fromMonth = toYearMonth(from);
      const toMonth = toYearMonth(to);

      if (fromMonth === toMonth) {
        const targetMonthDoc = monthlyDocs.find((m) => m.month === fromMonth);
        if (targetMonthDoc) {
          summary = targetMonthDoc.summary || summary;
          heatmapArr = targetMonthDoc.heatmap || heatmapArr;
          catTotals = targetMonthDoc.categoryTotals || {};
          accTotals = targetMonthDoc.accountTotals || {};
        } else {
          const hasTxs = await Transaction.exists({
            user: userObjectId,
            status: 'completed',
            date: { $gte: from, $lte: to },
          });
          if (hasTxs) {
            if (!lifetimeDoc?.isRebuilding) {
              setImmediate(() => { rebuildUserAnalytics(userId).catch(() => {}); });
            }
            const { getCanonicalAnalytics } = require('./analyticsService');
            return await getCanonicalAnalytics(userId, query);
          }
          summary = { income: 0, expense: 0, settlements: 0, balance: 0 };
          heatmapArr = [0, 0, 0, 0, 0, 0, 0];
          catTotals = {};
          accTotals = {};
        }
      } else {
        const inRangeDocs = monthlyDocs.filter((m) => m.month >= fromMonth && m.month <= toMonth);
        if (inRangeDocs.length > 0) {
          summary = { income: 0, expense: 0, settlements: 0, balance: 0 };
          heatmapArr = [0, 0, 0, 0, 0, 0, 0];
          const combinedCats = {};
          const combinedAccs = {};

          for (const mDoc of inRangeDocs) {
            summary.income += mDoc.summary?.income || 0;
            summary.expense += mDoc.summary?.expense || 0;
            summary.settlements += mDoc.summary?.settlements || 0;
            if (mDoc.heatmap) {
              mDoc.heatmap.forEach((v, idx) => { heatmapArr[idx] += (v || 0); });
            }
            if (mDoc.categoryTotals) {
              for (const [cId, val] of Object.entries(mDoc.categoryTotals)) {
                if (!combinedCats[cId]) combinedCats[cId] = { amount: 0, count: 0 };
                combinedCats[cId].amount += val.amount || 0;
                combinedCats[cId].count += val.count || 0;
              }
            }
            if (mDoc.accountTotals) {
              for (const [aId, val] of Object.entries(mDoc.accountTotals)) {
                if (!combinedAccs[aId]) combinedAccs[aId] = { income: 0, expense: 0, settlements: 0 };
                combinedAccs[aId].income += val.income || 0;
                combinedAccs[aId].expense += val.expense || 0;
                combinedAccs[aId].settlements += val.settlements || 0;
              }
            }
          }
          summary.balance = summary.income - summary.expense + summary.settlements;
          catTotals = combinedCats;
          accTotals = combinedAccs;
        }
      }
    }
  }

  // 4. Format Monthly Chart Payload
  const monthly = monthlyDocs.map((m) => ({
    month: m.month,
    income: m.summary?.income || 0,
    expense: m.summary?.expense || 0,
  }));

  // 5. Format Weekly Chart Payload (Trailing 12 weeks, chronological)
  const weekly = (weeklyDocs || [])
    .slice()
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .map((w) => ({
      weekKey: w.weekKey,
      startDate: w.startDate,
      endDate: w.endDate,
      income: w.summary?.income || 0,
      expense: w.summary?.expense || 0,
      balance: w.summary?.balance || 0,
    }));

  // 6. Format Heatmap Payload
  const heatmap = Array.from({ length: 7 }, (_, day) => ({
    day,
    amount: heatmapArr[day] || 0,
  }));

  // 7. Format Top Categories Payload (Ranked descending, top 8)
  const categoryEntries = catTotals instanceof Map ? Array.from(catTotals.entries()) : Object.entries(catTotals);
  const categories = categoryEntries
    .filter(([catId, data]) => (data.amount || 0) > 0 && catMap.has(catId))
    .map(([catId, data]) => {
      const cat = catMap.get(catId) || {};
      return {
        amount: data.amount || 0,
        name: cat.name || 'Unknown',
        icon: cat.icon || 'Tag',
        color: cat.color || '#888888',
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  // 8. Format Top Accounts Payload (Ranked by net amount descending, top 8)
  const accountEntries = accTotals instanceof Map ? Array.from(accTotals.entries()) : Object.entries(accTotals);
  const accounts = accountEntries
    .filter(([accId]) => accMap.has(accId))
    .map(([accId, data]) => {
      const acc = accMap.get(accId) || {};
      const net = (data.income || 0) + (data.settlements || 0) - (data.expense || 0);
      return {
        amount: net,
        name: acc.name || 'Unknown',
        icon: acc.icon || 'Wallet',
        color: acc.color || '#3b82f6',
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const liabilities = await calculateServerLiabilities(userId, from, to, query.filterType);
  const fixedIncome = await calculateServerFixedIncome(userId, from, to, query.filterType, query.account, query.category);

  // 9. Return Exact Canonical API Contract (with liabilities and fixedIncome)
  return {
    summary,
    liabilities,
    fixedIncome,
    monthly,
    weekly,
    categories,
    accounts,
    heatmap,
    transactions: [],
  };
};

module.exports = {
  toYearMonth,
  computeTransactionDelta,
  applyTransactionDelta,
  applyTransactionUpdate,
  applyBulkTransactionDeltas,
  pruneZeroEntries,
  rebuildUserAnalytics,
  getUserAnalytics,
  calculateServerLiabilities,
  calculateServerFixedIncome,
  markReconciliationNeeded,
  hasAdHocFilter,
  round2,
};
