require('dotenv').config();
const mongoose = require('mongoose');
const { INTENTS } = require('../services/quickAdd/intentTaxonomy');

const validIntents = new Set(INTENTS.map(i => i.id));

async function runAudit() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is missing');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const categoriesCol = db.collection('categories');

  const total = await categoriesCol.countDocuments({});
  
  const allCategories = await categoriesCol.find({}).toArray();
  
  let validIntentId = 0;
  let explicitNullIntentId = 0;
  let missingIntentId = 0;
  let invalidIntentId = 0;
  let legacyIntent = 0;
  let unexpectedIntents = [];

  for (const cat of allCategories) {
    if (cat.intentId === null) {
      explicitNullIntentId++;
    } else if (cat.intentId === undefined) {
      missingIntentId++;
    } else if (validIntents.has(cat.intentId)) {
      validIntentId++;
    } else {
      invalidIntentId++;
      unexpectedIntents.push(cat.intentId);
    }

    if (cat.intent !== undefined) {
      legacyIntent++;
    }
  }

  console.log({
    dbName: db.databaseName,
    collection: 'categories',
    total,
    validIntentId,
    explicitNullIntentId,
    missingIntentId,
    invalidIntentId,
    legacyIntent,
    unexpectedIntents
  });

  console.log('Examples:');
  console.log(allCategories.filter(c => c.name.toLowerCase().includes('ahwa') || c.name.toLowerCase().includes('family') || c.name.toLowerCase().includes('stuff')).map(c => ({ name: c.name, intentId: c.intentId, intent: c.intent })));

  await mongoose.disconnect();
}

runAudit().catch(console.error);
