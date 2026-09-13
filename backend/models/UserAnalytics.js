const mongoose = require('mongoose');

const userAnalyticsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
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
  version: {
    type: Number,
    default: 1,
  },
  needsReconciliation: {
    type: Boolean,
    default: false,
    index: true,
  },
  reconciliationReason: {
    type: String,
    default: null,
  },
  lastError: {
    message: { type: String, default: null },
    at: { type: Date, default: null },
  },
  isRebuilding: {
    type: Boolean,
    default: false,
  },
  lastReconciledAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('UserAnalytics', userAnalyticsSchema);
