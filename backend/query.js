
const mongoose = require('mongoose');
require('dotenv').config();
const transactionSchema = new mongoose.Schema({
  idempotencyKey: String, source: String, date: Date
}, { strict: false });
const Transaction = mongoose.model('Transaction', transactionSchema);
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const transactions = await Transaction.find({ idempotencyKey: { $exists: true } }).sort({ date: -1 }).limit(10);
  console.log(JSON.stringify(transactions, null, 2));
  process.exit(0);
}).catch(console.error);

