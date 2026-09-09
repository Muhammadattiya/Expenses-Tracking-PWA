require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');

const migrateSmsTokens = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all users who have an SMS webhook token
    const users = await User.find({ smsWebhookToken: { $exists: true, $type: 'string', $ne: '' } }).select('+smsWebhookToken');
    console.log(`Found ${users.length} users with SMS webhook tokens.`);

    let migrated = 0;
    let skipped = 0;

    for (const user of users) {
      if (user.smsWebhookToken.length === 64) {
        // Assume already hashed (SHA-256 hex string is 64 chars)
        skipped++;
        continue;
      }

      // Hash the existing raw token
      const hashedToken = crypto.createHash('sha256').update(user.smsWebhookToken).digest('hex');
      
      // Update directly
      await User.updateOne({ _id: user._id }, { $set: { smsWebhookToken: hashedToken } });
      migrated++;
    }

    console.log(`Migration complete. Migrated: ${migrated}, Skipped (already hashed): ${skipped}`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

migrateSmsTokens();
