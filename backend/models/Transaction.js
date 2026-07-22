const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['income', 'expense', 'transfer', 'settlement'],
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  // --- حقول الدخل والمصروف ---
account: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Account",
  required: function () {
    return this.type !== "transfer";
  },
},

category: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Category",
  required: function () {
    return ['income', 'expense'].includes(this.type);
  },
},

from_account: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Account",
  required: function () {
    return this.type === "transfer";
  },
},

to_account: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Account",
  required: function () {
    return this.type === "transfer";
  },
},
});

transactionSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
