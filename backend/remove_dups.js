const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/expenses-tracker/backend/.env' });
const Transaction = require('d:/expenses-tracker/backend/models/Transaction');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const dups = await mongoose.connection.db.collection('transactions').aggregate([
    { $match: { idempotencyKey: { $type: 'string' } } },
    { $group: { _id: { user: '$user', idempotencyKey: '$idempotencyKey' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  let removed = 0;
  for (const dup of dups) {
    const idsToRemove = dup.ids.slice(1);
    await mongoose.connection.db.collection('transactions').deleteMany({ _id: { $in: idsToRemove } });
    removed += idsToRemove.length;
  }
  
  console.log(`Removed ${removed} duplicates`);

  console.log('Syncing indexes...');
  await Transaction.syncIndexes();
  const indexes = await mongoose.connection.db.collection('transactions').indexes();
  console.log('Current indexes:', indexes.map(i => i.name));

  process.exit(0);
}

run().catch(console.error);
