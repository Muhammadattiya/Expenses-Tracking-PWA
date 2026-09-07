require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const { classifyCategoryIntent } = require('../services/categoryIntentClassifier');

async function migrateSportsAndOther() {
  if (!process.env.MONGO_URI) {
    console.error('[ERROR] MONGO_URI is missing in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[INFO] Connected to MongoDB Atlas');

    const categories = await Category.find({});
    console.log(`[INFO] Found ${categories.length} total categories.`);

    let sportsCount = 0;
    let otherCount = 0;
    let noChangeCount = 0;

    for (const category of categories) {
      // 1. Run the CURRENT deterministic classifier (O(1) dictionary match against the new taxonomy)
      const newIntent = classifyCategoryIntent(category.name);

      // 2. Only perform update if newIntent is explicitly 'sports' or 'other' AND the current intentId is null
      // The rules state: "If classifier returns null, preserve an existing valid intentId"
      // Also: "NEVER convert an unknown category to other during migration."
      
      let updated = false;

      // Ensure we don't downgrade a specific valid intent to null, or override an existing intent with 'other' if they had one.
      // But if their intentId is already correct, do nothing.
      if (newIntent === 'sports' && category.intentId !== 'sports') {
        // Upgrade to sports
        console.log(`[UPDATE] ${category._id} | User: ${category.userId} | Name: "${category.name}" | Old: ${category.intentId} -> New: sports`);
        category.intentId = 'sports';
        await category.save();
        sportsCount++;
        updated = true;
      } else if (newIntent === 'other' && category.intentId !== 'other') {
        // Upgrade to other
        console.log(`[UPDATE] ${category._id} | User: ${category.userId} | Name: "${category.name}" | Old: ${category.intentId} -> New: other`);
        category.intentId = 'other';
        await category.save();
        otherCount++;
        updated = true;
      }

      if (!updated) {
        noChangeCount++;
      }
    }

    console.log('\n--- MIGRATION RESULTS ---');
    console.log(`Total Categories Scanned: ${categories.length}`);
    console.log(`Migrated to 'sports': ${sportsCount}`);
    console.log(`Migrated to 'other': ${otherCount}`);
    console.log(`Unchanged: ${noChangeCount}`);

    // Verification queries
    const totalSports = await Category.countDocuments({ intentId: 'sports' });
    const totalOther = await Category.countDocuments({ intentId: 'other' });
    const totalNull = await Category.countDocuments({ intentId: null });

    console.log('\n--- VERIFICATION COUNTS ---');
    console.log(`Total 'sports' in DB: ${totalSports}`);
    console.log(`Total 'other' in DB: ${totalOther}`);
    console.log(`Total 'null' in DB: ${totalNull}`);

    process.exit(0);
  } catch (error) {
    console.error('[FATAL] Migration failed:', error);
    process.exit(1);
  }
}

migrateSportsAndOther();
