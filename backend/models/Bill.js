const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: {
    type: String,
    required: true,
    trim: true
  },
  expectedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: true
  },
  notes: {
    type: String
  },
  dueDate: {
    type: Date,
    required: true
  },
  repeat: {
    type: String,
    enum: ['never', 'monthly', 'yearly', 'weekly'],
    default: 'never'
  },
  reminderEnabled: {
    type: Boolean,
    default: false
  },
  reminderDaysBefore: {
    type: Number,
    default: 1 // 0 (same day), 1, 3, 7
  },
  notificationEnabled: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'due_today', 'overdue', 'paid'],
    default: 'upcoming'
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  paymentDate: {
    type: Date
  },
  lastNotified: {
    type: Date
  }
}, { timestamps: true });

billSchema.index({ user: 1, dueDate: 1 });
billSchema.index({ isActive: 1, status: 1, dueDate: 1 }); // Useful for cron jobs querying unpaid bills

module.exports = mongoose.model('Bill', billSchema);
