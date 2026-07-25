require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const crypto = require('crypto');
const Account = require('../models/Account');

const migrateSmsTokens = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const accounts = await Account.find({ smsWebhookToken: { $exists: false } });
    console.log(`Found ${accounts.length} accounts without SMS webhook token.`);

    let updatedCount = 0;
    for (const account of accounts) {
      account.smsWebhookToken = crypto.randomBytes(16).toString('hex');
      await account.save();
      updatedCount++;
    }

    // Also handle accounts where it's explicitly null
    const nullAccounts = await Account.find({ smsWebhookToken: null });
    console.log(`Found ${nullAccounts.length} accounts with null SMS webhook token.`);
    for (const account of nullAccounts) {
      account.smsWebhookToken = crypto.randomBytes(16).toString('hex');
      await account.save();
      updatedCount++;
    }

    console.log(`Migration complete. Updated ${updatedCount} accounts.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

migrateSmsTokens();
