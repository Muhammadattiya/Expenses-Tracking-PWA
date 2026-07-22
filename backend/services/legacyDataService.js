const Account = require('../models/Account');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');

// Data created before user accounts existed is assigned once to the first signed-in owner.
const adoptLegacyData = async (userId) => {
  const legacyFilter = { $or: [{ user: { $exists: false } }, { user: null }] };
  await Promise.all([
    Account.updateMany(legacyFilter, { $set: { user: userId } }),
    Category.updateMany(legacyFilter, { $set: { user: userId } }),
    Transaction.updateMany(legacyFilter, { $set: { user: userId } }),
  ]);
};

module.exports = { adoptLegacyData };
