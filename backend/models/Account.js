const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['cash', 'bank', 'wallet', 'investment'],
    default: 'cash'
  },
  icon: {
    type: String,
    default: 'Wallet'
  },
  color: {
    type: String,
    default: '#3b82f6'
  },
  balance_adjustment: {
    type: Number,
    default: 0
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isSavingsAccount: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isSystemAccount: {
    type: Boolean,
    default: false
  },
  excludeFromTotal: {
    type: Boolean,
    default: false
  },
  cardLast4: {
    type: String,
    trim: true,
    match: [/^\d{4}$/, 'Card must be exactly 4 digits']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

accountSchema.index({ user: 1, name: 1 }, { unique: true });
accountSchema.index({ user: 1, type: 1 });

module.exports = mongoose.model('Account', accountSchema);
