const crypto = require('crypto');
const User = require('../models/User');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const transactionService = require('../services/transactionService');

// Validation constants
const IDEMPOTENCY_KEY_REGEX = /^[a-zA-Z0-9\-_]{8,128}$/;
const MAX_TITLE_LENGTH = 200;

// Admin generating the token for the user via the settings UI
exports.generateToken = async (req, res, next) => {
  try {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.shortcutTokenHash = hashedToken;
    user.shortcutTokenCreatedAt = new Date(); // Fix #6: track creation date for expiry
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
    user.shortcutTokenCreatedAt = undefined; // Fix #6: clear creation date on revoke
    await user.save();

    res.json({ message: 'Token revoked successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getTokenStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+shortcutTokenHash +shortcutTokenCreatedAt');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Also return expiry info if connected
    let expiresAt = null;
    if (user.shortcutTokenHash && user.shortcutTokenCreatedAt) {
      expiresAt = new Date(user.shortcutTokenCreatedAt.getTime() + 365 * 24 * 60 * 60 * 1000);
    }

    res.json({ 
      isConnected: !!user.shortcutTokenHash,
      expiresAt,
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------------------------
// Shortcut specific endpoints using shortcutAuth middleware

exports.getAccounts = async (req, res, next) => {
  try {
    const accounts = await Account.find({ user: req.user._id }).select('name').lean();
    const accountNames = accounts.map(a => a.name);
    res.json(accountNames);
  } catch (error) {
    console.error('[ERROR] shortcut getAccounts:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    // Return only expense categories for now, as Shortcuts usually add expenses
    const categories = await Category.find({ user: req.user._id, type: 'expense' }).select('name').lean();
    const categoryNames = categories.map(c => c.name);
    res.json(categoryNames);
  } catch (error) {
    console.error('[ERROR] shortcut getCategories:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createTransaction = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { amount, accountName, categoryName, title } = req.body;
    
    // Fix #3 + #9: Mandatory Idempotency-Key with format & length validation (dead code removed)
    const idempotencyKey = req.header('Idempotency-Key');
    if (!idempotencyKey) {
      return res.status(400).json({ message: 'Idempotency-Key header is required' });
    }
    if (!IDEMPOTENCY_KEY_REGEX.test(String(idempotencyKey))) {
      return res.status(400).json({ 
        message: 'Idempotency-Key must be 8-128 alphanumeric characters (dashes and underscores allowed)' 
      });
    }

    // Idempotency check — dead if(idempotencyKey) wrapper removed
    const existing = await Transaction.findOne({ user: userId, idempotencyKey }).populate('account category');
    if (existing) {
      // Strict payload matching
      if (
        existing.amount === Number(amount) &&
        existing.account?.name === accountName &&
        existing.category?.name === categoryName
      ) {
        return res.status(200).json({ 
          message: 'Transaction already processed', 
          transaction: existing 
        });
      } else {
        return res.status(409).json({ message: 'Idempotency conflict: Key reused with different payload' });
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

    if (!accountName || !categoryName) {
      return res.status(400).json({ message: 'accountName and categoryName are required' });
    }

    // Explicit Ownership & Existence Validation by Name
    const accountDoc = await Account.findOne({ name: accountName, user: userId });
    if (!accountDoc) {
      return res.status(400).json({ message: `Account "${accountName}" not found` });
    }
    
    const categoryDoc = await Category.findOne({ name: categoryName, user: userId });
    if (!categoryDoc) {
      return res.status(400).json({ message: `Category "${categoryName}" not found` });
    }

    // Fix #4: Sanitize title — enforce max length
    const sanitizedTitle = title
      ? String(title).trim().slice(0, MAX_TITLE_LENGTH)
      : 'Shortcut Transaction';

    const transactionData = {
      title: sanitizedTitle,
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
