const mongoose = require('mongoose');

const userAnalyticsMonthlySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  month: {
    type: String,
    required: true, // "YYYY-MM"
  },
  year: {
    type: Number,
    required: true,
  },
  monthNum: {
    type: Number,
    required: true, // 1 to 12
  },
  summary: {
    income: { type: Number, default: 0 },
    expense: { type: Number, default: 0 },
    settlements: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
  },
  heatmap: {
    type: [Number],
    default: () => [0, 0, 0, 0, 0, 0, 0], // Sun (0) to Sat (6)
  },
  categoryTotals: {
    type: Map,
    of: new mongoose.Schema({
      amount: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      type: { type: String, enum: ['income', 'expense'] },
    }, { _id: false }),
    default: () => new Map(),
  },
  accountTotals: {
    type: Map,
    of: new mongoose.Schema({
      income: { type: Number, default: 0 },
      expense: { type: Number, default: 0 },
      settlements: { type: Number, default: 0 },
      transferIn: { type: Number, default: 0 },
      transferOut: { type: Number, default: 0 },
    }, { _id: false }),
    default: () => new Map(),
  },
  lastReconciledAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

userAnalyticsMonthlySchema.index({ user: 1, month: 1 }, { unique: true });
userAnalyticsMonthlySchema.index({ user: 1, year: 1 });

module.exports = mongoose.model('UserAnalyticsMonthly', userAnalyticsMonthlySchema);
