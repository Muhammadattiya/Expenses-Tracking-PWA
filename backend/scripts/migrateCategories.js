require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const { classifyCategoryIntent } = require('../services/categoryIntentClassifier');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finova';

async function migrateCategories() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    const categories = await Category.find({});
    let migratedCount = 0;
    let skippedCount = 0;

    for (const category of categories) {
      const resolvedIntentId = classifyCategoryIntent(category.name);

      let updated = false;

      // Migrate from old 'intent' field to new 'intentId' field if needed
      if (category.intent && !category.intentId) {
        category.intentId = category.intent;
        updated = true;
      }

      // Re-classify using the new Phase 3 expanded taxonomy
      if (resolvedIntentId && category.intentId !== resolvedIntentId) {
        category.intentId = resolvedIntentId;
        updated = true;
      }

      // If category still has intentId as null but we resolved it
      if (!category.intentId && resolvedIntentId) {
         category.intentId = resolvedIntentId;
         updated = true;
      }

      if (updated) {
        await category.save();
        migratedCount++;
        console.log(`[MIGRATED] Category: "${category.name}" -> Intent: ${category.intentId}`);
      } else {
        skippedCount++;
      }
    }

    console.log(`\nMigration completed.`);
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Skipped (already up-to-date or no intent matched): ${skippedCount}`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateCategories();
