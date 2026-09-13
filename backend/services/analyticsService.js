const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Account = require('../models/Account');
const { getUserAnalytics, rebuildUserAnalytics, round2 } = require('./analyticsEngine');

/**
 * Production Analytics endpoint.
 * Serves precomputed persistent analytics with O(1) / bounded reads.
 * NEVER performs a lifetime Transaction.find() scan during normal operations.
 */
const getAnalytics = async (userId, query = {}) => {
  return await getUserAnalytics(userId, query);
};

/**
 * Canonical direct aggregation calculator.
 * Strictly used for reconciliation verification and test suites to prove mathematical identity:
 * Canonical Aggregation(Transactions) === Materialized Precomputed State.
 */
const getCanonicalAnalytics = async (userId, query = {}) => {
  const filter = { user: userId, $or: [{ status: 'completed' }, { status: { $exists: false } }] };
  if (query.from || query.to) {
    filter.date = { 
      ...(query.from && { $gte: new Date(query.from) }), 
      ...(query.to && { $lte: new Date(query.to) }) 
    };
  }

  const aggFilter = { user: new mongoose.Types.ObjectId(userId), $or: [{ status: 'completed' }, { status: { $exists: false } }] };
  if (filter.date) aggFilter.date = filter.date;
  if (query.search) {
    const escapedSearch = String(query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    aggFilter.title = { $regex: escapedSearch.slice(0, 100), $options: 'i' };
  }
  if (query.account) {
    const accountId = new mongoose.Types.ObjectId(query.account);
    aggFilter.$or = [{ account: accountId }, { from_account: accountId }, { to_account: accountId }];
  }
  if (query.category) {
    aggFilter.category = new mongoose.Types.ObjectId(query.category);
  }

  const allCategories = await Category.find({ user: userId }).select('name icon color').lean();
  const allAccounts = await Account.find({ user: userId }).select('name icon color').lean();
  const allCatMap = new Map(allCategories.map(c => [c._id.toString(), c]));
  const allAccMap = new Map(allAccounts.map(a => [a._id.toString(), a]));
  const validCategoryIds = allCategories.map(c => c._id);
  const validAccountIds = allAccounts.map(a => a._id);

  const [metrics] = await Transaction.aggregate([
    { $match: aggFilter },
    {
      $facet: {
        summary: [
          { $group: { _id: '$type', total: { $sum: '$amount' } } }
        ],
        monthly: [
          { $group: {
              _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
              income: { $sum: { $cond: [ { $eq: ['$type', 'income'] }, '$amount', 0 ] } },
              expense: { $sum: { $cond: [ { $eq: ['$type', 'expense'] }, '$amount', 0 ] } }
          }},
          { $sort: { _id: 1 } }
        ],
        heatmap: [
          { $match: { type: 'expense' } },
          { $group: {
              _id: { $dayOfWeek: "$date" },
              amount: { $sum: '$amount' }
          }}
        ],
        categories: [
          { $match: { type: 'expense', category: { $in: validCategoryIds } } },
          { $group: { _id: '$category', amount: { $sum: '$amount' } } },
          { $sort: { amount: -1 } },
          { $limit: 8 }
        ],
        accounts: [
          { $match: { account: { $in: validAccountIds } } },
          { $group: {
              _id: '$account',
              amount: { $sum: { $cond: [ { $eq: ['$type', 'expense'] }, { $multiply: ['$amount', -1] }, '$amount' ] } }
          }},
          { $sort: { amount: -1 } },
          { $limit: 8 }
        ]
      }
    }
  ]);

  const summary = { income: 0, expense: 0, settlements: 0, balance: 0 };
  if (metrics && metrics.summary) {
    for (const item of metrics.summary) {
      if (item._id === 'income') summary.income = round2(item.total);
      if (item._id === 'expense') summary.expense = round2(item.total);
      if (item._id === 'settlement') summary.settlements = round2(item.total);
    }
  }
  summary.balance = round2(summary.income - summary.expense + summary.settlements);

  const monthly = (metrics && metrics.monthly) ? metrics.monthly.map(m => ({
    month: m._id,
    income: m.income,
    expense: m.expense
  })) : [];

  const heatmap = Array.from({ length: 7 }, (_, day) => ({ day, amount: 0 }));
  if (metrics && metrics.heatmap) {
    for (const item of metrics.heatmap) {
      const dayIndex = item._id - 1;
      if (dayIndex >= 0 && dayIndex < 7) heatmap[dayIndex].amount = item.amount;
    }
  }

  const categories = (metrics && metrics.categories) ? metrics.categories.map(c => {
    const cat = allCatMap.get(c._id.toString()) || {};
    return { amount: c.amount, name: cat.name, icon: cat.icon, color: cat.color };
  }) : [];

  const accounts = (metrics && metrics.accounts) ? metrics.accounts.map(a => {
    const acc = allAccMap.get(a._id.toString()) || {};
    return { amount: a.amount, name: acc.name, icon: acc.icon, color: acc.color };
  }) : [];

  const { calculateServerLiabilities, calculateServerFixedIncome } = require('./analyticsEngine');

  const liabilities = await calculateServerLiabilities(userId, query.from, query.to, query.filterType);
  const fixedIncome = await calculateServerFixedIncome(userId, query.from, query.to, query.filterType, query.account, query.category);

  return { summary, liabilities, fixedIncome, monthly, weekly: [], categories, accounts, heatmap, transactions: [] };
};

module.exports = {
  getAnalytics,
  getCanonicalAnalytics,
  rebuildUserAnalytics,
};
