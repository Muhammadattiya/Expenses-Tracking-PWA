const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const EmergencyFund = require("../models/EmergencyFund");
const crypto = require("crypto");

const getAccounts = async (userId) => {
  return Account.find({ user: userId }).sort({ order: 1, createdAt: 1 }).lean();
};

// Whitelist allowed fields to prevent mass assignment attacks
const pickAccountFields = (data) => {
  const allowed = {};
  const ALLOWED_KEYS = ['name', 'type', 'icon', 'color', 'balance_adjustment', 'isDefault', 'isSavingsAccount', 'isEmergencyFund', 'isArchived', 'excludeFromTotal', 'cardLast4', 'order'];
  for (const key of ALLOWED_KEYS) {
    if (data[key] !== undefined) allowed[key] = data[key];
  }
  return allowed;
};

const createAccount = async (userId, data) => {
  const safeData = pickAccountFields(data);
  if (safeData.isDefault === true) {
    await Account.updateMany({ user: userId }, { $set: { isDefault: false } });
  }
  if (safeData.isEmergencyFund === true) {
    await Account.updateMany({ user: userId }, { $set: { isEmergencyFund: false } });
  }
  if (safeData.order === undefined) {
    const lastAccount = await Account.findOne({ user: userId }).sort({ order: -1 }).select('order').lean();
    safeData.order = (lastAccount && typeof lastAccount.order === 'number') ? lastAccount.order + 1 : 0;
  }
  const account = new Account({ ...safeData, user: userId });
  const savedAccount = await account.save();

  if (safeData.isEmergencyFund === true) {
    await EmergencyFund.findOneAndUpdate(
      { user: userId },
      { $set: { linkedAccountId: savedAccount._id } },
      { upsert: true }
    );
  }

  return savedAccount;
};

const updateAccount = async (userId, id, data) => {
  const safeData = pickAccountFields(data);
  if (safeData.isDefault === true) {
    await Account.updateMany({ user: userId, _id: { $ne: id } }, { $set: { isDefault: false } });
  }
  if (safeData.isEmergencyFund === true) {
    await Account.updateMany({ user: userId, _id: { $ne: id } }, { $set: { isEmergencyFund: false } });
    await EmergencyFund.findOneAndUpdate(
      { user: userId },
      { $set: { linkedAccountId: id } },
      { upsert: true }
    );
  } else if (safeData.isEmergencyFund === false) {
    await EmergencyFund.updateOne(
      { user: userId, linkedAccountId: id },
      { $set: { linkedAccountId: null } }
    );
  }

  const account = await Account.findOneAndUpdate({ _id: id, user: userId }, safeData, {
    returnDocument: 'after',
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

  await EmergencyFund.updateOne(
    { user: userId, linkedAccountId: id },
    { $set: { linkedAccountId: null } }
  );

const hasTransactions = await Transaction.exists({
  $or: [
    { account: account._id },
    { from_account: account._id },
    { to_account: account._id },
  ],
});

  if (hasTransactions) {
    await Account.updateOne({ _id: id, user: userId }, { $set: { isArchived: true } });
    return;
  }

  await Account.deleteOne({ _id: id, user: userId });
};

const reorderAccounts = async (userId, orderedIds) => {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return getAccounts(userId);
  }

  const bulkOps = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, user: userId },
      update: { $set: { order: index } }
    }
  }));

  await Account.bulkWrite(bulkOps);
  return getAccounts(userId);
};

module.exports = {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  reorderAccounts,
};
