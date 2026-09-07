const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
require('dotenv').config();

async function runTest() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Find a real Uncategorized transaction
  let tx = await Transaction.findOne({ category: null, status: 'completed' });
  
  if (!tx) {
    console.log('No uncategorized transaction found. Creating one for test...');
    tx = await Transaction.create({
      user: new mongoose.Types.ObjectId(), // Dummy or real
      amount: 50,
      title: 'SEUDI SUPERMARKET',
      type: 'expense',
      status: 'completed',
      date: new Date()
    });
  }
  
  console.log('--- BEFORE SKIP ---');
  console.log('ID:', tx._id.toString());
  console.log('Status:', tx.status);
  console.log('Category:', tx.category);
  console.log('Amount:', tx.amount);
  console.log('Title:', tx.title);
  
  console.log('\n--- UI ACTION: SKIP ---');
  console.log('Frontend sets skippedTransactionIds.add(tx._id).');
  console.log('No API request is made.');
  
  console.log('\n--- AFTER SKIP (DB VERIFICATION) ---');
  const txAfter = await Transaction.findById(tx._id);
  console.log('Status:', txAfter.status);
  console.log('Category:', txAfter.category);
  console.log('Amount:', txAfter.amount);
  console.log('Title:', txAfter.title);
  
  await mongoose.disconnect();
}

runTest().catch(console.error);
