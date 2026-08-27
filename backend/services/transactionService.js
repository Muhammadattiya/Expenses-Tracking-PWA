const Transaction = require("../models/Transaction");
const Account = require("../models/Account");
const Category = require("../models/Category");
const AppError = require('../utils/AppError');
const { checkBudgetThresholds } = require("./budgetEngine");
const { adoptLegacyData } = require('./legacyDataService');

const POPULATE_TRANSACTION_REFERENCES = [
  { path: 'account', select: 'name type icon color' },
  { path: 'category', select: 'name type icon color' },
  { path: 'from_account', select: 'name type icon color' },
  { path: 'to_account', select: 'name type icon color' },
  { path: 'investment', select: 'name type symbol' },
];

const getTransactions = async (userId) => {
  return Transaction.find({ user: userId })
    // Preserve the legacy endpoint's complete populated document shape.
    .populate('account')
    .populate('category')
    .populate('from_account')
    .populate('to_account')
    .sort({ date: -1, createdAt: -1 })
    .lean();
};

const decodeCursor = (cursor) => {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    const date = new Date(decoded.date);

    if (!decoded.id || !Transaction.db.base.Types.ObjectId.isValid(decoded.id) || Number.isNaN(date.getTime())) {
      throw new Error('Invalid cursor');
    }

    return { date, id: decoded.id };
  } catch {
    throw new AppError('Invalid transaction cursor.', 400);
  }
};

const encodeCursor = (transaction) => Buffer.from(JSON.stringify({
  date: transaction.date.toISOString(),
  id: transaction._id.toString(),
})).toString('base64url');

const normalizeLimit = (limit) => {
  if (limit === undefined) return 50;
  if (!/^\d+$/.test(String(limit))) throw new AppError('Transaction limit must be a positive integer.', 400);
  const parsed = Number(limit);
  if (parsed < 1 || parsed > 100) throw new AppError('Transaction limit must be between 1 and 100.', 400);
  return parsed;
};

const requireObjectId = (value, field) => {
  if (!Transaction.db.base.Types.ObjectId.isValid(value)) {
    throw new AppError(`Invalid ${field} filter.`, 400);
  }
  return value;
};

const parseDate = (value, field) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError(`Invalid ${field} date.`, 400);
  return date;
};

const buildTransactionFilter = (userId, query) => {
  const filter = { user: userId };
  const date = {};

  if (query.from) date.$gte = parseDate(query.from, 'from');
  if (query.to) date.$lte = parseDate(query.to, 'to');
  if (Object.keys(date).length) filter.date = date;
  if (query.type) {
    if (!['income', 'expense', 'transfer', 'settlement'].includes(query.type)) {
      throw new AppError('Invalid transaction type filter.', 400);
    }
    filter.type = query.type;
  }
  if (query.status) {
    if (!['completed', 'pending_review', 'needs_manual_review'].includes(query.status)) {
      throw new AppError('Invalid transaction status filter.', 400);
    }
    filter.status = query.status;
  }
  if (query.category) filter.category = requireObjectId(query.category, 'category');
  if (query.account) {
    const accountId = requireObjectId(query.account, 'account');
    filter.$or = [{ account: accountId }, { from_account: accountId }, { to_account: accountId }];
  }
  if (query.search) {
    const escapedSearch = String(query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.title = { $regex: escapedSearch.slice(0, 100), $options: 'i' };
  }

  return filter;
};

const getTransactionPage = async (userId, query = {}) => {
  const limit = normalizeLimit(query.limit);
  const filter = buildTransactionFilter(userId, query);

  if (query.cursor) {
    const { date, id } = decodeCursor(query.cursor);
    const cursorFilter = {
      $or: [
        { date: { $lt: date } },
        { date, _id: { $lt: id } },
      ],
    };
    filter.$and = [cursorFilter];
  }

  const results = await Transaction.find(filter)
    .populate(POPULATE_TRANSACTION_REFERENCES)
    .sort({ date: -1, _id: -1 })
    .limit(limit + 1)
    .lean();
  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, limit) : results;

  return {
    items,
    nextCursor: hasMore ? encodeCursor(items.at(-1)) : null,
  };
};

const validateReferences = async (userId, data) => {
  if (data.type === "transfer") {
    const fromAccount = await Account.findOne({ _id: data.from_account, user: userId });
    if (!fromAccount) throw new Error("Source account not found.");
    
    if (data.investment) {
      // Transfer to investment
      return;
    }

    const toAccount = await Account.findOne({ _id: data.to_account, user: userId });
    if (!toAccount) throw new Error("Destination account not found.");
    return;
  }

  if (data.type === 'settlement') {
    const account = await Account.findOne({ _id: data.account, user: userId });
    if (!account) throw new Error('Account not found.');
    return;
  }

  const [account, category] = await Promise.all([
    Account.findOne({ _id: data.account, user: userId }),
    Category.findOne({ _id: data.category, user: userId }),
  ]);
  if (!account) throw new Error("Account not found.");
  if (!category) throw new Error("Category not found.");
};

const createTransaction = async (userId, data) => {
  const normalizedData = { ...data };
  if (normalizedData.title !== undefined) {
    normalizedData.title = String(normalizedData.title).trim();
  }
  await validateReferences(userId, normalizedData);
  const transaction = await Transaction.create({ ...normalizedData, user: userId });

  const populated = await Transaction.findById(transaction._id)
    .populate("account")
    .populate("category")
    .populate("from_account")
    .populate("to_account");

  if (populated.type === 'expense') {
    checkBudgetThresholds(userId).catch(err => console.error('[ERROR] checkBudgetThresholds:', err));
  }
  
  const { checkPaydaySurvivalRisk } = require('./cronJobs');
  checkPaydaySurvivalRisk(userId).catch(err => console.error('[ERROR] checkPaydaySurvivalRisk:', err));

  return populated;
};

const updateTransaction = async (userId, id, data) => {
  const normalizedData = { ...data };
  if (normalizedData.title !== undefined) {
    normalizedData.title = String(normalizedData.title).trim();
  }
  await validateReferences(userId, normalizedData);
  const transaction = await Transaction.findOneAndUpdate({ _id: id, user: userId }, normalizedData, {
    new: true,
    runValidators: true,
  })
    .populate("account")
    .populate("category")
    .populate("from_account")
    .populate("to_account");

  if (!transaction) throw new Error("Transaction not found.");
  
  if (transaction.type === 'expense') {
    checkBudgetThresholds(userId).catch(err => console.error('[ERROR] checkBudgetThresholds:', err));
  }

  const { checkPaydaySurvivalRisk } = require('./cronJobs');
  checkPaydaySurvivalRisk(userId).catch(err => console.error('[ERROR] checkPaydaySurvivalRisk:', err));

  return transaction;
};

const deleteTransaction = async (userId, id) => {
  const transaction = await Transaction.findOne({ _id: id, user: userId });
  if (!transaction) {
    const err = new Error("Transaction not found.");
    err.statusCode = 404;
    throw err;
  }
  await Transaction.deleteOne({ _id: id, user: userId });
  
  if (transaction.type === 'expense') {
    checkBudgetThresholds(userId).catch(err => console.error('[ERROR] checkBudgetThresholds:', err));
  }

  const { checkPaydaySurvivalRisk } = require('./cronJobs');
  checkPaydaySurvivalRisk(userId).catch(err => console.error('[ERROR] checkPaydaySurvivalRisk:', err));
};

// ─── Import ────────────────────────────────────────────────────────────────────

const importTransactions = async (userId, backup) => {
  await adoptLegacyData(userId);

  // 1. Find the transactions array from whatever shape the backup is
  const transactions = Array.isArray(backup)
    ? backup
    : backup?.transactions || backup?.data?.transactions || backup?.data?.items
      || backup?.items || backup?.records
      || Object.values(backup || {}).find(Array.isArray);
  if (!Array.isArray(transactions)) {
    throw new Error('Invalid backup file: no transactions array was found.');
  }

  // 2. Build lookup maps from existing DB records
  const existingAccounts = await Account.find({ user: userId });
  const existingCategories = await Category.find({ user: userId });
  const accountByName = new Map(existingAccounts.map((a) => [a.name.trim().toLowerCase(), a]));
  const categoryByKey = new Map(existingCategories.map((c) => [`${c.type}:${c.name.trim().toLowerCase()}`, c]));
  let createdAccounts = 0;
  let createdCategories = 0;

  // Helper: extract a usable name string from various source fields
  const extractName = (...sources) => {
    for (const src of sources) {
      if (src == null) continue;
      const name = (typeof src === 'object' ? src.name : String(src)).trim();
      if (name) return name;
    }
    return null;
  };

  // Helper: find-or-create account by name
  const resolveAccount = async (name, typeHint = 'cash') => {
    if (!name) return null;
    const key = name.trim().toLowerCase();
    if (accountByName.has(key)) return accountByName.get(key);
    const accountType = ['cash', 'bank', 'wallet'].includes(typeHint) ? typeHint : 'cash';
    const account = await Account.create({ user: userId, name: name.trim(), type: accountType });
    accountByName.set(key, account);
    createdAccounts += 1;
    return account;
  };

  // Helper: find-or-create category by name + type
  const resolveCategory = async (name, type) => {
    if (!name) return null;
    const key = `${type}:${name.trim().toLowerCase()}`;
    if (categoryByKey.has(key)) return categoryByKey.get(key);
    const category = await Category.create({ user: userId, name: name.trim(), type });
    categoryByKey.set(key, category);
    createdCategories += 1;
    return category;
  };

  const normalizeType = (value) => {
    const t = String(value || '').trim().toLowerCase();
    if (['income', 'دخل', 'in'].includes(t)) return 'income';
    if (['expense', 'مصروف', 'out'].includes(t)) return 'expense';
    if (['transfer', 'تحويل'].includes(t)) return 'transfer';
    if (['settlement', 'تسوية', 'settle'].includes(t)) return 'settlement';
    return null;
  };

  const normalizeAmount = (value) =>
    Number(String(value ?? '').replace(/[,،\s]/g, '').replace(/[^0-9.\-]/g, ''));

  // 3. Pre-create accounts & categories listed in the backup metadata
  for (const acc of backup?.accounts || []) {
    const name = extractName(acc, acc?.name);
    if (name) await resolveAccount(name, acc?.type);
  }
  for (const cat of backup?.categories || []) {
    const catType = normalizeType(cat?.type);
    const name = extractName(cat, cat?.name);
    if (name && (catType === 'income' || catType === 'expense')) {
      await resolveCategory(name, catType);
    }
  }

  // 4. Process each transaction row
  const inserted = [];
  const skipped = [];

  for (const [index, source] of transactions.entries()) {
    try {
      const type = normalizeType(
        source?.type || source?.transactionType || source?.transaction_type || source?.kind
      );
      const amount = normalizeAmount(
        source?.amount ?? source?.amountEGP ?? source?.amount_egp ?? source?.value ?? source?.total
      );

      if (!source || !type || !Number.isFinite(amount) || amount < 0) {
        skipped.push(index + 1);
        continue;
      }

      // Category name (could be a string like "Workspace" or an object { name, type })
      const categoryName = extractName(source?.category, source?.categoryName);

      // Title: prefer explicit title fields, then notes, then category name
      const title = String(
        source?.title || source?.description || source?.transaction_name
        || source?.label || source?.notes || source?.note
        || categoryName || 'معاملة مستوردة'
      ).trim() || 'معاملة مستوردة';

      let dateVal = source?.date || source?.datetime || source?.createdAt;
      if (typeof dateVal === 'string' && /^\d+$/.test(dateVal)) dateVal = Number(dateVal);
      const date = dateVal ? new Date(dateVal) : new Date();

      const transaction = { user: userId, title, amount, type, date };

      if (type === 'transfer') {
        // Support: from_account/fromAccount/account (source) + to_account/toAccount (dest)
        const fromName = extractName(
          source?.from_account, source?.fromAccount, source?.fromAccountName,
          source?.account, source?.accountName
        );
        const toName = extractName(
          source?.to_account, source?.toAccount, source?.toAccountName
        );
        if (!fromName || !toName) { skipped.push(index + 1); continue; }

        const fromAcc = await resolveAccount(fromName, source?.fromAccountType || source?.accountType);
        const toAcc = await resolveAccount(toName, source?.toAccountType);
        transaction.from_account = fromAcc._id;
        transaction.to_account = toAcc._id;

      } else if (type === 'settlement') {
        const accName = extractName(source?.account, source?.accountName);
        if (!accName) { skipped.push(index + 1); continue; }
        transaction.account = (await resolveAccount(accName, source?.accountType))._id;

      } else {
        // income or expense
        const accName = extractName(source?.account, source?.accountName);
        if (!accName) { skipped.push(index + 1); continue; }
        transaction.account = (await resolveAccount(accName, source?.accountType))._id;

        if (!categoryName) { skipped.push(index + 1); continue; }
        transaction.category = (await resolveCategory(categoryName, type))._id;
      }

      inserted.push(transaction);
    } catch (err) {
      skipped.push(index + 1);
    }
  }

  // 5. Bulk insert all valid transactions
  if (inserted.length > 0) {
    await Transaction.insertMany(inserted);
  }

  return {
    success: true,
    insertedTransactions: inserted.length,
    skippedRows: skipped.length,
    createdAccounts,
    createdCategories,
  };
};

module.exports = {
  getTransactions,
  getTransactionPage,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  importTransactions,
};
