require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { rebuildUserAnalytics } = require('../services/analyticsEngine');

async function main() {
  console.log('==================================================');
  console.log('🚀 FINOVA CONTROLLED USER ANALYTICS BACKFILL SCRIPT');
  console.log('==================================================\n');

  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is missing in environment.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.\n');

  try {
    const targetUserId = process.argv[2];
    let users = [];

    if (targetUserId) {
      const user = await User.findById(targetUserId).select('_id email name');
      if (!user) {
        console.error(`❌ User ${targetUserId} not found.`);
        process.exit(1);
      }
      users = [user];
      console.log(`Backfilling single user: ${user.email} (${user._id})`);
    } else {
      users = await User.find({}).select('_id email name');
      console.log(`Discovered ${users.length} total users to backfill.`);
    }

    let processed = 0;
    let skipped = 0;

    for (const u of users) {
      const txCount = await Transaction.countDocuments({ user: u._id });
      if (txCount === 0) {
        skipped++;
        continue;
      }

      const start = Date.now();
      await rebuildUserAnalytics(u._id);
      const elapsed = Date.now() - start;
      processed++;
      console.log(`[${processed}/${users.length}] Rebuilt analytics for ${u.email} (${txCount} txs, ${elapsed}ms)`);
    }

    console.log(`\n✅ Finished: ${processed} users backfilled, ${skipped} users skipped (0 transactions).`);
  } catch (err) {
    console.error('❌ Backfill failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}
