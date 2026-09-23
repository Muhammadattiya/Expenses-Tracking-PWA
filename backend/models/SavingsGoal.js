const mongoose = require('mongoose');

const savingsGoalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  category: { 
    type: String, 
    enum: ['car', 'marriage', 'vacation', 'real_estate', 'hajj_umrah', 'education', 'electronics', 'other'],
    default: 'other' 
  },
  icon: { type: String, default: 'Target' },
  color: { type: String, default: '#8D6346' },
  targetAmount: { type: Number, required: true, min: 1 },
  currentAmount: { type: Number, default: 0, min: 0 },
  targetDate: { type: Date, required: true },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  allocationType: { type: String, enum: ['dedicated', 'virtual_jar'], default: 'virtual_jar' },
  linkedAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  status: { type: String, enum: ['active', 'achieved', 'paused', 'cancelled'], default: 'active', index: true },
  notes: { type: String, trim: true },
  contributions: [
    {
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      fromAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
      transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
      notes: { type: String, trim: true }
    }
  ]
}, { timestamps: true });

savingsGoalSchema.index({ user: 1, status: 1 });
savingsGoalSchema.index({ user: 1, targetDate: 1 });

module.exports = mongoose.model('SavingsGoal', savingsGoalSchema);
