const mongoose = require('mongoose');

const debtSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  personName: { type: String, required: true, trim: true },
  type: { type: String, enum: ['i_owe', 'owed_to_me'], required: true },
  initialAmount: { type: Number, required: true, min: 0 },
  remainingAmount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['active', 'settled'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Debt', debtSchema);
