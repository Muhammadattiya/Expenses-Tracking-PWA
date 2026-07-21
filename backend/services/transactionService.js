const Transaction = require("../models/Transaction");
const Account = require("../models/Account");
const Category = require("../models/Category");

const getTransactions = async () => {
  return await Transaction.find()
  .populate("account")
  .populate("category")
  .populate("from_account")
  .populate("to_account")
  .sort({ date: -1 });
};

const validateReferences = async (data) => {
  if (data.type === "transfer") {
    const [fromAccount, toAccount] = await Promise.all([
      Account.findById(data.from_account),
      Account.findById(data.to_account),
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
    Account.findById(data.account),
    Category.findById(data.category),
  ]);

  if (!account) {
    throw new Error("Account not found.");
  }

  if (!category) {
    throw new Error("Category not found.");
  }
};

const createTransaction = async (data) => {
  await validateReferences(data);
  const transaction = await Transaction.create(data);

return await Transaction.findById(transaction._id)
  .populate("account")
  .populate("category")
  .populate("from_account")
  .populate("to_account");
};

const updateTransaction = async (id, data) => {
  await validateReferences(data);
  const transaction = await Transaction.findByIdAndUpdate(id, data, {
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

const deleteTransaction = async (id) => {
  const transaction = await Transaction.findById(id);

  if (!transaction) {
    const err = new Error("Transaction not found.");
    err.statusCode = 404;
    throw err;
  }

  await Transaction.findByIdAndDelete(id);
};

const importTransactions = async (transactions) => {
  if (!Array.isArray(transactions)) {
    throw new Error("Invalid import data.");
  }

  const cleanedTransactions = [];

  for (const t of transactions) {
    const transaction = { ...t };

    delete transaction._id;
    delete transaction.__v;

    let account = null;
    let fromAccount = null;
    let toAccount = null;
    let category = null;

    if (transaction.account) {
      account = await Account.findOne({
        name: transaction.account,
      });

      if (!account) {
        account = await Account.create({
          name: transaction.account,
          type: "cash",
        });
      }

      transaction.account = account._id;
    }

    if (transaction.from_account) {
      fromAccount = await Account.findOne({
        name: transaction.from_account,
      });

      if (!fromAccount) {
        fromAccount = await Account.create({
          name: transaction.from_account,
          type: "cash",
        });
      }

      transaction.from_account = fromAccount._id;
    }

    if (transaction.to_account) {
      toAccount = await Account.findOne({
        name: transaction.to_account,
      });

      if (!toAccount) {
        toAccount = await Account.create({
          name: transaction.to_account,
          type: "cash",
        });
      }

      transaction.to_account = toAccount._id;
    }

    if (
      transaction.category &&
      transaction.type !== "transfer"
    ) {
      category = await Category.findOne({
        name: transaction.category,
        type: transaction.type,
      });

      if (!category) {
        category = await Category.create({
          name: transaction.category,
          type: transaction.type,
        });
      }

      transaction.category = category._id;
    }

    cleanedTransactions.push(transaction);
  }

  const inserted = await Transaction.insertMany(
    cleanedTransactions
  );

  return {
    success: true,
    insertedTransactions: inserted.length,
  };
};

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  importTransactions,
};