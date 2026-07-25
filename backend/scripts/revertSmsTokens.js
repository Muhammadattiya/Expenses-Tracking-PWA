require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const crypto = require('crypto');
const Account = require('../models/Account');
const User = require('../models/User');

const revertSmsTokens = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Unset smsWebhookToken from all Accounts
    const accountResult = await Account.updateMany({}, { $unset: { smsWebhookToken: "" } });
    console.log(`Unset smsWebhookToken from ${accountResult.modifiedCount} accounts.`);

    // 2. Ensure all Users have an smsWebhookToken
    const usersWithoutToken = await User.find({ smsWebhookToken: { $exists: false } });
    console.log(`Found ${usersWithoutToken.length} users without smsWebhookToken.`);
    
    let usersUpdated = 0;
    for (const user of usersWithoutToken) {
      user.smsWebhookToken = crypto.randomBytes(16).toString('hex');
      await user.save();
      usersUpdated++;
    }

    const nullTokenUsers = await User.find({ smsWebhookToken: null });
    console.log(`Found ${nullTokenUsers.length} users with null smsWebhookToken.`);
    
    for (const user of nullTokenUsers) {
      user.smsWebhookToken = crypto.randomBytes(16).toString('hex');
      await user.save();
      usersUpdated++;
    }

    console.log(`Generated tokens for ${usersUpdated} users.`);
    console.log('Migration complete.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

revertSmsTokens();
