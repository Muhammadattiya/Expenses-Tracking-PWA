const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Transaction = require('./models/Transaction');
  const txs = await Transaction.aggregate([
    { $match: { user: new mongoose.Types.ObjectId('6a60639cca1b30cf1ce4ff9e'), type: 'expense' } },
    { $group: { _id: '$category', count: { $sum: 1 }, total: { $sum: '$amount' }, minDate: { $min: '$date' }, maxDate: { $max: '$date' } } }
  ]);
  console.log(txs);
  mongoose.disconnect();
}).catch(console.error);
