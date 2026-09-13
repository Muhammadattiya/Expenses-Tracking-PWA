const mongoose = require('mongoose');

const userAnalyticsWeeklySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // Canonical cycle identifier string: "YYYY-MM-DD" of the cycle startDate in UTC
  weekKey: {
    type: String,
    required: true, // e.g. "2026-09-05"
  },
  startDate: {
    type: Date,
    required: true, // e.g. 2026-09-05T00:00:00.000Z
  },
  endDate: {
    type: Date,
    required: true, // e.g. 2026-09-11T23:59:59.999Z
  },
  cycleStartDay: {
    type: Number,
    required: true, // 0 to 6 (tracks the user preference active for this bucket)
  },
  summary: {
    income: { type: Number, default: 0 },
    expense: { type: Number, default: 0 },
    settlements: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
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

// Compound unique index ensuring 1 document per user per weekly cycle
userAnalyticsWeeklySchema.index({ user: 1, weekKey: 1 }, { unique: true });
// Range index for chronological window queries
userAnalyticsWeeklySchema.index({ user: 1, startDate: -1 });

module.exports = mongoose.model('UserAnalyticsWeekly', userAnalyticsWeeklySchema);
