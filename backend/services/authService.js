const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Investment = require('../models/Investment');
const Receivable = require('../models/Receivable');
const Bill = require('../models/Bill');
const Budget = require('../models/Budget');
const Debt = require('../models/Debt');
const DebtTransaction = require('../models/DebtTransaction');
const IncomeProfile = require('../models/IncomeProfile');
const RecurringTransaction = require('../models/RecurringTransaction');
const SimulationHistory = require('../models/SimulationHistory');
const SmartBudgetPlan = require('../models/SmartBudgetPlan');
const Subscription = require('../models/Subscription');
const AppError = require('../utils/AppError');
const { adoptLegacyData } = require('./legacyDataService');

const seedDefaultData = async (userId) => {
  const hasAccounts = await Account.exists({ user: userId });
  if (!hasAccounts) {
    await Account.insertMany([
      { user: userId, name: 'Cash', type: 'cash', icon: 'Wallet', isDefault: true },
      { user: userId, name: 'Visa', type: 'bank', icon: 'CreditCard' }
    ]);
  }

  const hasCategories = await Category.exists({ user: userId });
  if (!hasCategories) {
    await Category.insertMany([
      { user: userId, name: 'Salary', type: 'income', icon: 'Briefcase' },
      { user: userId, name: 'Bonus', type: 'income', icon: 'Gift' },
      { user: userId, name: 'Investment', type: 'income', icon: 'TrendingUp' },
      { user: userId, name: 'Food', type: 'expense', icon: 'Utensils' },
      { user: userId, name: 'Transport', type: 'expense', icon: 'Bus' },
      { user: userId, name: 'Bills', type: 'expense', icon: 'FileText' },
      { user: userId, name: 'Entertainment', type: 'expense', icon: 'Film' },
      { user: userId, name: 'Health', type: 'expense', icon: 'HeartPulse' },
      { user: userId, name: 'Shopping', type: 'expense', icon: 'ShoppingBag' },
      { user: userId, name: 'Education', type: 'expense', icon: 'GraduationCap' },
      { user: userId, name: 'Other', type: 'expense', icon: 'MoreHorizontal' }
    ]);
  }
};

const signToken = (user) => jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });

const googleSignIn = async (credential) => {
  if (!credential) throw new AppError('Google credential is required.', 400);
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!response.ok) throw new AppError('Invalid Google credential.', 401);
  const profile = await response.json();
  if (profile.aud !== process.env.GOOGLE_CLIENT_ID || profile.email_verified !== 'true') {
    throw new AppError('Google credential was issued for another application.', 401);
  }
  const user = await User.findOneAndUpdate(
    { googleId: profile.sub },
    { googleId: profile.sub, email: profile.email, name: profile.name || profile.email, picture: profile.picture },
    { upsert: true, new: true, runValidators: true },
  );
  await adoptLegacyData(user._id);
  await seedDefaultData(user._id);
  return { token: signToken(user), user };
};

const updateProfile = async (userId, data) => {
  const update = {};
  if (typeof data.name === 'string' && data.name.trim()) update.name = data.name.trim();
  if (typeof data.picture === 'string' && data.picture.length <= 5 * 1024 * 1024) update.picture = data.picture;
  const user = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true }).select('-__v');
  if (!user) throw new AppError('User not found.', 404);
  return user;
};

const deleteAllUserData = async (userId) => {
  await Promise.all([
    Transaction.deleteMany({ user: userId }),
    Investment.deleteMany({ user: userId }),
    Receivable.deleteMany({ user: userId }),
    Account.deleteMany({ user: userId }),
    Category.deleteMany({ user: userId }),
    Bill.deleteMany({ user: userId }),
    Budget.deleteMany({ user: userId }),
    Debt.deleteMany({ user: userId }),
    DebtTransaction.deleteMany({ user: userId }),
    IncomeProfile.deleteMany({ user: userId }),
    RecurringTransaction.deleteMany({ user: userId }),
    SimulationHistory.deleteMany({ userId }),
    SmartBudgetPlan.deleteMany({ user: userId }),
    Subscription.deleteMany({ user: userId }),
  ]);
};

module.exports = { googleSignIn, updateProfile, deleteAllUserData };
