const mongoose = require('mongoose');

const smartBudgetCategorySchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    required: true
  },
  suggestedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  historicalAverage: {
    type: Number,
    required: true,
    min: 0
  },
  basedOn: {
    months: { type: Number, default: 0 },
    transactions: { type: Number, default: 0 }
  }
}, { _id: false });

const smartBudgetPlanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    default: 'Smart Budget Plan'
  },
  period: {
    type: String,
    enum: ['weekly', 'monthly', 'custom'],
    required: true,
    default: 'monthly'
  },
  isRecurring: {
    type: Boolean,
    default: true
  },
  groupAsMaster: {
    type: Boolean,
    default: false
  },
  availableBudget: {
    type: Number,
    required: true,
    min: 0
  },
  notificationState: {
    lastPeriodStart: { type: Date, default: null },
    notified50: { type: Boolean, default: false },
    notified75: { type: Boolean, default: false },
    notified90: { type: Boolean, default: false },
    notified100: { type: Boolean, default: false },
    notifiedExceeded: { type: Boolean, default: false }
  },
  categories: [smartBudgetCategorySchema],
  status: {
    type: String,
    enum: ['draft', 'confirmed'],
    default: 'draft'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('SmartBudgetPlan', smartBudgetPlanSchema);
