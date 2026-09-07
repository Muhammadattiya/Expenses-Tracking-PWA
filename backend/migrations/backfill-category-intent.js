const mongoose = require('mongoose');
const Category = require('../models/Category');
const { classifyCategoryIntent } = require('../services/categoryIntentClassifier');
require('dotenv').config();

async function backfillCategoryIntents() {
  console.log('--- STARTING CATEGORY INTENT BACKFILL ---');
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/finova';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB.\n');

  // Find categories that don't have intentId or intentId is null.
  // Wait, the requirement says: "populate intentId. unknown categories receive null. migration must be safe to run more than once."
  // To be perfectly idempotent and fix everything, let's just run it on ALL categories.
  
  const categories = await Category.find({});
  let updatedCount = 0;
  let skippedCount = 0;

  for (const cat of categories) {
    const determinedIntent = classifyCategoryIntent(cat.name) || null;
    
    // Only update if it's different, to avoid unnecessary writes
    if (cat.intentId !== determinedIntent) {
      await Category.updateOne(
        { _id: cat._id },
        { $set: { intentId: determinedIntent } }
      );
      updatedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`✅ Backfill complete. Updated: ${updatedCount}, Skipped/Unchanged: ${skippedCount}`);
  await mongoose.disconnect();
}

backfillCategoryIntents().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
