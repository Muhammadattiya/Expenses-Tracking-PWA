const mongoose = require('mongoose');

const recurringTransactionSchema = new mongoose.Schema({
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
    enum: ['income', 'expense', 'transfer'],
    required: true
  },
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
  notes: {
    type: String
  },
  
  // Recurring specific fields
  repeatType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
    required: true
  },
  executionTime: {
    type: String,
    default: '00:00'
  },
  interval: {
    type: Number,
    default: 1
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  neverEnds: {
    type: Boolean,
    default: true
  },
  maxOccurrences: {
    type: Number
  },
  currentOccurrences: {
    type: Number,
    default: 0
  },
  nextExecutionDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  reminderEnabled: {
    type: Boolean,
    default: false
  },
  reminderDaysBefore: {
    type: Number,
    default: 1
  },
  lastNotified: {
    type: Date
  }
}, { timestamps: true });

recurringTransactionSchema.index({ user: 1, nextExecutionDate: 1 });
recurringTransactionSchema.index({ isActive: 1, nextExecutionDate: 1 }); // For the cron job

module.exports = mongoose.model('RecurringTransaction', recurringTransactionSchema);
