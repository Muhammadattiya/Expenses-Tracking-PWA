const mongoose = require('mongoose');

const emergencyFundSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  targetMonths: { type: Number, default: 6, min: 1, max: 24 },
  linkedAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  customMonthlyBurnOverride: { type: Number, default: null },
  notes: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('EmergencyFund', emergencyFundSchema);
