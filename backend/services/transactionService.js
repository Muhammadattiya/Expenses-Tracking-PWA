const Transaction = require("../models/Transaction");
const Account = require("../models/Account");
const Category = require("../models/Category");

const getTransactions = async (userId) => {
  return Transaction.find({ user: userId })
  .populate("account")
  .populate("category")
  .populate("from_account")
  .populate("to_account")
  .sort({ date: -1 });
};

const validateReferences = async (userId, data) => {
  if (data.type === "transfer") {
    const [fromAccount, toAccount] = await Promise.all([
      Account.findOne({ _id: data.from_account, user: userId }),
      Account.findOne({ _id: data.to_account, user: userId }),
    ]);

    if (!fromAccount) {
      throw new Error("Source account not found.");
    }

    if (!toAccount) {
      throw new Error("Destination account not found.");
    }

    return;
  }

  const [account, category] = await Promise.all([
    Account.findOne({ _id: data.account, user: userId }),
    Category.findOne({ _id: data.category, user: userId }),
  ]);

  if (!account) {
    throw new Error("Account not found.");
  }

  if (!category) {
    throw new Error("Category not found.");
  }
};

const createTransaction = async (userId, data) => {
  await validateReferences(userId, data);
  const transaction = await Transaction.create({ ...data, user: userId });

return await Transaction.findById(transaction._id)
  .populate("account")
  .populate("category")
  .populate("from_account")
  .populate("to_account");
};

const updateTransaction = async (userId, id, data) => {
  await validateReferences(userId, data);
  const transaction = await Transaction.findOneAndUpdate({ _id: id, user: userId }, data, {
  new: true,
  runValidators: true,
})
  .populate("account")
  .populate("category")
  .populate("from_account")
  .populate("to_account");

  if (!transaction) {
    throw new Error("Transaction not found.");
  }

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
};

const importTransactions = async (userId, backup) => {
  const transactions = Array.isArray(backup) ? backup : backup?.transactions;
  if (!Array.isArray(transactions)) throw new Error('Invalid backup file.');

  const accounts = await Account.find({ user: userId });
  const categories = await Category.find({ user: userId });
  const accountByName = new Map(accounts.map((account) => [account.name.trim().toLowerCase(), account]));
  const categoryByKey = new Map(categories.map((category) => [`${category.type}:${category.name.trim().toLowerCase()}`, category]));
  let createdAccounts = 0;
  let createdCategories = 0;

  const referenceName = (reference, fallback) => {
    if (typeof reference === 'object' && reference) return reference.name || fallback;
    return fallback || reference;
  };
  const resolveAccount = async (reference, fallbackName, type = 'cash') => {
    const name = referenceName(reference, fallbackName)?.trim();
    if (!name) throw new Error('Every imported transaction must include an account name.');
    const key = name.toLowerCase();
    if (accountByName.has(key)) return accountByName.get(key);
    const accountType = typeof reference === 'object' && reference ? reference.type : type;
    const account = await Account.create({ user: userId, name, type: ['cash', 'bank', 'wallet'].includes(accountType) ? accountType : 'cash' });
    accountByName.set(key, account); createdAccounts += 1;
    return account;
  };
  const resolveCategory = async (reference, fallbackName, type) => {
    const name = referenceName(reference, fallbackName)?.trim();
    if (!name) throw new Error('Every imported income or expense must include a category name.');
    const key = `${type}:${name.toLowerCase()}`;
    if (categoryByKey.has(key)) return categoryByKey.get(key);
    const category = await Category.create({ user: userId, name, type });
    categoryByKey.set(key, category); createdCategories += 1;
    return category;
  };

  const inserted = [];
  for (const source of transactions) {
    if (!source || !['income', 'expense', 'transfer'].includes(source.type) || !source.title || !Number.isFinite(Number(source.amount))) {
      throw new Error('The backup contains an invalid transaction.');
    }
    const transaction = { user: userId, title: source.title.trim(), amount: Number(source.amount), type: source.type, date: source.date || new Date() };
    if (source.type === 'transfer') {
      transaction.from_account = (await resolveAccount(source.from_account, source.fromAccountName, source.fromAccountType))._id;
      transaction.to_account = (await resolveAccount(source.to_account, source.toAccountName, source.toAccountType))._id;
    } else {
      transaction.account = (await resolveAccount(source.account, source.accountName, source.accountType))._id;
      transaction.category = (await resolveCategory(source.category, source.categoryName, source.type))._id;
    }
    inserted.push(transaction);
  }
  await Transaction.insertMany(inserted);
  return { success: true, insertedTransactions: inserted.length, createdAccounts, createdCategories };
};

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  importTransactions,
};
