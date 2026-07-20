const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
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
    enum: ['income', 'expense', 'transfer'],
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  // --- حقول الدخل والمصروف ---
  account: {
    type: String,
    required: function() { return this.type !== 'transfer'; }
  },
  category: {
    type: String,
    required: function() { return this.type !== 'transfer'; }
  },
  // --- حقول التحويلات ---
  from_account: {
    type: String,
    required: function() { return this.type === 'transfer'; }
  },
  to_account: {
    type: String,
    required: function() { return this.type === 'transfer'; }
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);