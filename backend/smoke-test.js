const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Transaction = require('./models/Transaction');
const GlobalMerchantKnowledge = require('./models/GlobalMerchantKnowledge');
const { handleSmsWebhook } = require('./controllers/smsWebhookController');
require('dotenv').config();

async function smokeTest() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finova');
  
  console.log('\n--- PHASE 4 SMOKE TEST ---');
  
  await User.deleteMany({ email: 'smoke@example.com' });
  const smokeUser = await User.create({
    name: 'Smoke User',
    email: 'smoke@example.com',
    password: 'password123',
    smsWebhookToken: 'smoke-token'
  });

  const cat1 = await Category.create({ user: smokeUser._id, name: 'Sweets', type: 'expense', intentId: 'food_and_drink' });

  let req = {
    params: { userToken: 'smoke-token' },
    body: { text: 'Purchase of EGP 1500.00 at SEUDI SUPERMARKET on card ending 1234', sender: 'CIB' }
  };
  let resStatus, resJson;
  let res = { status: (c) => { resStatus = c; return res; }, json: (d) => { resJson = d; return res; } };
  
  await handleSmsWebhook(req, res);
  const tx1 = await Transaction.findOne({ user: smokeUser._id, amount: 1500 });
  console.log('Tx 1 (SEUDI):', { status: tx1?.status, categoryId: tx1?.category });

  req.body.text = 'Purchase of EGP 200.00 at ABU AUF on card ending 1234';
  await handleSmsWebhook(req, res);
  const tx2 = await Transaction.findOne({ user: smokeUser._id, amount: 200 });
  console.log('Tx 2 (ABU AUF):', { status: tx2?.status, categoryId: tx2?.category });

  if (tx2) {
    const { updateTransaction } = require('./services/transactionService');
    await updateTransaction(smokeUser._id, tx2._id, { category: cat1._id });
    await new Promise(r => setTimeout(r, 2000));
  }

  req.body.text = 'Purchase of EGP 300.00 at ABU AUF on card ending 1234';
  await handleSmsWebhook(req, res);
  const tx3 = await Transaction.findOne({ user: smokeUser._id, amount: 300 });
  console.log('Tx 3 (ABU AUF - post-learn):', { status: tx3?.status, categoryId: tx3?.category, matchesCat1: tx3?.category?.toString() === cat1._id.toString() });

  console.log('Cleaning up smoke test artifacts...');
  await Transaction.deleteMany({ user: smokeUser._id });
  await Category.deleteMany({ user: smokeUser._id });
  await User.deleteOne({ _id: smokeUser._id });
  await GlobalMerchantKnowledge.deleteMany({ normalizedMerchant: 'ABU AUF' });

  await mongoose.disconnect();
}

smokeTest().catch(console.error);
