const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/expenses-tracker/backend/.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const res = await mongoose.connection.db.collection('transactions').deleteMany({ idempotencyKey: { $type: 'string' } });
  console.log(`Deleted ${res.deletedCount} transactions`);

  await mongoose.connection.db.collection('transactions').createIndex({ user: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
  console.log('Index created');

  process.exit(0);
}

run().catch(console.error);
