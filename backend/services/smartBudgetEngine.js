const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const SmartBudgetPlan = require('../models/SmartBudgetPlan');

const PRIORITY_WEIGHTS = {
  High: 1.4,
  Medium: 1.0,
  Low: 0.6
};

/**
 * Deterministically distributes the available budget across selected categories
 * based on historical spending and user priorities.
 * 
 * @param {string} userId - User ID
 * @param {number} availableBudget - Total amount to distribute
 * @param {Array<{categoryId: string, priority: string}>} categories - Selected categories and their priorities
 * @param {string} period - 'monthly' or 'weekly'
 * @returns {Promise<Array>} - Array of distributed allocations
 */
async function calculateDistribution(userId, availableBudget, categories, period, customStartDate, customEndDate) {
  if (!categories || categories.length === 0) return [];
  if (availableBudget <= 0) return categories.map(c => ({ category: c.categoryId, priority: c.priority, suggestedAmount: 0, historicalAverage: 0 }));

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

  // Fetch all transactions for the user in the last 6 months for the selected categories
  const categoryIds = categories.map(c => c.categoryId);
  const transactions = await Transaction.find({
    user: userId,
    category: { $in: categoryIds },
    type: 'expense',
    date: { $gte: sixMonthsAgo }
  }).sort({ date: 1 });

  const categoryAverages = {};
  let totalHistoricalAverage = 0;

  // Calculate historical average for each category
  categories.forEach(cat => {
    const catTxs = transactions.filter(tx => tx.category.toString() === cat.categoryId.toString());
    let avg = 0;
    let actualMonths = 0;
    
    if (catTxs.length > 0) {
      const totalSpent = catTxs.reduce((sum, tx) => sum + tx.amount, 0);
      const firstTxDate = new Date(catTxs[0].date);
      const now = new Date();
      
      const msInDay = 1000 * 60 * 60 * 24;
      let daysSpan = (now - firstTxDate) / msInDay;
      if (daysSpan < 30) daysSpan = 30; // Minimum 30 days to avoid skew

      actualMonths = Math.max(1, Math.round(daysSpan / 30.44));

      if (period === 'monthly') {
        const monthsSpan = daysSpan / 30.44;
        avg = totalSpent / monthsSpan;
      } else if (period === 'weekly') {
        const weeksSpan = daysSpan / 7;
        avg = totalSpent / weeksSpan;
      } else if (period === 'custom' && customStartDate && customEndDate) {
        const customDaysSpan = (new Date(customEndDate) - new Date(customStartDate)) / msInDay;
        const totalDaysSpan = Math.max(1, customDaysSpan);
        const dailyAvg = totalSpent / daysSpan;
        avg = dailyAvg * totalDaysSpan;
      }
    }
    
    categoryAverages[cat.categoryId] = {
      avg,
      basedOn: {
        months: actualMonths,
        transactions: catTxs.length
      }
    };
    totalHistoricalAverage += avg;
  });

  // Calculate weights
  let totalCombinedWeight = 0;
  const categoriesWithWeights = categories.map(cat => {
    const histData = categoryAverages[cat.categoryId];
    const histAvg = histData.avg;
    
    // If there is no history across ALL categories, fallback to equal historical weight (1.0)
    let histWeight = 1.0;
    if (totalHistoricalAverage > 0) {
      histWeight = histAvg / totalHistoricalAverage;
    }

    const prioWeight = PRIORITY_WEIGHTS[cat.priority] || 1.0;
    
    // If totalHistoricalAverage > 0 but this specific category has 0 history, 
    // give it a tiny base weight so it doesn't get 0 budget if it has High priority
    if (totalHistoricalAverage > 0 && histAvg === 0) {
      histWeight = 0.05; // 5% base weight for new categories to give them *something*
    }

    const combinedWeight = histWeight * prioWeight;
    totalCombinedWeight += combinedWeight;

    return {
      category: cat.categoryId,
      priority: cat.priority,
      historicalAverage: Math.round(histAvg),
      basedOn: histData.basedOn,
      weight: combinedWeight
    };
  });

  // Distribute the budget
  let distributedTotal = 0;
  const allocations = categoriesWithWeights.map(cat => {
    const normalizedWeight = totalCombinedWeight > 0 ? (cat.weight / totalCombinedWeight) : (1 / categories.length);
    const amount = Math.round(normalizedWeight * availableBudget);
    distributedTotal += amount;
    
    return {
      ...cat,
      suggestedAmount: amount,
      normalizedWeight
    };
  });

  // Fix rounding errors to ensure exact match with availableBudget
  const difference = availableBudget - distributedTotal;
  if (difference !== 0) {
    // Find category with the highest weight to absorb the difference
    let highestWeightCat = allocations[0];
    for (let i = 1; i < allocations.length; i++) {
      if (allocations[i].normalizedWeight > highestWeightCat.normalizedWeight) {
        highestWeightCat = allocations[i];
      }
    }
    highestWeightCat.suggestedAmount += difference;
  }

  // Clean up output array
  return allocations.map(a => ({
    category: a.category,
    priority: a.priority,
    suggestedAmount: Math.max(0, a.suggestedAmount),
    historicalAverage: a.historicalAverage,
    basedOn: a.basedOn
  }));
}

/**
 * Confirms a draft plan and creates/updates real Budgets
 * @param {string} planId - SmartBudgetPlan ID
 * @param {string} userId - User ID
 */
async function confirmPlanToBudgets(planId, userId) {
  const plan = await SmartBudgetPlan.findOne({ _id: planId, user: userId });
  if (!plan) throw new Error('Plan not found');
  if (plan.status === 'confirmed') throw new Error('Plan already confirmed');

  const { getBudgetPeriodDates } = require('./budgetEngine');
  
  // We need user preferences for getBudgetPeriodDates
  const User = require('../models/User');
  const user = await User.findById(userId);
  const prefs = user.preferences || {};

  // For each category in the plan, upsert a Budget
  for (const item of plan.categories) {
    const existingBudget = await Budget.findOne({
      user: userId,
      category: item.category,
      period: plan.period
    });

    if (existingBudget) {
      existingBudget.amount = item.suggestedAmount;
      existingBudget.isActive = true; // ensure it's active
      existingBudget.isRecurring = plan.isRecurring;
      existingBudget.smartBudgetPlan = plan._id;
      await existingBudget.save();
    } else {
      const newBudget = new Budget({
        user: userId,
        category: item.category,
        amount: item.suggestedAmount,
        period: plan.period,
        startDate: plan.startDate,
        endDate: plan.endDate,
        isActive: true,
        carryOver: false,
        isRecurring: plan.isRecurring,
        smartBudgetPlan: plan._id
      });
      // Initialize notification state so it doesn't immediately fire incorrectly if it's mid-cycle
      const { startDate } = getBudgetPeriodDates(newBudget, prefs, new Date());
      newBudget.notificationState = {
        lastPeriodStart: startDate,
        notified50: false,
        notified75: false,
        notified90: false,
        notified100: false,
        notifiedExceeded: false
      };
      await newBudget.save();
    }
  }

  plan.status = 'confirmed';
  
  // Initialize notification state for the Master Budget if grouped
  if (plan.groupAsMaster) {
    const { startDate } = getBudgetPeriodDates(plan, prefs, new Date());
    plan.notificationState = {
      lastPeriodStart: startDate,
      notified50: false,
      notified75: false,
      notified90: false,
      notified100: false,
      notifiedExceeded: false
    };
  }
  
  await plan.save();

  return plan;
}

module.exports = {
  calculateDistribution,
  confirmPlanToBudgets
};
