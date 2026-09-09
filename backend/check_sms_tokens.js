require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkTokens() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({ smsWebhookToken: { $exists: true, $ne: null } }).select('+smsWebhookToken');
    let plaintextCount = 0;
    let hashedCount = 0;
    
    for (const u of users) {
      if (u.smsWebhookToken.length === 64 && /^[a-f0-9]+$/i.test(u.smsWebhookToken)) {
        hashedCount++;
      } else {
        plaintextCount++;
      }
    }
    
    const allUsers = await User.countDocuments();
    console.log('Total users:', allUsers);
    console.log('Users with token:', users.length);
    console.log('Plaintext tokens:', plaintextCount);
    console.log('Hashed tokens:', hashedCount);
    console.log('Missing tokens:', allUsers - users.length);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkTokens();
