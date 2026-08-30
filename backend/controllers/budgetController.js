const Budget = require('../models/Budget');
const { calculateRecommendation } = require('../services/budgetEngine');

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
