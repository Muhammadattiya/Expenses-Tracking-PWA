const mongoose = require('mongoose');

const debtTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  debtId: { type: mongoose.Schema.Types.ObjectId, ref: 'Debt', required: true },
  amount: { type: Number, required: true, min: 0 },
  type: { type: String, enum: ['loan', 'repayment'], required: true },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  date: { type: Date, default: Date.now },
  notes: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('DebtTransaction', debtTransactionSchema);
