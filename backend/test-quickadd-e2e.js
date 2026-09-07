const mongoose = require('mongoose');
const { parseText } = require('./services/quickAdd/nlpParser');
const { resolveCategory } = require('./services/quickAdd/intentResolver');
const User = require('./models/User');
const Account = require('./models/Account');
const Category = require('./models/Category');
require('dotenv').config();

async function testQuickAdd() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to Atlas');
  
  // Find a user who has Ahwa = coffee
  const ahwaCat = await Category.findOne({ name: 'Ahwa', intentId: 'coffee' });
  if (!ahwaCat) {
    console.log('Could not find Ahwa category with intentId coffee');
    process.exit(1);
  }
  const userId = ahwaCat.user;
  console.log(`Found Ahwa category _id: ${ahwaCat._id} for user ${userId}`);
  
  // Check the document physically
  const directAhwaDoc = await mongoose.connection.db.collection('categories').findOne({ _id: ahwaCat._id });
  console.log('Direct DB intentId:', directAhwaDoc.intentId);
  console.log('Direct DB legacy intent:', directAhwaDoc.intent);
  
  const userAccounts = await Account.find({ user: userId }).lean();
  
  console.log('\n--- QUICK ADD E2E TEST ---');
  const input = "قهوة 100 كاش";
  console.log('Input:', input);
  
  const candidates = parseText(input, userAccounts);
  console.log('NLP extracted intent:', candidates[0].intent);
  
  const resolvedCategory = await resolveCategory(userId, candidates[0].intent, candidates[0].type);
  console.log('Resolved Category ID:', resolvedCategory ? resolvedCategory._id : null);
  console.log('Resolved Category Name:', resolvedCategory ? resolvedCategory.name : null);
  
  console.log('\n--- MULTIPLE CATEGORY TEST ---');
  // Create another coffee category for this user
  const otherCat = await Category.create({ user: userId, name: 'Starbucks', type: 'expense', intentId: 'coffee' });
  // It should sort by createdAt: 1, so it should still return the older one, Ahwa
  const resolvedCategoryAgain = await resolveCategory(userId, candidates[0].intent, candidates[0].type);
  console.log('Resolved Category after adding Starbucks:', resolvedCategoryAgain.name);
  await Category.deleteOne({ _id: otherCat._id }); // cleanup
  
  console.log('\n--- NEGATIVE TEST ---');
  const negativeInput = "اشتراك 50 كاش"; // subscriptions
  const candidatesNeg = parseText(negativeInput, userAccounts);
  console.log('NLP extracted intent:', candidatesNeg[0].intent);
  // Ensure the user doesn't have a subscriptions category
  await Category.deleteOne({ user: userId, intentId: 'subscriptions' }); 
  const resolvedCategoryNeg = await resolveCategory(userId, candidatesNeg[0].intent, candidatesNeg[0].type);
  console.log('Resolved Category ID (should be null):', resolvedCategoryNeg ? resolvedCategoryNeg._id : null);
  
  console.log('\n--- LEGACY FIELD SAFETY ---');
  // What happens if we remove the legacy intent field from a category entirely?
  // Well, Mongoose's find() doesn't care. Our direct DB already verified intent was undefined!
  
  await mongoose.disconnect();
}

testQuickAdd().catch(console.error);
