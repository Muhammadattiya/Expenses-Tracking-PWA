const mongoose = require('mongoose');

const simulationHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  actions: [{
    type: { 
      type: String, 
      required: true,
      enum: ['purchase', 'salary', 'budget', 'debt', 'bill', 'recurring', 'investment']
    },
    payload: { type: mongoose.Schema.Types.Mixed, required: true }
  }],
}, { timestamps: true });

module.exports = mongoose.model('SimulationHistory', simulationHistorySchema);
