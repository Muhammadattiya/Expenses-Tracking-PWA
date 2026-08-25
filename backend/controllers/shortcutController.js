const crypto = require('crypto');
const User = require('../models/User');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const transactionService = require('../services/transactionService');

// Admin generating the token for the user via the settings UI
exports.generateToken = async (req, res, next) => {
  try {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.shortcutTokenHash = hashedToken;
    await user.save();

    res.json({ token: rawToken, message: 'Token generated successfully. Please save it now.' });
  } catch (error) {
    next(error);
  }
};

exports.revokeToken = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.shortcutTokenHash = undefined;
    await user.save();

    res.json({ message: 'Token revoked successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getTokenStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+shortcutTokenHash');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ isConnected: !!user.shortcutTokenHash });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------------------------
// Shortcut specific endpoints using shortcutAuth middleware

exports.getAccounts = async (req, res, next) => {
  try {
    const accounts = await Account.find({ user: req.user._id }).select('name').lean();
    res.json(accounts.map(a => ({ id: a._id.toString(), name: a.name })));
  } catch (error) {
    console.error('[ERROR] shortcut getAccounts:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    // Return only expense categories for now, as Shortcuts usually add expenses
    const categories = await Category.find({ user: req.user._id, type: 'expense' }).select('name').lean();
    res.json(categories.map(c => ({ id: c._id.toString(), name: c.name })));
  } catch (error) {
    console.error('[ERROR] shortcut getCategories:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createTransaction = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { amount, accountId, categoryId, title } = req.body;
    
    // Idempotency check MUST be mandatory
    const idempotencyKey = req.header('Idempotency-Key');
    if (!idempotencyKey) {
      return res.status(400).json({ message: 'Idempotency-Key header is required' });
    }

    if (idempotencyKey) {
      const existing = await Transaction.findOne({ user: userId, idempotencyKey });
      if (existing) {
        // Strict payload matching
        if (
          existing.amount === Number(amount) &&
          existing.account.toString() === accountId &&
          existing.category.toString() === categoryId
        ) {
          return res.status(200).json({ 
            message: 'Transaction already processed', 
            transaction: existing 
          });
        } else {
          return res.status(409).json({ message: 'Idempotency conflict: Key reused with different payload' });
        }
      }
    }

    // Validation
    if (amount === undefined || amount === null) {
      return res.status(400).json({ message: 'Amount is required' });
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    if (!accountId || !categoryId) {
      return res.status(400).json({ message: 'accountId and categoryId are required' });
    }

    // Explicit Ownership & Existence Validation
    const accountDoc = await Account.findOne({ _id: accountId, user: userId });
    if (!accountDoc) {
      return res.status(400).json({ message: `Account not found or access denied` });
    }
    
    const categoryDoc = await Category.findOne({ _id: categoryId, user: userId });
    if (!categoryDoc) {
      return res.status(400).json({ message: `Category not found or access denied` });
    }

    // Rely on transactionService validation, but we explicitly construct the data
    const transactionData = {
      title: title || 'Shortcut Transaction',
      amount: numAmount,
      type: 'expense',
      account: accountDoc._id,
      category: categoryDoc._id,
      date: new Date(),
      source: 'apple_shortcut',
      idempotencyKey: idempotencyKey
    };

    const transaction = await transactionService.createTransaction(userId, transactionData);
    
    res.status(201).json({ message: 'Transaction created successfully', transaction });
  } catch (error) {
    console.error('[ERROR] shortcut createTransaction:', error);
    
    // Convert common known errors into friendly 400 responses
    if (error.message.includes('Account not found') || error.message.includes('Category not found') || error.message.includes('Invalid')) {
      return res.status(400).json({ message: error.message });
    }

    if (error.code === 11000 && error.keyPattern && error.keyPattern.user && error.keyPattern.idempotencyKey) {
      return res.status(200).json({ message: 'Transaction already processed (concurrent request)' });
    }

    res.status(500).json({ message: 'Server error during transaction creation' });
  }
};
