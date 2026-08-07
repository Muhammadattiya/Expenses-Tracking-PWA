const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    validate: {
      validator: function(v) {
        if (['income', 'expense'].includes(this.type)) return v >= 0;
        return true;
      },
      message: 'Amount must be positive for income and expense.'
    }
  },
  type: {
    type: String,
    enum: ['income', 'expense', 'transfer', 'settlement'],
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['completed', 'pending_review', 'needs_manual_review'],
    default: 'completed'
  },
  source: {
    type: String,
    enum: ['manual', 'sms_shortcut', 'system'],
    default: 'manual'
  },
  referenceNumber: {
    type: String
  },
  rawSms: {
    type: String
  },
  smsHash: {
    type: String,
    index: true
  },
  // --- حقول الدخل والمصروف ---
account: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Account",
  required: function () {
    if (this.source === 'sms_shortcut') return false;
    return this.type !== "transfer";
  },
},

category: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Category",
  required: function () {
    if (this.source === 'sms_shortcut') return false;
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
}, { timestamps: true });

transactionSchema.index({ user: 1, date: -1 });
// Add composite indexes for common dashboard filters and aggregation
transactionSchema.index({ user: 1, type: 1, date: -1 });
transactionSchema.index({ user: 1, account: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
