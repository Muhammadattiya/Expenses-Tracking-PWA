
const mongoose = require('mongoose');
const Transaction = require("../models/Transaction");
const Account = require("../models/Account");
const Category = require("../models/Category");
const AppError = require('../utils/AppError');
const { checkBudgetThresholds } = require("./budgetEngine");
const { adoptLegacyData } = require('./legacyDataService');

const withRetry = async (fn, maxRetries = 5) => {
  let attempt = 0;
  const initialDelay = 25;
  const maxDelay = 400;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;

      const isWriteConflict = err.code === 112 || (typeof err.message === 'string' && err.message.includes('Write conflict'));
      const isTransient = typeof err.hasErrorLabel === 'function' && (
        err.hasErrorLabel('TransientTransactionError') ||
        err.hasErrorLabel('UnknownTransactionCommitResult')
      );
      const isDuplicateKey = err.code === 11000 || (typeof err.message === 'string' && /E11000/i.test(err.message));

      if (!isDuplicateKey && (isWriteConflict || isTransient) && attempt < maxRetries) {
        const backoff = Math.min(maxDelay, initialDelay * Math.pow(2, attempt - 1));
        const delay = Math.floor(Math.random() * backoff);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
};

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
    .limit(500)
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
    if (!['completed'].includes(query.status)) {
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

  const validations = [];
  if (data.account !== undefined) {
    validations.push(
      Account.findOne({ _id: data.account, user: userId }).then(account => {
        if (!account) throw new Error("Account not found.");
      })
    );
  }

  if (data.category !== undefined && data.category !== null) {
    validations.push(
      Category.findOne({ _id: data.category, user: userId }).then(category => {
        if (!category) throw new Error("Category not found.");
      })
    );
  }

  if (validations.length > 0) {
    await Promise.all(validations);
  }
};

// Whitelist allowed fields to prevent mass assignment
const updateBudgetIncrementally = async (userId, tx, multiplier, session) => {
  if (tx.type !== 'expense') return;

  const Budget = require('../models/Budget');
  const SmartBudgetPlan = require('../models/SmartBudgetPlan');

  const txAmount = Number(tx.amount) || 0;
  if (txAmount === 0 || !multiplier) return;

  const categoryId = tx.category?._id || tx.category;
  if (!categoryId) return;

  const txDate = tx.date ? new Date(tx.date) : new Date();

  const accountOr = [
    { account: { $exists: false } },
    { account: null }
  ];
  if (tx.account) accountOr.push({ account: tx.account?._id || tx.account });
  if (tx.from_account) accountOr.push({ account: tx.from_account?._id || tx.from_account });

  await Budget.updateMany({
    user: userId,
    category: categoryId,
    isActive: true,
    startDate: { $lte: txDate },
    endDate: { $gte: txDate },
    $or: accountOr
  }, {
    $inc: { spent: txAmount * multiplier }
  }, { session });

  // Only update SmartBudgetPlan if an active confirmed master plan exists
  const hasMasterPlan = await SmartBudgetPlan.exists({
    user: userId,
    status: 'confirmed',
    groupAsMaster: true
  }).session(session);

  if (hasMasterPlan) {
    await SmartBudgetPlan.updateMany({
      user: userId,
      status: 'confirmed',
      groupAsMaster: true,
      'categories.category': categoryId,
      startDate: { $lte: txDate },
      endDate: { $gte: txDate }
    }, {
      $inc: { spent: txAmount * multiplier }
    }, { session });
  }
};

const TRANSACTION_ALLOWED_KEYS = ['title', 'amount', 'type', 'date', 'status', 'account', 'category', 'from_account', 'to_account', 'investment', 'idempotencyKey'];
const pickTransactionFields = (data) => {
  const safe = {};
  for (const key of TRANSACTION_ALLOWED_KEYS) {
    if (data[key] !== undefined) safe[key] = data[key];
  }
  return safe;
};

const isPayloadMatch = (existingTx, safeData) => {
  const typeMatch = existingTx.type === safeData.type;
  const amountMatch = Number(existingTx.amount) === Number(safeData.amount);

  const existingAcc = (existingTx.account?._id || existingTx.account)?.toString() || null;
  const reqAcc = safeData.account ? safeData.account.toString() : null;
  const accountMatch = existingAcc === reqAcc;

  const existingFrom = (existingTx.from_account?._id || existingTx.from_account)?.toString() || null;
  const reqFrom = safeData.from_account ? safeData.from_account.toString() : null;
  const fromAccountMatch = existingFrom === reqFrom;

  const existingTo = (existingTx.to_account?._id || existingTx.to_account)?.toString() || null;
  const reqTo = safeData.to_account ? safeData.to_account.toString() : null;
  const toAccountMatch = existingTo === reqTo;

  const existingCat = (existingTx.category?._id || existingTx.category)?.toString() || null;
  const reqCat = safeData.category ? safeData.category.toString() : null;
  const categoryMatch = existingCat === reqCat;

  return typeMatch && amountMatch && accountMatch && fromAccountMatch && toAccountMatch && categoryMatch;
};

const createTransaction = async (userId, data, opts = {}) => {
  const safeData = opts.trusted ? { ...data } : pickTransactionFields(data);
  if (safeData.title !== undefined) safeData.title = String(safeData.title).trim();
  await validateReferences(userId, safeData);

  if (safeData.type === 'expense' && safeData.category) {
    const Budget = require('../models/Budget');
    const txDate = safeData.date ? new Date(safeData.date) : new Date();
    const needsSync = await Budget.exists({
      user: userId,
      category: safeData.category,
      isActive: true,
      $or: [
        { endDate: { $lt: txDate } },
        { startDate: { $gt: txDate } },
        { spent: { $exists: false } }
      ]
    });
    if (needsSync) {
      const { syncBudgetPeriods } = require('./budgetEngine');
      await syncBudgetPeriods(userId);
    }
  }

  if (safeData.idempotencyKey) {
    const existingTx = await Transaction.findOne({ user: userId, idempotencyKey: safeData.idempotencyKey })
      .populate('account category from_account to_account')
      .lean();
    if (existingTx) {
      if (isPayloadMatch(existingTx, safeData)) {
        return existingTx;
      } else {
        throw new AppError('Idempotency conflict: payload does not match original request', 409);
      }
    }
  }

  let createdTx = null;
  let isIdempotencyHit = false;

  try {
    await withRetry(async () => {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          if (typeof opts.onAttempt === 'function') opts.onAttempt();
          try {
            const [doc] = await Transaction.create([{
              user: userId,
              ...safeData,
              source: safeData.source || 'manual'
            }], { session });

            if (doc.type === 'expense') {
              await updateBudgetIncrementally(userId, doc, 1, session);
            }
            createdTx = doc;
          } catch (err) {
            if (typeof opts.onError === 'function') opts.onError(err);
            throw err;
          }
        });
      } finally {
        await session.endSession();
      }
    });
  } catch (err) {
    const isDupKey = err.code === 11000 || (typeof err.message === 'string' && /E11000/i.test(err.message));
    if (isDupKey && safeData.idempotencyKey) {
      isIdempotencyHit = true;
    } else {
      throw err;
    }
  }

  if (isIdempotencyHit) {
    let winningTx = null;
    for (let poll = 0; poll < 10; poll++) {
      winningTx = await Transaction.findOne({ user: userId, idempotencyKey: safeData.idempotencyKey })
        .populate('account category from_account to_account')
        .lean();
      if (winningTx) break;
      await new Promise(r => setTimeout(r, 20));
    }

    if (!winningTx) {
      throw new AppError('Idempotency conflict: transaction is being processed, please retry', 409);
    }

    if (isPayloadMatch(winningTx, safeData)) {
      return winningTx;
    } else {
      throw new AppError('Idempotency conflict: payload does not match original request', 409);
    }
  }

  const populated = await Transaction.findById(createdTx._id)
    .populate('account category from_account to_account');

  if (populated && populated.type === 'expense') {
    const { checkBudgetThresholds } = require('./budgetEngine');
    checkBudgetThresholds(userId).catch(err => console.error('[ERROR] checkBudgetThresholds:', err));
  }

  const { checkPaydaySurvivalRisk } = require('./cronJobs');
  checkPaydaySurvivalRisk(userId).catch(err => console.error('[ERROR] checkPaydaySurvivalRisk:', err));

  return populated;
};

const updateTransaction = async (userId, id, data) => {
  const safeData = pickTransactionFields(data);
  if (safeData.title !== undefined) safeData.title = String(safeData.title).trim();
  await validateReferences(userId, safeData);

  if (safeData.type === 'expense' && safeData.category) {
    const Budget = require('../models/Budget');
    const txDate = safeData.date ? new Date(safeData.date) : new Date();
    const needsSync = await Budget.exists({
      user: userId,
      category: safeData.category,
      isActive: true,
      $or: [
        { endDate: { $lt: txDate } },
        { startDate: { $gt: txDate } },
        { spent: { $exists: false } }
      ]
    });
    if (needsSync) {
      const { syncBudgetPeriods } = require('./budgetEngine');
      await syncBudgetPeriods(userId);
    }
  }

  let updatedTx = null;
  let originalTx = null;

  await withRetry(async () => {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        originalTx = await Transaction.findOne({ _id: id, user: userId }).session(session).lean();
        if (!originalTx) {
          const err = new AppError("Transaction not found.", 404);
          throw err;
        }

        updatedTx = await Transaction.findOneAndUpdate(
          { _id: id, user: userId },
          safeData,
          { returnDocument: 'after', runValidators: true, session }
        )
          .populate("account")
          .populate("category")
          .populate("from_account")
          .populate("to_account");

        const origIsExpense = originalTx.type === 'expense';
        const newIsExpense = updatedTx.type === 'expense';

        const origCat = (originalTx.category?._id || originalTx.category)?.toString() || null;
        const newCat = (updatedTx.category?._id || updatedTx.category)?.toString() || null;

        const origAcc = (originalTx.account?._id || originalTx.account)?.toString() || null;
        const newAcc = (updatedTx.account?._id || updatedTx.account)?.toString() || null;

        const origDate = new Date(originalTx.date).getTime();
        const newDate = new Date(updatedTx.date).getTime();

        if (origIsExpense && newIsExpense && origCat === newCat && origAcc === newAcc && origDate === newDate) {
          const delta = Number(updatedTx.amount) - Number(originalTx.amount);
          if (delta !== 0) {
            await updateBudgetIncrementally(userId, { ...updatedTx.toObject(), amount: Math.abs(delta) }, delta > 0 ? 1 : -1, session);
          }
        } else {
          if (origIsExpense) {
            await updateBudgetIncrementally(userId, originalTx, -1, session);
          }
          if (newIsExpense) {
            await updateBudgetIncrementally(userId, updatedTx, 1, session);
          }
        }
      });
    } finally {
      await session.endSession();
    }
  });

  if (
    !originalTx.category &&
    updatedTx.category &&
    ['sms_shortcut', 'apple_shortcut'].includes(originalTx.source)
  ) {
    const { learnFromUser } = require('./merchantLearningService');
    learnFromUser(userId, originalTx.title, updatedTx.category._id || updatedTx.category)
      .catch(err => console.error('[ERROR] merchant learning failed:', err));
  }

  if (originalTx.type === 'expense' || updatedTx.type === 'expense') {
    const { checkBudgetThresholds } = require('./budgetEngine');
    checkBudgetThresholds(userId).catch(err => console.error('[ERROR] checkBudgetThresholds:', err));
  }

  const { checkPaydaySurvivalRisk } = require('./cronJobs');
  checkPaydaySurvivalRisk(userId).catch(err => console.error('[ERROR] checkPaydaySurvivalRisk:', err));

  return updatedTx;
};

const deleteTransaction = async (userId, id) => {
  let originalTx = null;

  await withRetry(async () => {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        originalTx = await Transaction.findOne({ _id: id, user: userId }).session(session).lean();
        if (!originalTx) {
          const err = new AppError("Transaction not found.", 404);
          throw err;
        }

        await Transaction.deleteOne({ _id: id, user: userId }).session(session);

        if (originalTx.type === 'expense') {
          await updateBudgetIncrementally(userId, originalTx, -1, session);
        }
      });
    } finally {
      await session.endSession();
    }
  });

  if (originalTx && originalTx.type === 'expense') {
    const { checkBudgetThresholds } = require('./budgetEngine');
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
    throw new AppError('Invalid backup file: no transactions array was found.', 400);
  }

  if (transactions.length > 2000) {
    throw new AppError('Import limit exceeded: Maximum 2000 transactions allowed per import.', 400);
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

  // 3. First pass: Collect all unique missing accounts and categories
  const accountsToCreate = new Map();
  const categoriesToCreate = new Map();

  const registerAccount = (name, typeHint) => {
    if (!name) return;
    const key = name.trim().toLowerCase();
    if (!accountByName.has(key) && !accountsToCreate.has(key)) {
      const accountType = ['cash', 'bank', 'wallet'].includes(typeHint) ? typeHint : 'cash';
      accountsToCreate.set(key, { name: name.trim(), type: accountType });
    }
  };

  const registerCategory = (name, type) => {
    if (!name) return;
    const key = `${type}:${name.trim().toLowerCase()}`;
    if (!categoryByKey.has(key) && !categoriesToCreate.has(key)) {
      categoriesToCreate.set(key, { name: name.trim(), type });
    }
  };

  // Pre-create accounts & categories listed in the backup metadata
  for (const acc of backup?.accounts || []) {
    registerAccount(extractName(acc, acc?.name), acc?.type);
  }
  for (const cat of backup?.categories || []) {
    const catType = normalizeType(cat?.type);
    if (catType === 'income' || catType === 'expense') {
      registerCategory(extractName(cat, cat?.name), catType);
    }
  }

  // Scan all transactions for missing entities
  for (const source of transactions) {
    if (!source) continue;
    const type = normalizeType(source?.type || source?.transactionType || source?.transaction_type || source?.kind);
    if (!type) continue;
    
    if (type === 'transfer') {
      registerAccount(extractName(source?.from_account, source?.fromAccount, source?.fromAccountName, source?.account, source?.accountName), source?.fromAccountType || source?.accountType);
      registerAccount(extractName(source?.to_account, source?.toAccount, source?.toAccountName), source?.toAccountType);
    } else {
      registerAccount(extractName(source?.account, source?.accountName), source?.accountType);
    }

    if (type === 'income' || type === 'expense') {
      registerCategory(extractName(source?.category, source?.categoryName), type);
    }
  }

  // 4. Batch insert missing entities
  if (accountsToCreate.size > 0) {
    const newAccounts = Array.from(accountsToCreate.values()).map(a => ({ user: userId, name: a.name, type: a.type }));
    const insertedAccounts = await Account.insertMany(newAccounts);
    insertedAccounts.forEach(a => accountByName.set(a.name.toLowerCase(), a));
    createdAccounts += insertedAccounts.length;
  }

  if (categoriesToCreate.size > 0) {
    const newCategories = Array.from(categoriesToCreate.values()).map(c => ({ user: userId, name: c.name, type: c.type }));
    const insertedCategories = await Category.insertMany(newCategories);
    insertedCategories.forEach(c => categoryByKey.set(`${c.type}:${c.name.toLowerCase()}`, c));
    createdCategories += insertedCategories.length;
  }

  // Helper for second pass
  const getAccount = (name) => name ? accountByName.get(name.trim().toLowerCase()) : null;
  const getCategory = (name, type) => name ? categoryByKey.get(`${type}:${name.trim().toLowerCase()}`) : null;

  // 5. Process each transaction row
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

      const categoryName = extractName(source?.category, source?.categoryName);
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
        const fromName = extractName(source?.from_account, source?.fromAccount, source?.fromAccountName, source?.account, source?.accountName);
        const toName = extractName(source?.to_account, source?.toAccount, source?.toAccountName);
        if (!fromName || !toName) { skipped.push(index + 1); continue; }

        transaction.from_account = getAccount(fromName)?._id;
        transaction.to_account = getAccount(toName)?._id;

      } else if (type === 'settlement') {
        const accName = extractName(source?.account, source?.accountName);
        if (!accName) { skipped.push(index + 1); continue; }
        transaction.account = getAccount(accName)?._id;

      } else {
        const accName = extractName(source?.account, source?.accountName);
        if (!accName) { skipped.push(index + 1); continue; }
        transaction.account = getAccount(accName)?._id;

        if (!categoryName) { skipped.push(index + 1); continue; }
        transaction.category = getCategory(categoryName, type)?._id;
      }

      inserted.push(transaction);
    } catch (err) {
      skipped.push(index + 1);
    }
  }

  // 6. Bulk insert all valid transactions
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
