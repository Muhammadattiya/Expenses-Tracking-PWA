const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

/** Helper to calculate percent change */
const calcChange = (current, previous) => {
  const changeAmount = current - previous;
  let changePercent = 0;
  if (previous > 0) {
    changePercent = (changeAmount / previous) * 100;
  } else if (current > 0) {
    changePercent = 100; // If previous was 0 and current is > 0, consider it a 100% increase (or technically infinite, but we bound it).
  } else if (current < 0) {
    changePercent = -100;
  }
  return {
    changeAmount: Number(changeAmount.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    direction: changeAmount > 0 ? 'increase' : (changeAmount < 0 ? 'decrease' : 'stable')
  };
};

const buildBaseMatch = (userId, from, to, categoryId, accountId) => {
  const match = { user: new mongoose.Types.ObjectId(userId) };
  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = new Date(from);
    if (to) match.date.$lte = new Date(to);
  }
  if (categoryId) match.category = new mongoose.Types.ObjectId(categoryId);
  if (accountId) match.account = new mongoose.Types.ObjectId(accountId);
  return match;
};

const comparePeriods = async (userId, params) => {
  const { currentFrom, currentTo, previousFrom, previousTo, categoryId, accountId } = params;
  
  const currentMatch = buildBaseMatch(userId, currentFrom, currentTo, categoryId, accountId);
  const previousMatch = buildBaseMatch(userId, previousFrom, previousTo, categoryId, accountId);

  const pipeline = [
    {
      $facet: {
        current: [
          { $match: currentMatch },
          { $group: {
            _id: null,
            income: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
            expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } }
          }}
        ],
        previous: [
          { $match: previousMatch },
          { $group: {
            _id: null,
            income: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
            expense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } }
          }}
        ]
      }
    }
  ];

  const [result] = await Transaction.aggregate(pipeline);
  
  const current = result.current[0] || { income: 0, expense: 0 };
  const previous = result.previous[0] || { income: 0, expense: 0 };
  
  const currentNet = current.income - current.expense;
  const previousNet = previous.income - previous.expense;

  return {
    current: { income: current.income, expense: current.expense, net: currentNet },
    previous: { income: previous.income, expense: previous.expense, net: previousNet },
    change: {
      ...calcChange(current.expense, previous.expense)
    }
  };
};

const spendingByCategory = async (userId, params) => {
  const { from, to, accountId, limit = 5 } = params;
  
  const match = buildBaseMatch(userId, from, to, null, accountId);
  match.type = 'expense';
  match.category = { $exists: true, $ne: null };

  const pipeline = [
    { $match: match },
    { $group: { _id: "$category", amount: { $sum: "$amount" } } },
    { $sort: { amount: -1 } },
    { $limit: parseInt(limit, 10) },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'catDetails' } },
    { $unwind: "$catDetails" },
    { $project: { _id: 0, name: "$catDetails.name", amount: 1 } }
  ];

  const categories = await Transaction.aggregate(pipeline);
  return { categories };
};

const spendingTrend = async (userId, params) => {
  const { from, to, groupBy = 'month', categoryId, accountId } = params;
  
  const match = buildBaseMatch(userId, from, to, categoryId, accountId);
  match.type = 'expense';

  const formatString = groupBy === 'week' ? "%Y-W%V" : "%Y-%m";

  const pipeline = [
    { $match: match },
    { $group: { 
      _id: { $dateToString: { format: formatString, date: "$date" } },
      amount: { $sum: "$amount" }
    }},
    { $sort: { _id: 1 } },
    { $project: { _id: 0, period: "$_id", amount: 1 } }
  ];

  const periods = await Transaction.aggregate(pipeline);
  
  if (periods.length < 2) {
    return { trend: "insufficient_data", changePercent: 0, periods };
  }

  const first = periods[0].amount;
  const last = periods[periods.length - 1].amount;
  const change = calcChange(last, first);

  return {
    trend: change.direction,
    changePercent: change.changePercent,
    periods
  };
};

const categoryComparison = async (userId, params) => {
  const { currentFrom, currentTo, previousFrom, previousTo, limit = 5 } = params;
  
  const currentMatch = buildBaseMatch(userId, currentFrom, currentTo);
  currentMatch.type = 'expense';
  currentMatch.category = { $exists: true, $ne: null };

  const previousMatch = buildBaseMatch(userId, previousFrom, previousTo);
  previousMatch.type = 'expense';
  previousMatch.category = { $exists: true, $ne: null };

  const pipeline = [
    {
      $facet: {
        current: [
          { $match: currentMatch },
          { $group: { _id: "$category", amount: { $sum: "$amount" } } }
        ],
        previous: [
          { $match: previousMatch },
          { $group: { _id: "$category", amount: { $sum: "$amount" } } }
        ]
      }
    }
  ];

  const [result] = await Transaction.aggregate(pipeline);
  
  const categoryMap = new Map();
  
  for (const c of result.previous) {
    categoryMap.set(c._id.toString(), { id: c._id, previous: c.amount, current: 0 });
  }
  for (const c of result.current) {
    const strId = c._id.toString();
    if (categoryMap.has(strId)) {
      categoryMap.get(strId).current = c.amount;
    } else {
      categoryMap.set(strId, { id: c._id, previous: 0, current: c.amount });
    }
  }

  let changes = [];
  for (const data of categoryMap.values()) {
    const chg = calcChange(data.current, data.previous);
    changes.push({
      categoryId: data.id,
      current: data.current,
      previous: data.previous,
      changeAmount: chg.changeAmount,
      changePercent: chg.changePercent
    });
  }

  // Sort by absolute change amount descending
  changes.sort((a, b) => Math.abs(b.changeAmount) - Math.abs(a.changeAmount));
  changes = changes.slice(0, parseInt(limit, 10));

  // Populate names manually to avoid complex lookup in JS
  const Category = mongoose.model('Category');
  const catIds = changes.map(c => c.categoryId);
  const categories = await Category.find({ _id: { $in: catIds } }).select('name').lean();
  const nameMap = new Map(categories.map(c => [c._id.toString(), c.name]));

  changes = changes.map(c => {
    const res = { name: nameMap.get(c.categoryId.toString()) || "Unknown", ...c };
    delete res.categoryId;
    return res;
  });

  const largestIncrease = changes.filter(c => c.changeAmount > 0).sort((a, b) => b.changeAmount - a.changeAmount)[0] || null;

  return {
    changes,
    largestIncrease: largestIncrease ? { name: largestIncrease.name, changeAmount: largestIncrease.changeAmount, changePercent: largestIncrease.changePercent } : null
  };
};

module.exports = {
  comparePeriods,
  spendingByCategory,
  spendingTrend,
  categoryComparison
};
