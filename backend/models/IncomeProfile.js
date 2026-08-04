const mongoose = require('mongoose');

const incomeProfileSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  frequency: {
    type: String,
    enum: ['weekly', 'monthly'],
    required: true
  },
  weekDay: {
    type: Number,
    min: 0,
    max: 6,
    default: 0
  },
  monthDay: {
    type: Number,
    min: 1,
    max: 31,
    default: 1
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category"
  },
  lastExecutionDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

incomeProfileSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('IncomeProfile', incomeProfileSchema);
