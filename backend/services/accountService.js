const Account = require("../models/Account");
const Transaction = require("../models/Transaction");

const getAccounts = async () => {
  return await Account.find().sort({ createdAt: -1 });
};

const createAccount = async (data) => {
  const account = new Account(data);
  return await account.save();
};

const updateAccount = async (id, data) => {
  const account = await Account.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!account) {
    throw new Error("Account not found.");
  }

  return account;
};

const deleteAccount = async (id) => {
  const account = await Account.findById(id);

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

  await Account.findByIdAndDelete(id);
};

module.exports = {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
};