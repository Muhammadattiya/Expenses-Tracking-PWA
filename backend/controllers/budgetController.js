const Budget = require('../models/Budget');
const { calculateRecommendation } = require('../services/budgetEngine');
const Account = require('../models/Account');
const Category = require('../models/Category');

// Get all budgets for the user
exports.getBudgets = async (req, res, next) => {
  try {
    const budgets = await Budget.find({ user: req.user.id })
      .populate('category', 'name icon type')
      .populate('smartBudgetPlan', 'name groupAsMaster');
    res.json(budgets);
  } catch (err) {
    next(err);
  }
};

// Create a new budget
exports.createBudget = async (req, res, next) => {
  try {
    const { category, amount, period, account, carryOver, isRecurring } = req.body;

    // SEC-005: Validate Category Ownership
    const categoryDoc = await Category.findOne({ _id: category, user: req.user.id });
    if (!categoryDoc) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // SEC-005: Validate Account Ownership (if provided)
    if (account) {
      const accountDoc = await Account.findOne({ _id: account, user: req.user.id });
      if (!accountDoc) {
        return res.status(404).json({ message: 'Account not found' });
      }
    }

    // Check if a budget already exists for this category
    const existing = await Budget.findOne({ user: req.user.id, category, period });
    if (existing) {
      return res.status(400).json({ message: 'Budget already exists for this category and period.' });
    }

    const budget = new Budget({
      user: req.user.id,
      category,
      amount,
      period,
      account: account || null,
      carryOver: carryOver || false,
      isRecurring: isRecurring !== undefined ? isRecurring : true
    });
    await budget.save();
    
    // Populate before sending back
    await budget.populate('category', 'name icon type');
    res.status(201).json(budget);
  } catch (err) {
    next(err);
  }
};

// Update an existing budget
exports.updateBudget = async (req, res, next) => {
  try {
    const { amount, period, isActive, account, carryOver, isRecurring } = req.body;

    // SEC-005: Validate Account Ownership (if provided)
    if (account) {
      const accountDoc = await Account.findOne({ _id: account, user: req.user.id });
      if (!accountDoc) {
        return res.status(404).json({ message: 'Account not found' });
      }
    }
    
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { amount, period, isActive, account: account || null, carryOver: carryOver || false, isRecurring: isRecurring !== undefined ? isRecurring : true },
      { returnDocument: 'after', runValidators: true }
    ).populate('category', 'name icon type');

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.json(budget);
  } catch (err) {
    next(err);
  }
};

// Delete a budget
exports.deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    res.json({ message: 'Budget deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Get mathematical recommendation
exports.getRecommendation = async (req, res, next) => {
  try {
    const { categoryId, period } = req.query;
    if (!categoryId || !period) {
      return res.status(400).json({ message: 'Category ID and period are required' });
    }

    const recommendation = await calculateRecommendation(req.user.id, categoryId, period);
    res.json(recommendation);
  } catch (err) {
    next(err);
  }
};

// Batch import budgets
exports.importBudgets = async (req, res, next) => {
  try {
    const rawBudgets = Array.isArray(req.body) ? req.body : req.body?.budgets || [];
    if (!Array.isArray(rawBudgets) || rawBudgets.length === 0) {
      return res.status(400).json({ message: 'No budgets data provided.' });
    }

    const processedBudgets = [];
    for (const item of rawBudgets) {
      const catName = String(item.category || item.categoryName || '').trim();
      if (!catName) continue;

      const amount = Math.abs(Number(item.amount ?? item.budgetLimit ?? item['budget limit'] ?? 0));
      if (!amount || amount <= 0) continue;

      const period = ['weekly', 'monthly', 'custom'].includes(item.period?.toLowerCase())
        ? item.period.toLowerCase()
        : 'monthly';

      // Find or create category
      let categoryDoc = await Category.findOne({
        user: req.user.id,
        name: new RegExp('^' + catName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
      });

      if (!categoryDoc) {
        categoryDoc = await Category.create({
          user: req.user.id,
          name: catName,
          type: 'expense'
        });
      }

      let budget = await Budget.findOne({
        user: req.user.id,
        category: categoryDoc._id,
        period
      });

      if (budget) {
        budget.amount = amount;
        if (item.startDate) budget.startDate = new Date(item.startDate);
        if (item.endDate) budget.endDate = new Date(item.endDate);
        await budget.save();
      } else {
        budget = new Budget({
          user: req.user.id,
          category: categoryDoc._id,
          amount,
          period,
          startDate: item.startDate ? new Date(item.startDate) : undefined,
          endDate: item.endDate ? new Date(item.endDate) : undefined
        });
        await budget.save();
      }

      processedBudgets.push(budget);
    }

    res.status(201).json({
      message: 'Budgets imported successfully',
      count: processedBudgets.length,
      budgets: processedBudgets
    });
  } catch (err) {
    console.error('[ERROR] importBudgets:', err);
    next(err);
  }
};
