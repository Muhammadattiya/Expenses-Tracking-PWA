const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true, index: true },
  password: { type: String, select: false },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  phoneNumber: { type: String, trim: true, default: null },
  profileEditsRemaining: { type: Number, default: 3 },
  picture: String,
  smsWebhookToken: { 
    type: String, 
    unique: true, 
    sparse: true, 
    index: true,
    select: false // Hide by default
  },
  shortcutTokenHash: {
    type: String,
    select: false
  },
  shortcutTokenCreatedAt: {
    type: Date,
    select: false
  },
  preferences: {
    trackingPeriod: { type: String, enum: ['weekly', 'monthly'], default: 'monthly' },
    trackingStartDayWeekly: { type: Number, min: 0, max: 6, default: 6 },
    trackingStartDayMonthly: { type: Number, min: 1, max: 31, default: 1 }
  },
  lastSurvivalRisk: {
    type: String,
    enum: ['Safe', 'Low Risk', 'Medium Risk', 'High Risk'],
    default: 'Safe'
  },
  hasCompletedOnboarding: {
    type: Boolean,
    default: false
  },
  tokenVersion: {
    type: Number,
    default: 0
  },
  goldApiLimit: {
    date: { type: String, default: null },
    count: { type: Number, default: 0 },
    lastPrice: { type: mongoose.Schema.Types.Mixed, default: null }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
