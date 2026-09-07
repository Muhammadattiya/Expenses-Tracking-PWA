const mongoose = require('mongoose');

const UserMerchantKnowledgeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  normalizedMerchant: {
    type: String,
    required: true,
    trim: true
  },
  intentId: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// A user can only have one learned intent per normalized merchant
UserMerchantKnowledgeSchema.index({ user: 1, normalizedMerchant: 1 }, { unique: true });

module.exports = mongoose.model('UserMerchantKnowledge', UserMerchantKnowledgeSchema);
