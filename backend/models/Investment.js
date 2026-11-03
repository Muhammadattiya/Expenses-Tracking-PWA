const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['gold', 'stock', 'currency'], required: true },
  karat: { type: Number, enum: [18, 21, 24], default: 24 },
  symbol: { type: String, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  purchasePrice: { type: Number, required: true, min: 0 },
  currentPrice: { type: Number, min: 0 },
  currency: { type: String, default: 'EGP', uppercase: true },
  purchasedAt: { type: Date, default: Date.now },
  isSold: { type: Boolean, default: false },
  soldAt: { type: Date },
  purchases: [{
    quantity: { type: Number, required: true, min: 0.00000001 },
    price: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    from_account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    title: { type: String }
  }],
}, { timestamps: true });

investmentSchema.index({ user: 1, type: 1 });
module.exports = mongoose.model('Investment', investmentSchema);
