const mongoose = require('mongoose');

const GlobalMerchantKnowledgeSchema = new mongoose.Schema({
  normalizedMerchant: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  intentId: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('GlobalMerchantKnowledge', GlobalMerchantKnowledgeSchema);
