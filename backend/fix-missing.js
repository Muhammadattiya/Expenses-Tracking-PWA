const mongoose = require('mongoose');
require('dotenv').config();

async function fixMissing() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to Atlas');
  
  const categories = mongoose.connection.db.collection('categories');
  const result = await categories.updateMany(
    { intentId: { $exists: false } },
    { $set: { intentId: null } }
  );
  console.log(`Updated ${result.modifiedCount} missing documents to intentId: null`);
  await mongoose.disconnect();
}

fixMissing().catch(console.error);
