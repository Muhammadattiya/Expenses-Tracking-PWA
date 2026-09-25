const mongoose = require('mongoose');

const emergencyFundSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  targetMonths: { type: Number, default: 6, min: 1, max: 24 },
  linkedAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  customMonthlyBurnOverride: { type: Number, default: null },
  notes: { type: String, trim: true },
  burnBreakdown: {
    billsMonthly: { type: Number, default: 0 },
    recurringMonthly: { type: Number, default: 0 },
    installmentsMonthly: { type: Number, default: 0 },
    discretionaryBaseline: { type: Number, default: 0 }
  },
  essentialCategoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  essentialMonthlyBurn: { type: Number, default: 0 },
  targetAmount: { type: Number, default: 0 },
  lastReconciledAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('EmergencyFund', emergencyFundSchema);
