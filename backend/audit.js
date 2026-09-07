const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Transaction = require('./models/Transaction');
const GlobalMerchantKnowledge = require('./models/GlobalMerchantKnowledge');
const { handleSmsWebhook } = require('./controllers/smsWebhookController');
const { classifyCategoryIntent } = require('./services/categoryIntentClassifier');
const { updateTransaction } = require('./services/transactionService');
require('dotenv').config();

async function runAudit() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finova');
  
  const totalCategories = await Category.countDocuments();
  const withIntentId = await Category.countDocuments({ intentId: { $ne: null } });
  const withNullIntent = await Category.countDocuments({ intentId: null });
  const missingIntentId = await Category.countDocuments({ intentId: { $exists: false } });

  console.log('\n--- 3. CATEGORY DB AUDIT ---');
  console.log('Total Categories: ' + totalCategories);
  console.log('With string intentId: ' + withIntentId);
  console.log('With null intentId: ' + withNullIntent);
  console.log('Missing intentId field: ' + missingIntentId);

  const sampleCats = await Category.find().limit(5).lean();
  console.log('Real category samples:');
  sampleCats.forEach(c => {
    console.log('- ' + c.name + ' -> DB Intent: ' + c.intentId);
  });

  console.log('\n--- 4. CATEGORY CLASSIFIER AUDIT ---');
  const tests = ['Ahwa', 'Mwaslat', 'Akl', 'Rent', 'My Weird Category XYZ', 'Food'];
  tests.forEach(name => {
    const intent = classifyCategoryIntent(name);
    console.log('Classifier: ' + name + ' -> ' + intent);
  });

  console.log('\n--- 5. SMS E2E AUDIT ---');
  await User.deleteMany({ email: 'audit@example.com' });
  const auditUser = await User.create({
    name: 'Audit User',
    email: 'audit@example.com',
    password: 'password123',
    smsWebhookToken: 'audit-token-123'
  });

  const ahwaCat = await Category.create({
    user: auditUser._id,
    name: 'Ahwa',
    type: 'expense',
    intentId: 'coffee'
  });

  await Transaction.deleteMany({ user: auditUser._id });

  let req = {
    params: { userToken: 'audit-token-123' },
    body: { text: 'Purchase of EGP 50.00 at STARBUCKS on card ending 1234' }
  };
  
  let resStatus, resJson;
  let res = {
    status: (code) => { resStatus = code; return res; },
    json: (data) => { resJson = data; return res; }
  };

  await handleSmsWebhook(req, res);
  
  let txA = await Transaction.findOne({ user: auditUser._id, amount: 50 });
  console.log('\nPATH A (Auto-categorized STARBUCKS):');
  console.log('HTTP Response: ' + resStatus + ' ' + JSON.stringify(resJson));
  console.log('DB Transaction Created? ' + !!txA);
  if (txA) {
    console.log('Status: ' + txA.status);
    console.log('CategoryId: ' + txA.category);
    console.log('Matches Ahwa? ' + (txA.category?.toString() === ahwaCat._id.toString()));
  }

  req.body.text = 'Purchase of EGP 100.00 at NOLA on card ending 1234';
  await handleSmsWebhook(req, res);

  let txB = await Transaction.findOne({ user: auditUser._id, amount: 100 });
  console.log('\nPATH B (Uncategorized UNKNOWN NOLA):');
  console.log('DB Transaction Created? ' + !!txB);
  if (txB) {
    console.log('Status: ' + txB.status);
    console.log('CategoryId: ' + txB.category);
  }

  req.body.text = 'Purchase of EGP 200.00 at FATHALLAH MARKET on card ending 1234';
  await handleSmsWebhook(req, res);

  let txC = await Transaction.findOne({ user: auditUser._id, amount: 200 });
  console.log('\nPATH C (Uncategorized NO MATCH FATHALLAH MARKET -> groceries):');
  console.log('DB Transaction Created? ' + !!txC);
  if (txC) {
    console.log('Status: ' + txC.status);
    console.log('CategoryId: ' + txC.category);
  }

  console.log('\n--- 7. & 8. LEARNING & AUTO-RECLASSIFICATION AUDIT ---');
  await GlobalMerchantKnowledge.deleteMany({ normalizedMerchant: 'NOLA' });

  const txE = await Transaction.create({
    user: auditUser._id,
    title: 'NOLA',
    normalizedMerchant: 'NOLA',
    amount: 999,
    type: 'expense',
    source: 'sms_shortcut'
  });

  await updateTransaction(auditUser._id, txB._id, { category: ahwaCat._id });

  const globalNola = await GlobalMerchantKnowledge.findOne({ normalizedMerchant: 'NOLA' });
  console.log('Global Intent for NOLA learned? ' + !!globalNola);
  if (globalNola) {
    console.log('Stored Intent: ' + globalNola.intentId);
    console.log('Is categoryId stored? ' + (globalNola.categoryId !== undefined));
  }

  const fetchedTxE = await Transaction.findById(txE._id);
  console.log('Auto-reclassified Tx E? CategoryId: ' + fetchedTxE.category + ', Expected: ' + ahwaCat._id);

  await mongoose.disconnect();
}

runAudit().catch(console.error);
