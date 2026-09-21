const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  icon: {
    type: String,
    default: 'Tag'
  },
  intentId: {
    type: String,
    default: null
  },
  intentConfidence: {
    type: Number,
    default: null
  },
  intentSource: {
    type: String,
    enum: ['automatic', 'manual', null],
    default: null
  },
  intentVersion: {
    type: Number,
    default: null
  },
  order: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// عشان نمنع تكرار نفس اسم الفئة في نفس النوع
categorySchema.index({ user: 1, name: 1, type: 1 }, { unique: true });
categorySchema.index({ user: 1, type: 1, order: 1 });

module.exports = mongoose.model('Category', categorySchema);
