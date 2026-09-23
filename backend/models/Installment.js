const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  provider: { 
    type: String, 
    enum: ['valu', 'souhoola', 'sympl', 'tabby', 'tamara', 'bank_cib', 'bank_nbe', 'bank_misr', 'gameya', 'other'],
    default: 'other' 
  },
  providerName: { type: String, trim: true },
  totalAmount: { type: Number, required: true, min: 0 },
  downPayment: { type: Number, default: 0, min: 0 },
  monthlyAmount: { type: Number, required: true, min: 0 },
  totalMonths: { type: Number, required: true, min: 1 },
  paidMonths: { type: Number, default: 0, min: 0 },
  dueDayOfMonth: { type: Number, required: true, min: 1, max: 31 },
  linkedAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  status: { type: String, enum: ['active', 'settled', 'paused'], default: 'active', index: true },
  autoPay: { type: Boolean, default: false },
  startDate: { type: Date, default: Date.now },
  nextDueDate: { type: Date, required: true },
  notes: { type: String, trim: true }
}, { timestamps: true });

installmentSchema.index({ user: 1, status: 1 });
installmentSchema.index({ user: 1, nextDueDate: 1 });

module.exports = mongoose.model('Installment', installmentSchema);
