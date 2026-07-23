const Account = require("../models/Account");
const Transaction = require("../models/Transaction");

const getAccounts = async (userId) => {
  return Account.find({ user: userId }).sort({ createdAt: -1 }).lean();
};

const createAccount = async (userId, data) => {
  const account = new Account({ ...data, user: userId });
  return await account.save();
};

const updateAccount = async (userId, id, data) => {
  const account = await Account.findOneAndUpdate({ _id: id, user: userId }, data, {
    new: true,
    runValidators: true,
  });

  if (!account) {
    throw new Error("Account not found.");
  }

  return account;
};

const deleteAccount = async (userId, id) => {
  const account = await Account.findOne({ _id: id, user: userId });

  if (!account) {
    const err = new Error("Account not found.");
    err.statusCode = 404;
    throw err;
  }

const hasTransactions = await Transaction.exists({
  $or: [
    { account: account._id },
    { from_account: account._id },
    { to_account: account._id },
  ],
});

  if (hasTransactions) {
    const err = new Error(
      "Cannot delete account because it has transactions."
    );

    err.statusCode = 409;
    throw err;
  }

  await Account.deleteOne({ _id: id, user: userId });
};

module.exports = {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
};
