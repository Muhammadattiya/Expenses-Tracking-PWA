const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Transaction = require('./models/Transaction');
const GlobalMerchantKnowledge = require('./models/GlobalMerchantKnowledge');
const { handleSmsWebhook } = require('./controllers/smsWebhookController');
const { updateTransaction } = require('./services/transactionService');
require('dotenv').config();

async function runAudit() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finova');
  
  await User.deleteMany({ email: 'audit2@example.com' });
  const auditUser = await User.create({
    name: 'Audit User 2',
    email: 'audit2@example.com',
    password: 'password123',
    smsWebhookToken: 'audit-token-456'
  });

  const ahwaCat = await Category.create({
    user: auditUser._id,
    name: 'Ahwa',
    type: 'expense',
    intentId: 'coffee'
  });

  await GlobalMerchantKnowledge.deleteMany({ normalizedMerchant: 'NOLA' });

  // B. Uncategorized SMS (UNKNOWN)
  let req = {
    params: { userToken: 'audit-token-456' },
    body: { text: 'Purchase of EGP 100.00 at NOLA on card ending 1234' }
  };
  
  let resStatus, resJson;
  let res = {
    status: (code) => { resStatus = code; return res; },
    json: (data) => { resJson = data; return res; }
  };

  await handleSmsWebhook(req, res);
  let txB = await Transaction.findOne({ user: auditUser._id, amount: 100 });

  const txE = await Transaction.create({
    user: auditUser._id,
    title: 'NOLA',
    normalizedMerchant: 'NOLA',
    amount: 999,
    type: 'expense',
    source: 'sms_shortcut'
  });

  await updateTransaction(auditUser._id, txB._id, { category: ahwaCat._id });

  // wait 2 seconds for background processes
  await new Promise(r => setTimeout(r, 2000));

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
