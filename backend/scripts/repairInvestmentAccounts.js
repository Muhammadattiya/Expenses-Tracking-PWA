const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Account = require('../models/Account');
const Investment = require('../models/Investment');

const repair = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in .env');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB safely.');

    // 1. Find all accounts named 'Investments' or 'استثمارات' whose type is NOT 'investment'
    const mismatchedAccounts = await Account.find({
      name: { $in: ['Investments', 'استثمارات', 'investments', 'investment'] },
      type: { $ne: 'investment' }
    });

    console.log(`🔍 Found ${mismatchedAccounts.length} mismatched investment account(s) to repair.`);

    let repairedCount = 0;
    for (const acc of mismatchedAccounts) {
      console.log(`-> Repairing Account ID: ${acc._id}, User: ${acc.user}, Current Type: ${acc.type}, Name: ${acc.name}`);
      await Account.updateOne(
        { _id: acc._id },
        {
          $set: {
            type: 'investment',
            isSystemAccount: true,
            excludeFromTotal: true,
            icon: 'TrendingUp',
            color: '#eab308'
          }
        }
      );
      repairedCount++;
    }
    console.log(`✅ Successfully updated ${repairedCount} account(s) to type 'investment'.`);

    // 2. Ensure that every user with investments has an investment account
    const usersWithInvestments = await Investment.distinct('user');
    console.log(`🔍 Found ${usersWithInvestments.length} user(s) with active investments.`);

    let createdForUsers = 0;
    for (const userId of usersWithInvestments) {
      const hasInvAccount = await Account.findOne({
        user: userId,
        $or: [{ type: 'investment' }, { name: 'Investments' }, { name: 'استثمارات' }]
      });

      if (!hasInvAccount) {
        // Safe creation without deleting anything
        await Account.create({
          user: userId,
          name: 'Investments',
          type: 'investment',
          icon: 'TrendingUp',
          color: '#eab308',
          isSystemAccount: true,
          excludeFromTotal: true,
          balance_adjustment: 0
        });
        createdForUsers++;
        console.log(`-> Created new Investments account for user: ${userId}`);
      } else if (hasInvAccount.type !== 'investment') {
        await Account.updateOne(
          { _id: hasInvAccount._id },
          {
            $set: {
              type: 'investment',
              isSystemAccount: true,
              excludeFromTotal: true,
              icon: 'TrendingUp',
              color: '#eab308'
            }
          }
        );
        console.log(`-> Promoted existing account ${hasInvAccount._id} to type 'investment' for user ${userId}`);
      }
    }

    console.log(`✅ Completed! New accounts created: ${createdForUsers}. Total repaired: ${repairedCount}. Zero records deleted.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration repair failed:', error);
    process.exit(1);
  }
};

repair();
