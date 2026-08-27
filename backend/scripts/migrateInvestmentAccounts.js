require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Account = require('../models/Account');

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const users = await User.find();
    let createdCount = 0;

    for (const user of users) {
      const existingAccount = await Account.findOne({ user: user._id, type: 'investment' });
      if (!existingAccount) {
        await Account.create({
          user: user._id,
          name: 'Investments',
          type: 'investment',
          icon: 'TrendingUp',
          color: '#eab308',
          isSystemAccount: true,
          excludeFromTotal: true
        });
        createdCount++;
        console.log(`Created investment account for user ${user._id}`);
      }
    }

    console.log(`Migration completed successfully. Created ${createdCount} accounts.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
