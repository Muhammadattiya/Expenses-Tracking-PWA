const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  period: {
    type: String,
    enum: ['weekly', 'monthly', 'custom'],
    required: true,
    default: 'monthly'
  },
  startDate: {
    type: Date,
    required: false
  },
  endDate: {
    type: Date,
    required: false
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: false
  },
  smartBudgetPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SmartBudgetPlan',
    required: false
  },
  carryOver: {
    type: Boolean,
    default: false
  },
  isRecurring: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notificationState: {
    lastPeriodStart: { type: Date, default: null },
    notified50: { type: Boolean, default: false },
    notified75: { type: Boolean, default: false },
    notified90: { type: Boolean, default: false },
    notified100: { type: Boolean, default: false },
    notifiedExceeded: { type: Boolean, default: false }
  },
}, { timestamps: true });

// Prevent duplicate active budgets for the same user, category and period
budgetSchema.index({ user: 1, category: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
