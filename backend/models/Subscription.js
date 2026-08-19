const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  endpoint: { type: String, required: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  createdAt: { type: Date, default: Date.now }
});

subscriptionSchema.index({ endpoint: 1 });
subscriptionSchema.index({ user: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
