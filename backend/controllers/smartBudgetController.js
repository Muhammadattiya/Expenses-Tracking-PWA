const SmartBudgetPlan = require('../models/SmartBudgetPlan');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { calculateDistribution, confirmPlanToBudgets } = require('../services/smartBudgetEngine');
const { getBudgetPeriodDates } = require('../services/budgetEngine');
const { sendPushNotification } = require('../services/cronJobs');

// Generate a smart budget distribution (Does NOT save to DB)
exports.generatePlan = async (req, res, next) => {
  try {
    const { availableBudget, categories, period, startDate, endDate } = req.body;
    
    if (!availableBudget || !categories || !period) {
      return res.status(400).json({ message: 'Available budget, categories, and period are required' });
    }

    const distribution = await calculateDistribution(req.user.id, availableBudget, categories, period, startDate, endDate);
    res.json(distribution);
  } catch (err) {
    next(err);
  }
};

// Save a draft plan to the database
exports.saveDraftPlan = async (req, res, next) => {
  try {
    const { name, period, availableBudget, categories, startDate: bodyStartDate, endDate: bodyEndDate, isRecurring, groupAsMaster } = req.body;

    const user = await User.findById(req.user.id);
    const prefs = user.preferences || {};
    
    let startDate, endDate;
    if (period === 'custom' && bodyStartDate && bodyEndDate) {
      startDate = new Date(bodyStartDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(bodyEndDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const dummyBudget = { period };
      const dates = getBudgetPeriodDates(dummyBudget, prefs, new Date());
      startDate = dates.startDate;
      endDate = dates.endDate;
    }

    const plan = new SmartBudgetPlan({
      user: req.user.id,
      name: name || 'Smart Budget Plan',
      period,
      availableBudget,
      categories, // Must include category (ID), priority, suggestedAmount, historicalAverage
      status: 'draft',
      startDate,
      endDate,
      isRecurring: isRecurring !== undefined ? isRecurring : true,
      groupAsMaster: groupAsMaster || false
    });

    await plan.save();
    
    // Check for large unallocated amount (> 5% of availableBudget)
    const allocatedSum = categories.reduce((sum, cat) => sum + cat.suggestedAmount, 0);
    const unallocated = availableBudget - allocatedSum;
    if (unallocated > (availableBudget * 0.05)) {
      // Send warning notification synchronously
      const subs = await Subscription.find({ user: req.user.id });
      const payload = JSON.stringify({
        title: 'Large Unallocated Budget',
        body: `You saved a plan with ${unallocated} unallocated. Ensure you distribute all your funds.`,
        url: '/budgets/smart-planner'
      });
      for (let sub of subs) {
        await sendPushNotification(sub, payload, null);
      }
    }

    // Populate category details for frontend display
    await plan.populate('categories.category', 'name icon type color');
    res.status(201).json(plan);
  } catch (err) {
    next(err);
  }
};

// Confirm a draft plan and turn it into real Budgets
exports.confirmPlan = async (req, res, next) => {
  try {
    const plan = await confirmPlanToBudgets(req.params.id, req.user.id);
    
    // Send "Budget Ready" notification
    const subs = await Subscription.find({ user: req.user.id });
    const payload = JSON.stringify({
      title: 'Smart Budget Created',
      body: 'Your Smart Budget has been successfully created and applied.',
      url: '/budgets'
    });
    for (let sub of subs) {
      await sendPushNotification(sub, payload, null);
    }

    res.json({ message: 'Plan confirmed successfully', plan });
  } catch (err) {
    if (err.message === 'Plan not found') return res.status(404).json({ message: err.message });
    if (err.message === 'Plan already confirmed') return res.status(400).json({ message: err.message });
    next(err);
  }
};

// Get all smart budget plans for the user
exports.getPlans = async (req, res, next) => {
  try {
    const plans = await SmartBudgetPlan.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('categories.category', 'name icon type color');
    res.json(plans);
  } catch (err) {
    next(err);
  }
};

// Get a single plan by ID
exports.getPlanById = async (req, res, next) => {
  try {
    const plan = await SmartBudgetPlan.findOne({ _id: req.params.id, user: req.user.id })
      .populate('categories.category', 'name icon type color');
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    res.json(plan);
  } catch (err) {
    next(err);
  }
};

// Update a draft plan (manual overrides)
exports.updateDraftPlan = async (req, res, next) => {
  try {
    const { name, categories, availableBudget, period, startDate: bodyStartDate, endDate: bodyEndDate, isRecurring, groupAsMaster, account } = req.body;
    
    const plan = await SmartBudgetPlan.findOne({ _id: req.params.id, user: req.user.id });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    
    if (plan.status === 'confirmed') {
      const Budget = require('../models/Budget');
      
      // Update plan properties
      if (name) plan.name = name;
      if (account !== undefined) plan.account = account; // Account might be null to clear
      
      let newCategories = categories || plan.categories;
      plan.categories = newCategories;

      if (availableBudget !== undefined) plan.availableBudget = availableBudget;
      
      await plan.save();

      // Sync sub-budgets
      if (categories) {
        // Find existing budgets for this plan
        const existingBudgets = await Budget.find({ smartBudgetPlan: plan._id, user: req.user.id });
        const existingCategoryIds = existingBudgets.map(b => b.category.toString());
        
        const newCategoryIds = newCategories.map(c => typeof c.category === 'object' ? c.category._id.toString() : c.category.toString());

        // 1. Delete budgets that were removed
        const toDelete = existingBudgets.filter(b => !newCategoryIds.includes(b.category.toString()));
        for (let b of toDelete) {
          await Budget.findByIdAndDelete(b._id);
        }

        // 2. Update existing or create new
        for (let item of newCategories) {
          const categoryId = typeof item.category === 'object' ? item.category._id : item.category;
          const existingBudget = existingBudgets.find(b => b.category.toString() === categoryId.toString());

          if (existingBudget) {
            existingBudget.amount = item.suggestedAmount;
            if (account !== undefined) existingBudget.account = account;
            await existingBudget.save();
          } else {
            const newBudget = new Budget({
              user: req.user.id,
              category: categoryId,
              amount: item.suggestedAmount,
              period: plan.period,
              startDate: plan.startDate,
              endDate: plan.endDate,
              isActive: true,
              carryOver: false,
              isRecurring: plan.isRecurring,
              smartBudgetPlan: plan._id,
              account: account !== undefined ? account : plan.account
            });
            await newBudget.save();
          }
        }
      } else if (account !== undefined) {
        // Just update accounts if categories weren't sent
        await Budget.updateMany(
          { smartBudgetPlan: plan._id, user: req.user.id },
          { account: account }
        );
      }

      await plan.populate('categories.category', 'name icon type color');
      return res.json(plan);
    }
    if (name) plan.name = name;
    if (account !== undefined) plan.account = account;
    if (categories) plan.categories = categories;
    if (availableBudget !== undefined) plan.availableBudget = availableBudget;
    if (isRecurring !== undefined) plan.isRecurring = isRecurring;
    if (groupAsMaster !== undefined) plan.groupAsMaster = groupAsMaster;
    
    if (period) {
      plan.period = period;
      if (period === 'custom' && bodyStartDate && bodyEndDate) {
        plan.startDate = new Date(bodyStartDate);
        plan.startDate.setHours(0,0,0,0);
        plan.endDate = new Date(bodyEndDate);
        plan.endDate.setHours(23,59,59,999);
      } else if (period !== 'custom') {
        const user = await User.findById(req.user.id);
        const dates = getBudgetPeriodDates({ period }, user.preferences || {}, new Date());
        plan.startDate = dates.startDate;
        plan.endDate = dates.endDate;
      }
    }

    await plan.save();
    await plan.populate('categories.category', 'name icon type color');
    
    res.json(plan);
  } catch (err) {
    next(err);
  }
};

// Delete a plan and its associated budgets
exports.deletePlan = async (req, res, next) => {
  try {
    const plan = await SmartBudgetPlan.findOne({ _id: req.params.id, user: req.user.id });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    
    const Budget = require('../models/Budget');
    await Budget.deleteMany({ smartBudgetPlan: plan._id, user: req.user.id });
    
    await plan.deleteOne();
    res.json({ message: 'Plan and associated budgets deleted successfully' });
  } catch (err) {
    next(err);
  }
};
