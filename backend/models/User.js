const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  picture: String,
  smsWebhookToken: { 
    type: String, 
    unique: true, 
    sparse: true, 
    index: true,
    default: () => require('crypto').randomBytes(16).toString('hex')
  },
  preferences: {
    budgetPeriod: { type: String, enum: ['weekly', 'monthly'], default: 'monthly' },
    budgetStartDayWeekly: { type: Number, min: 0, max: 6, default: 6 },
    budgetStartDayMonthly: { type: Number, min: 1, max: 31, default: 1 }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
