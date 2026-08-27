const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['gold', 'stock'], required: true },
  karat: { type: Number, enum: [21, 24], default: 24 },
  symbol: { type: String, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0.000001 },
  purchasePrice: { type: Number, required: true, min: 0 },
  currentPrice: { type: Number, min: 0 },
  currency: { type: String, default: 'EGP', uppercase: true },
  purchasedAt: { type: Date, default: Date.now },
}, { timestamps: true });

investmentSchema.index({ user: 1, type: 1 });
module.exports = mongoose.model('Investment', investmentSchema);
