const mongoose = require('mongoose');
require('dotenv').config();

async function runReadOnlyAudit() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to Atlas');
  
  const categories = mongoose.connection.db.collection('categories');
  
  const total = await categories.countDocuments();
  const exists = await categories.countDocuments({ intentId: { $exists: true } });
  const validString = await categories.countDocuments({ intentId: { $type: 'string' } });
  const isNull = await categories.countDocuments({ intentId: null });
  const isMissing = await categories.countDocuments({ intentId: { $exists: false } });
  
  // legacy intent
  const legacyIntent = await categories.countDocuments({ intent: { $exists: true } });

  console.log(`TOTAL documents: ${total}`);
  console.log(`Documents where intentId exists: ${exists}`);
  console.log(`Documents where intentId is a valid string: ${validString}`);
  console.log(`Documents where intentId is null: ${isNull}`);
  console.log(`Documents where intentId is missing: ${isMissing}`);
  console.log(`Documents containing legacy intent: ${legacyIntent}`);
  
  console.log('\n--- SAMPLE CATEGORIES ---');
  const samples = await categories.find({ name: { $in: ['Food', 'Ahwa', 'Salary', 'Transportation', 'Groceries', 'Coffee'] } }).limit(10).toArray();
  samples.forEach(s => {
    console.log(`_id: ${s._id} | name: ${s.name} | type: ${s.type} | intentId: ${s.intentId} | legacy intent: ${s.intent}`);
  });

  await mongoose.disconnect();
}

runReadOnlyAudit().catch(console.error);
