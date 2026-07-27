const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  owedAmount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  payments: [{ amount: { type: Number, required: true }, account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true }, paidAt: { type: Date, default: Date.now }, transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' } }],
}, { _id: true });

const receivableSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  paidAmount: { type: Number, required: true, min: 0 },
  paidFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  receivedAmount: { type: Number, default: 0, min: 0 },
  receivedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
  expenseCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  expenseTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  paidSettlementTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  receivedSettlementTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  participants: { type: [participantSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Receivable', receivableSchema);
