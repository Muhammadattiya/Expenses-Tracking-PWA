require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
const Category = require('./models/Category');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const txs = await Transaction.find({ type: 'expense' }).limit(5).populate('category');
  console.log('Sample Txs:', JSON.stringify(txs, null, 2));
  
  const stats = await Transaction.aggregate([
    { $match: { type: 'expense' } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);
  console.log('Txs per category:', stats);
  process.exit(0);
});
