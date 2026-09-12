const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
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
      { user: userId, name: 'Visa', type: 'bank', icon: 'CreditCard' },
      { user: userId, name: 'Investments', type: 'investment', icon: 'TrendingUp', color: '#eab308', isSystemAccount: true, excludeFromTotal: true }
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

const signToken = (user) => jwt.sign(
  { id: user._id, v: user.tokenVersion || 0 },
  process.env.JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '7d' }
);

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
    { upsert: true, returnDocument: 'after', runValidators: true },
  );
  await adoptLegacyData(user._id);
  await seedDefaultData(user._id);
  return { token: signToken(user), user };
};

const register = async ({ name, email, password }) => {
  if (!name || !email || !password) throw new AppError('Name, email, and password are required.', 400);

  // Input length validation
  const trimmedName = String(name).trim();
  if (trimmedName.length < 1 || trimmedName.length > 100) throw new AppError('Name must be between 1 and 100 characters.', 400);
  const trimmedEmail = String(email).toLowerCase().trim();
  if (trimmedEmail.length > 254) throw new AppError('Email is too long.', 400);

  // Password strength validation
  if (typeof password !== 'string' || password.length < 8) throw new AppError('Password must be at least 8 characters.', 400);
  if (password.length > 128) throw new AppError('Password must not exceed 128 characters.', 400);

  const existingUser = await User.findOne({ email: trimmedEmail });
  if (existingUser) throw new AppError('Email already in use.', 400);
  
  const hashedPassword = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await User.create({
      name: trimmedName,
      email: trimmedEmail,
      password: hashedPassword
    });
  } catch (err) {
    // Handle race condition: unique index violation on concurrent registration
    if (err.code === 11000) { console.error('11000 Error in register:', err); throw new AppError('Email already in use.', 400); }
    throw err;
  }
  
  await seedDefaultData(user._id);
  // Remove password from output
  const userObj = user.toObject();
  delete userObj.password;
  
  return { token: signToken(userObj), user: userObj };
};

const login = async ({ email, password }) => {
  if (!email || !password) throw new AppError('Email and password are required.', 400);
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user || !user.password) throw new AppError('Invalid email or password.', 401);
  
  const isCorrect = await bcrypt.compare(password, user.password);
  if (!isCorrect) throw new AppError('Invalid email or password.', 401);
  
  // Remove password from output
  const userObj = user.toObject();
  delete userObj.password;
  
  return { token: signToken(userObj), user: userObj };
};

const updateProfile = async (userId, data) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404);

  let isSensitiveChanged = false;
  
  if (typeof data.name === 'string' && data.name.trim() && data.name.trim() !== user.name) {
    user.name = data.name.trim();
    isSensitiveChanged = true;
  }
  
  // allow phone number to be null or empty string
  const incomingPhone = data.phoneNumber !== undefined ? (data.phoneNumber === null ? null : String(data.phoneNumber).trim()) : undefined;
  
  if (incomingPhone) {
    const phoneRegex = /^(\+\d{10,15}|0\d{9,10})$/;
    if (!phoneRegex.test(incomingPhone)) {
      throw new AppError('Invalid phone number format.', 400);
    }
  }

  if (incomingPhone !== undefined && incomingPhone !== (user.phoneNumber || null)) {
    user.phoneNumber = incomingPhone === '' ? null : incomingPhone;
    isSensitiveChanged = true;
  }

  if (isSensitiveChanged) {
    if (user.profileEditsRemaining <= 0) {
      throw new AppError('You have reached the maximum limit of 3 for changing your name and phone number.', 400);
    }
    user.profileEditsRemaining -= 1;
  }

  if (typeof data.picture === 'string' && data.picture.length <= 2048) {
    user.picture = data.picture;
  }

  await user.save();
  
  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.__v;
  return userObj;
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

const invalidateAllSessions = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { tokenVersion: 1 } },
    { returnDocument: 'after' }
  );
  if (!user) throw new AppError('User not found.', 404);
  return user;
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword) throw new AppError('Current and new passwords are required.', 400);
  if (typeof newPassword !== 'string' || newPassword.length < 8) throw new AppError('New password must be at least 8 characters.', 400);
  if (newPassword.length > 128) throw new AppError('New password must not exceed 128 characters.', 400);

  const user = await User.findById(userId).select('+password');
  if (!user) throw new AppError('User not found.', 404);
  if (!user.password) throw new AppError('Cannot change password for accounts that use Google sign-in only.', 400);

  const isCorrect = await bcrypt.compare(currentPassword, user.password);
  if (!isCorrect) throw new AppError('Current password is incorrect.', 401);

  user.password = await bcrypt.hash(newPassword, 12);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  // Return a new token with the updated tokenVersion so the user stays logged in
  const userObj = user.toObject();
  delete userObj.password;
  return { token: signToken(userObj), user: userObj };
};

module.exports = { googleSignIn, register, login, updateProfile, deleteAllUserData, invalidateAllSessions, changePassword };
