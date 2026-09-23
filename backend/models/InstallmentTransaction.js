const mongoose = require('mongoose');

const installmentTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  installmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Installment', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  type: { type: String, enum: ['down_payment', 'monthly_payment'], required: true },
  paymentNumber: { type: Number, default: 0 },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  date: { type: Date, default: Date.now },
  notes: { type: String, trim: true }
}, { timestamps: true });

installmentTransactionSchema.index({ user: 1, installmentId: 1, date: -1 });

module.exports = mongoose.model('InstallmentTransaction', installmentTransactionSchema);
