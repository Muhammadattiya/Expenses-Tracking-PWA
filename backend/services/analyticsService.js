const Transaction = require('../models/Transaction');

const getAnalytics = async (userId, query) => {
  const filter = { user: userId };
  if (query.from || query.to) filter.date = { ...(query.from && { $gte: new Date(query.from) }), ...(query.to && { $lte: new Date(query.to) }) };
  if (query.search) filter.title = { $regex: query.search, $options: 'i' };
  if (query.account) filter.account = query.account;
  if (query.category) filter.category = query.category;
  const transactions = await Transaction.find(filter).populate('category account').sort({ date: 1 }).lean();
  const summary = { income: 0, expense: 0, settlements: 0 };
  const buckets = new Map(); const categories = new Map(); const accounts = new Map(); const heatmap = Array.from({ length: 7 }, (_, day) => ({ day, amount: 0 }));
  for (const transaction of transactions) {
    if (transaction.type === 'income') summary.income += transaction.amount;
    if (transaction.type === 'expense') summary.expense += transaction.amount;
    if (transaction.type === 'settlement') summary.settlements += transaction.amount;
    const month = transaction.date.toISOString().slice(0, 7); const bucket = buckets.get(month) || { month, income: 0, expense: 0 };
    if (transaction.type === 'income') bucket.income += transaction.amount; if (transaction.type === 'expense') bucket.expense += transaction.amount; buckets.set(month, bucket);
    if (transaction.type === 'expense' && transaction.category) categories.set(transaction.category.name, (categories.get(transaction.category.name) || 0) + transaction.amount);
    if (transaction.account) accounts.set(transaction.account.name, (accounts.get(transaction.account.name) || 0) + (transaction.type === 'expense' ? -transaction.amount : transaction.amount));
    if (transaction.type === 'expense') heatmap[transaction.date.getDay()].amount += transaction.amount;
  }
  const top = (map) => [...map.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 8);
  return { summary: { ...summary, balance: summary.income - summary.expense + summary.settlements }, monthly: [...buckets.values()], categories: top(categories), accounts: top(accounts), heatmap, transactions };
};
module.exports = { getAnalytics };
