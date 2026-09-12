const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const SmartBudgetPlan = require('../models/SmartBudgetPlan');

/**
 * Calculates a recommended budget amount for a specific category
 * based on past transactions. Purely mathematical, no AI used.
 * @param {string} userId - The user's ID
 * @param {string} categoryId - The category ID
 * @param {string} period - 'weekly' or 'monthly'
 * @returns {Promise<number>} - The recommended amount
 */
async function calculateRecommendation(userId, categoryId, period) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

  // Get all expenses for this user and category in the last 6 months
  const transactions = await Transaction.find({
    user: userId,
    category: categoryId,
    type: 'expense',
    date: { $gte: sixMonthsAgo }
  }).sort({ date: 1 }); // Sort oldest first to easily find the first transaction

  if (!transactions || transactions.length === 0) {
    return {
      amount: 0,
      basedOn: { months: 0, transactions: 0 }
    };
  }

  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  
  const firstTxDate = new Date(transactions[0].date);
  const now = new Date();
  
  // Calculate difference in days between the first transaction and now
  const msInDay = 1000 * 60 * 60 * 24;
  let daysSpan = (now - firstTxDate) / msInDay;
  
  // Assume a minimum of 30 days (1 month) to prevent skewed averages for very new categories
  if (daysSpan < 30) {
    daysSpan = 30;
  }

  let recommended = 0;

  if (period === 'monthly') {
    const monthsSpan = daysSpan / 30.44; // Average days in a month
    recommended = totalSpent / monthsSpan;
  } else if (period === 'weekly') {
    const weeksSpan = daysSpan / 7;
    recommended = totalSpent / weeksSpan;
  }

  // Round to the nearest 10 for a cleaner budget number (e.g. 453 -> 450, 458 -> 460)
  if (recommended > 0) {
    recommended = Math.round(recommended / 10) * 10;
    // If it rounded down to 0 but they spent something, give at least 10
    if (recommended === 0 && totalSpent > 0) recommended = 10;
  }

  const actualMonths = Math.max(1, Math.round(daysSpan / 30.44));

  return {
    amount: recommended,
    basedOn: {
      months: actualMonths,
      transactions: transactions.length
    }
  };
}

function getBudgetPeriodDates(budget, userPrefs, now = new Date()) {
  const period = budget.period || 'monthly';
  let startDate = new Date(now);
  let endDate = new Date(now);

  if (period === 'custom' && budget.startDate && budget.endDate) {
    return { startDate: new Date(budget.startDate), endDate: new Date(budget.endDate) };
  } else if (period === 'monthly') {
    const prefMonthStart = userPrefs.trackingStartDayMonthly || 1;
    const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const actualMonthStartDay = Math.min(prefMonthStart, lastDayOfCurrentMonth);

    if (now.getDate() < actualMonthStartDay) {
      const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(prefMonthStart, lastDayOfPrevMonth));
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), actualMonthStartDay);
    }
    
    startDate.setHours(0, 0, 0, 0);

    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === 'weekly') {
    // weekly
    const prefWeekStart = userPrefs.trackingStartDayWeekly !== undefined ? userPrefs.trackingStartDayWeekly : 6;
    let day = now.getDay();
    let diff = day >= prefWeekStart ? day - prefWeekStart : 7 - (prefWeekStart - day);
    
    startDate.setDate(now.getDate() - diff);
    startDate.setHours(0, 0, 0, 0);
    
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  }
  return { startDate, endDate };
}

async function syncBudgetPeriods(userId) {
  const { sendPushNotification } = require('./cronJobs');
  const user = await User.findById(userId).lean();
  if (!user) return;
  const now = new Date();
  const subs = await Subscription.find({ user: userId });

  let newCycles = [];

  // 1. Normal budgets
  const activeBudgets = await Budget.find({ user: userId, isActive: true });
  for (let budget of activeBudgets) {
    let { startDate, endDate } = getBudgetPeriodDates(budget, user.preferences || {}, now);
    let needsReset = false;
    let isNewCycle = false;

    if (budget.period === 'custom') {
      if (now > endDate) {
        if (budget.isRecurring) {
          const duration = endDate.getTime() - budget.startDate.getTime();
          if (duration > 0) {
            let newStart = new Date(budget.startDate);
            let newEnd = new Date(endDate);
            while (now > newEnd) {
              newStart = new Date(newStart.getTime() + duration);
              newEnd = new Date(newEnd.getTime() + duration);
            }
            startDate = newStart;
            endDate = newEnd;
            needsReset = true;
            isNewCycle = true;
          } else {
            await Budget.updateOne({ _id: budget._id }, { $set: { isActive: false } });
            continue;
          }
        } else {
          await Budget.updateOne({ _id: budget._id }, { $set: { isActive: false } });
          continue;
        }
      }
    } else {
      const lastStart = budget.notificationState?.lastPeriodStart;
      const isPastPeriod = budget.endDate && now > new Date(budget.endDate);
      const periodChanged = !lastStart || new Date(lastStart).getTime() !== startDate.getTime();
      const dateMismatch = !budget.startDate || new Date(budget.startDate).getTime() !== startDate.getTime();

      if (isPastPeriod || periodChanged || dateMismatch) {
        if (lastStart && budget.isRecurring === false) {
          await Budget.updateOne({ _id: budget._id }, { $set: { isActive: false } });
          continue;
        }
        needsReset = true;
        if (lastStart || isPastPeriod) isNewCycle = true;
      }
    }

    if (needsReset || budget.spent === undefined) {
      const query = {
        user: userId,
        category: budget.category._id || budget.category,
        type: 'expense',
        date: { $gte: startDate, $lte: endDate }
      };
      if (budget.account) {
        query.$or = [{ account: budget.account }, { from_account: budget.account }];
      }
      
      const txs = await Transaction.find(query);
      const spent = txs.reduce((sum, tx) => sum + tx.amount, 0);

      const setFields = {
        startDate,
        endDate,
        spent,
        'notificationState.lastPeriodStart': startDate,
        'notificationState.notified50': false,
        'notificationState.notified75': false,
        'notificationState.notified90': false,
        'notificationState.notified100': false,
        'notificationState.notifiedExceeded': false
      };

      await Budget.updateOne({
        _id: budget._id,
        $or: [
          { startDate: { $ne: startDate } },
          { endDate: { $ne: endDate } },
          { spent: { $exists: false } }
        ]
      }, { $set: setFields });
      
      if (isNewCycle) {
        const cat = await require('../models/Category').findById(budget.category);
        newCycles.push(cat ? cat.name : 'Budget');
      }
    }
  }

  // 2. Master budgets
  const masterBudgets = await SmartBudgetPlan.find({ user: userId, status: 'confirmed', groupAsMaster: true });
  for (let mBudget of masterBudgets) {
    let { startDate, endDate } = getBudgetPeriodDates(mBudget, user.preferences || {}, now);
    let needsReset = false;
    let isNewCycle = false;

    if (mBudget.period === 'custom') {
      if (now > endDate) {
        if (mBudget.isRecurring) {
          const duration = endDate.getTime() - mBudget.startDate.getTime();
          if (duration > 0) {
            let newStart = new Date(mBudget.startDate);
            let newEnd = new Date(endDate);
            while (now > newEnd) {
              newStart = new Date(newStart.getTime() + duration);
              newEnd = new Date(newEnd.getTime() + duration);
            }
            startDate = newStart;
            endDate = newEnd;
            needsReset = true;
            isNewCycle = true;
          }
        }
      }
    } else {
      const lastStart = mBudget.notificationState?.lastPeriodStart;
      const isPastPeriod = mBudget.endDate && now > new Date(mBudget.endDate);
      const periodChanged = !lastStart || new Date(lastStart).getTime() !== startDate.getTime();
      const dateMismatch = !mBudget.startDate || new Date(mBudget.startDate).getTime() !== startDate.getTime();

      if (isPastPeriod || periodChanged || dateMismatch) {
        needsReset = true;
        if (lastStart || isPastPeriod) isNewCycle = true;
      }
    }

    if (needsReset || mBudget.spent === undefined) {
      const categoryIds = mBudget.categories.map(c => c.category);
      const query = {
        user: userId,
        category: { $in: categoryIds },
        type: 'expense',
        date: { $gte: startDate, $lte: endDate }
      };
      
      const txs = await Transaction.find(query);
      const spent = txs.reduce((sum, tx) => sum + tx.amount, 0);

      const setFields = {
        startDate,
        endDate,
        spent,
        'notificationState.lastPeriodStart': startDate,
        'notificationState.notified50': false,
        'notificationState.notified75': false,
        'notificationState.notified90': false,
        'notificationState.notified100': false,
        'notificationState.notifiedExceeded': false
      };

      await SmartBudgetPlan.updateOne({
        _id: mBudget._id,
        $or: [
          { startDate: { $ne: startDate } },
          { endDate: { $ne: endDate } },
          { spent: { $exists: false } }
        ]
      }, { $set: setFields });
      
      if (isNewCycle) {
        newCycles.push(mBudget.name || 'Master Budget');
      }
    }
  }

  if (newCycles.length > 0 && subs && subs.length > 0) {
    let title = 'New Budget Cycle';
    let body = newCycles.length === 1 
      ? `A new cycle has started for your ${newCycles[0]} budget.` 
      : `A new cycle has started for ${newCycles.length} of your budgets.`;
    
    const payload = JSON.stringify({ title, body, icon: '/icon-192x192.png', badge: '/icon-192x192.png', url: '/budgets' });
    for (let sub of subs) {
      await sendPushNotification(sub, payload, null);
    }
  }
}

async function checkBudgetThresholds(userId, stats = null) {
  const { sendPushNotification } = require('./cronJobs');
  const user = await User.findById(userId);
  if (!user) return;

  const budgets = await Budget.find({ user: userId, isActive: true }).populate('category');
  if (stats && budgets) {
    stats.budgetsChecked += budgets.length;
  }

  const masterBudgets = await SmartBudgetPlan.find({ user: userId, status: 'confirmed', groupAsMaster: true });
  
  if ((!budgets || budgets.length === 0) && (!masterBudgets || masterBudgets.length === 0)) {
    return;
  }

  const subs = await Subscription.find({ user: userId });
  const notificationsToGroup = [];

  for (let budget of budgets) {
    const spent = budget.spent || 0;
    const pct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    
    let targetThreshold = null;
    let exceedAmount = 0;

    if (spent > budget.amount) {
      targetThreshold = 'exceeded';
      exceedAmount = spent - budget.amount;
    } else if (pct >= 100) {
      targetThreshold = 100;
    } else if (pct >= 90) {
      targetThreshold = 90;
    } else if (pct >= 75) {
      targetThreshold = 75;
    } else if (pct >= 50) {
      targetThreshold = 50;
    }

    if (targetThreshold) {
      const thresholdKey = targetThreshold === 'exceeded' ? 'notifiedExceeded' : `notified${targetThreshold}`;
      if (budget.notificationState && budget.notificationState[thresholdKey] === false) {
        const setFields = {};
        if (targetThreshold === 'exceeded') {
          setFields['notificationState.notifiedExceeded'] = true;
          setFields['notificationState.notified100'] = true;
          setFields['notificationState.notified90'] = true;
          setFields['notificationState.notified75'] = true;
          setFields['notificationState.notified50'] = true;
        } else if (targetThreshold === 100) {
          setFields['notificationState.notified100'] = true;
          setFields['notificationState.notified90'] = true;
          setFields['notificationState.notified75'] = true;
          setFields['notificationState.notified50'] = true;
        } else if (targetThreshold === 90) {
          setFields['notificationState.notified90'] = true;
          setFields['notificationState.notified75'] = true;
          setFields['notificationState.notified50'] = true;
        } else if (targetThreshold === 75) {
          setFields['notificationState.notified75'] = true;
          setFields['notificationState.notified50'] = true;
        } else if (targetThreshold === 50) {
          setFields['notificationState.notified50'] = true;
        }

        const updateResult = await Budget.findOneAndUpdate(
          { _id: budget._id, [`notificationState.${thresholdKey}`]: false },
          { $set: setFields },
          { new: true }
        );

        if (updateResult) {
          notificationsToGroup.push({
            categoryName: budget.category?.name || 'Budget',
            threshold: targetThreshold,
            exceedAmount
          });
        }
      }
    }
  }

  for (let mBudget of masterBudgets) {
    const spent = mBudget.spent || 0;
    const limit = mBudget.availableBudget;
    const pct = limit > 0 ? (spent / limit) * 100 : 0;
    
    let targetThreshold = null;
    let exceedAmount = 0;

    if (spent > limit) {
      targetThreshold = 'exceeded';
      exceedAmount = spent - limit;
    } else if (pct >= 100) {
      targetThreshold = 100;
    } else if (pct >= 90) {
      targetThreshold = 90;
    } else if (pct >= 75) {
      targetThreshold = 75;
    } else if (pct >= 50) {
      targetThreshold = 50;
    }

    if (targetThreshold) {
      const thresholdKey = targetThreshold === 'exceeded' ? 'notifiedExceeded' : `notified${targetThreshold}`;
      if (mBudget.notificationState && mBudget.notificationState[thresholdKey] === false) {
        const setFields = {};
        if (targetThreshold === 'exceeded') {
          setFields['notificationState.notifiedExceeded'] = true;
          setFields['notificationState.notified100'] = true;
          setFields['notificationState.notified90'] = true;
          setFields['notificationState.notified75'] = true;
          setFields['notificationState.notified50'] = true;
        } else if (targetThreshold === 100) {
          setFields['notificationState.notified100'] = true;
          setFields['notificationState.notified90'] = true;
          setFields['notificationState.notified75'] = true;
          setFields['notificationState.notified50'] = true;
        } else if (targetThreshold === 90) {
          setFields['notificationState.notified90'] = true;
          setFields['notificationState.notified75'] = true;
          setFields['notificationState.notified50'] = true;
        } else if (targetThreshold === 75) {
          setFields['notificationState.notified75'] = true;
          setFields['notificationState.notified50'] = true;
        } else if (targetThreshold === 50) {
          setFields['notificationState.notified50'] = true;
        }

        const updateResult = await SmartBudgetPlan.findOneAndUpdate(
          { _id: mBudget._id, [`notificationState.${thresholdKey}`]: false },
          { $set: setFields },
          { new: true }
        );

        if (updateResult) {
          notificationsToGroup.push({
            categoryName: mBudget.name || 'Master Budget',
            threshold: targetThreshold,
            exceedAmount
          });
        }
      }
    }
  }

  if (notificationsToGroup.length === 0 || !subs || subs.length === 0) return;

  let title = 'Budget Alert';
  let body = '';

  if (notificationsToGroup.length === 1) {
    const notif = notificationsToGroup[0];
    if (notif.threshold === 'exceeded') {
      body = `You've exceeded your ${notif.categoryName} budget by EGP ${notif.exceedAmount}.`;
    } else {
      body = `You've reached ${notif.threshold}% of your ${notif.categoryName} budget.`;
    }
  } else {
    body = `You have ${notificationsToGroup.length} budgets that need your attention.`;
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    url: '/budgets'
  });

  for (let sub of subs) {
    await sendPushNotification(sub, payload, stats);
  }
}

module.exports = {
  calculateRecommendation,
  checkBudgetThresholds,
  getBudgetPeriodDates,
  syncBudgetPeriods
};

