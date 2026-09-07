const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Transaction = require('./models/Transaction');
const GlobalMerchantKnowledge = require('./models/GlobalMerchantKnowledge');
const UserMerchantKnowledge = require('./models/UserMerchantKnowledge');
const { classifyCategoryIntent } = require('./services/categoryIntentClassifier');
const { createCategory, updateCategory } = require('./services/categoryService');
const { handleSmsWebhook } = require('./controllers/smsWebhookController');
const { updateTransaction } = require('./services/transactionService');
const { INTENTS } = require('./services/quickAdd/intentTaxonomy');
require('dotenv').config();

async function runForensicAudit() {
  console.log('=== PART 1 & 3: TAXONOMY & CLASSIFICATION ===');
  console.log('Defined Intents:', INTENTS.map(i => i.id).join(', '));
  
  const testCases = [
    { name: 'Ahwa', exp: 'coffee' },
    { name: 'Mwaslat', exp: 'transportation' },
    { name: 'Akl', exp: 'food_and_drink' },
    { name: 'Groceries', exp: 'groceries' },
    { name: 'Salary', exp: 'salary' },
    { name: 'Internet Bill', exp: 'bills' } // internet or bills is allowed
  ];
  testCases.forEach(tc => {
    const res = classifyCategoryIntent(tc.name);
    console.log(`Classifier "${tc.name}": ${res} (Expected: ${tc.exp} or alternative)`);
  });
  
  console.log('\n=== PART 2 & 4: MONGODB TARGET ===');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finova';
  const url = new URL(mongoUri);
  console.log(`Host: ${url.hostname}`);
  console.log(`Database: ${url.pathname.substring(1)}`);
  console.log(`Category Collection: ${Category.collection.name}`);

  await mongoose.connect(mongoUri);
  
  console.log('\n=== PART 5: DIRECT MONGODB FORENSIC CHECK (AHWA) ===');
  const targetId = '6a62394086f11b8659d54c71';
  let targetDoc = null;
  if (mongoose.Types.ObjectId.isValid(targetId)) {
    targetDoc = await mongoose.connection.db.collection('categories').findOne({ _id: new mongoose.Types.ObjectId(targetId) });
  }
  
  if (targetDoc) {
    console.log('Target Document:', JSON.stringify(targetDoc));
    if (targetDoc.intentId === undefined) {
      console.log('Status: MISSING');
    } else if (targetDoc.intentId === null) {
      console.log('Status: NULL');
    } else {
      console.log(`Status: PRESENT (${targetDoc.intentId})`);
    }
  } else {
    console.log(`Status: MISSING (Document ${targetId} not found in this DB)`);
  }

  console.log('\n=== PART 7: SCHEMA INSPECTION ===');
  const schemaObj = Category.schema.obj;
  console.log('intentId in schema:', !!schemaObj.intentId);
  console.log('intentId type:', schemaObj.intentId?.type?.name);
  console.log('intentId default:', schemaObj.intentId?.default);

  console.log('\n=== PART 8: REAL TEMPORARY CATEGORY ===');
  const ts = Date.now();
  const testUser = await User.findOne();
  if (testUser) {
    const coffeeName = `FORENSIC COFFEE TEST ${ts}`;
    const newCat = await createCategory(testUser._id, { name: coffeeName, type: 'expense' });
    const directCoffeeDoc = await mongoose.connection.db.collection('categories').findOne({ _id: newCat._id });
    console.log(`Created ${coffeeName}`);
    console.log('Service returned intentId:', newCat.intentId);
    console.log('Direct DB intentId:', directCoffeeDoc.intentId);
    
    console.log('\n=== PART 9: UNKNOWN CATEGORY ===');
    const unknownName = `FORENSIC UNKNOWN TEST ${ts}`;
    const newUnknownCat = await createCategory(testUser._id, { name: unknownName, type: 'expense' });
    const directUnknownDoc = await mongoose.connection.db.collection('categories').findOne({ _id: newUnknownCat._id });
    console.log(`Created ${unknownName}`);
    console.log('Service returned intentId:', newUnknownCat.intentId);
    console.log('Direct DB intentId:', directUnknownDoc.intentId);
    
    console.log('\n=== PART 14: CATEGORY RENAME / UPDATE ===');
    const updatedCat = await updateCategory(testUser._id, newCat._id.toString(), { name: 'Renamed Coffee Test' });
    const directUpdatedDoc = await mongoose.connection.db.collection('categories').findOne({ _id: newCat._id });
    console.log('Renamed to:', updatedCat.name);
    console.log('Service returned intentId:', updatedCat.intentId);
    console.log('Direct DB intentId:', directUpdatedDoc.intentId);
    
    // Cleanup temporary cats
    await Category.deleteOne({ _id: newCat._id });
    await Category.deleteOne({ _id: newUnknownCat._id });
  }

  console.log('\n=== PART 10 & 11: MIGRATION BACKFILL ===');
  const { classifyCategoryIntent: classifyForMig } = require('./services/categoryIntentClassifier');
  
  async function runMigration() {
    let matchedCount = 0;
    let modifiedCount = 0;
    const allCats = await Category.find({});
    for (const cat of allCats) {
      const intent = classifyForMig(cat.name) || null;
      if (cat.intentId !== intent) {
        await Category.updateOne({ _id: cat._id }, { $set: { intentId: intent } });
        modifiedCount++;
      }
      matchedCount++;
    }
    return { matchedCount, modifiedCount };
  }

  const run1 = await runMigration();
  console.log(`Run 1 - Matched: ${run1.matchedCount}, Modified: ${run1.modifiedCount}`);
  
  const run2 = await runMigration();
  console.log(`Run 2 - Matched: ${run2.matchedCount}, Modified: ${run2.modifiedCount}`);

  console.log('\n=== PART 12: DATABASE COUNTS ===');
  const total = await Category.countDocuments();
  const valid = await Category.countDocuments({ intentId: { $type: 'string' } });
  const isNull = await Category.countDocuments({ intentId: null });
  const missing = await Category.countDocuments({ intentId: { $exists: false } });
  const invalid = total - (valid + isNull + missing);
  const legacy = await Category.countDocuments({ intent: { $exists: true } });
  
  console.log(`TOTAL: ${total}`);
  console.log(`VALID: ${valid}`);
  console.log(`NULL: ${isNull}`);
  console.log(`MISSING: ${missing}`);
  console.log(`INVALID: ${invalid}`);
  console.log(`LEGACY intent field: ${legacy}`);
  
  const sample = await Category.findOne().lean();
  console.log('Sample:', JSON.stringify(sample));
  
  await mongoose.disconnect();
}

runForensicAudit().catch(console.error);
