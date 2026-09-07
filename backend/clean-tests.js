const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Transaction = require('./models/Transaction');
const GlobalMerchantKnowledge = require('./models/GlobalMerchantKnowledge');
const UserMerchantKnowledge = require('./models/UserMerchantKnowledge');
require('dotenv').config();

async function cleanData() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finova');
  
  // Find test users
  const testUsers = await User.find({
    $or: [
      { email: { $regex: 'audit' } },
      { email: { $regex: 'test' } },
      { name: { $regex: 'Audit' } },
      { name: { $regex: 'Test' } }
    ]
  });
  
  const testUserIds = testUsers.map(u => u._id);
  
  if (testUserIds.length === 0) {
    console.log('No test users found.');
  } else {
    console.log(`Found ${testUserIds.length} test users. Identifying test artifacts...`);
    
    // Categories to remove
    const catResult = await Category.deleteMany({ user: { $in: testUserIds } });
    console.log(`Removed ${catResult.deletedCount} test categories.`);
    
    // Transactions to remove
    const txResult = await Transaction.deleteMany({ user: { $in: testUserIds } });
    console.log(`Removed ${txResult.deletedCount} test transactions.`);

    // Users to remove
    const userResult = await User.deleteMany({ _id: { $in: testUserIds } });
    console.log(`Removed ${userResult.deletedCount} test users.`);
  }

  const remainingCats = await Category.find().lean();
  console.log(`\nRemaining Real Categories: ${remainingCats.length}`);
  remainingCats.forEach(c => console.log(`- ${c.name} -> ${c.intentId}`));
  
  await mongoose.disconnect();
}

cleanData().catch(console.error);
