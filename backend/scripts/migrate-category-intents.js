require('dotenv').config();
const mongoose = require('mongoose');
const { classifyCategoryIntent } = require('../services/categoryIntentClassifier');
const { INTENTS } = require('../services/quickAdd/intentTaxonomy');

const validIntents = new Set(INTENTS.map(i => i.id));

// Legacy mapping just in case an old intent needs to be ported
const intentMap = {
  'ride_hailing': 'transportation',
  'public_transport': 'transportation',
  'taxi': 'transportation'
};

async function runMigration() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI is not defined in environment.');
    process.exit(1);
  }

  console.log('Connecting to Production DB...');
  await mongoose.connect(uri);
  console.log('✅ Connected.');

  const db = mongoose.connection.db;
  const categoriesCollection = db.collection('categories');

  console.log('Fetching categories...');
  const cursor = categoriesCollection.find({});
  let total = 0;
  let updated = 0;
  let preserved = 0;
  let unchanged = 0;
  let nowNull = 0;

  const bulkOps = [];

  while (await cursor.hasNext()) {
    const category = await cursor.next();
    total++;

    const newIntent = classifyCategoryIntent(category.name);
    let finalIntent = newIntent;

    // Preservation Rule
    if (!finalIntent) {
      // Check if it already had a valid intentId or legacy intent
      let existing = category.intentId || category.intent;
      if (existing) {
        if (intentMap[existing]) existing = intentMap[existing];
        if (validIntents.has(existing)) {
          finalIntent = existing;
          preserved++;
        }
      }
    }

    if (!finalIntent) nowNull++;

    if (category.intentId !== finalIntent) {
      bulkOps.push({
        updateOne: {
          filter: { _id: category._id },
          update: { $set: { intentId: finalIntent } }
        }
      });
      updated++;
    } else {
      unchanged++;
    }

    if (bulkOps.length >= 500) {
      await categoriesCollection.bulkWrite(bulkOps);
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length > 0) {
    await categoriesCollection.bulkWrite(bulkOps);
  }

  console.log('\n=============================');
  console.log('📊 MIGRATION REPORT');
  console.log('=============================');
  console.log(`Total Categories Processed: ${total}`);
  console.log(`Categories Updated: ${updated}`);
  console.log(`Categories Unchanged: ${unchanged}`);
  console.log(`Categories Preserved (Classifier returned null but had valid existing intent): ${preserved}`);
  console.log(`Categories with null intentId after migration: ${nowNull}`);
  console.log('=============================\n');

  await mongoose.disconnect();
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
