require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const app = require('./app'); 
const User = require('./models/User');
const Account = require('./models/Account');
const Transaction = require('./models/Transaction');

const PORT = 5555;
const TEST_TOKEN = 'test-token-12345';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finova_test_db';

async function runTests() {
  let server;
  try {
    // 1. Connect to DB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    // Clean DB
    await User.deleteMany({});
    await Account.deleteMany({});
    await Transaction.deleteMany({});

    // 2. Create User
    const user = new User({
      name: 'Test User',
      email: 'test@finova.com',
      password: 'password123',
      googleId: 'test-google-id-123',
      smsWebhookToken: TEST_TOKEN
    });
    await user.save();

    // 3. Create Account
    const account = new Account({
      user: user._id,
      name: 'Prepaid Card',
      type: 'bank',
      balance_adjustment: 1000,
      cardLast4: '2513',
      currency: 'EGP'
    });
    await account.save();

    // 4. Start Server
    server = app.listen(PORT, () => console.log(`Server listening on ${PORT}`));

    const url = `http://localhost:${PORT}/api/sms/webhook/${TEST_TOKEN}`;

    // Helper to send request
    const sendReq = async (body, contentType = 'application/json') => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': contentType },
        body: typeof body === 'string' ? body : JSON.stringify(body)
      });
      const data = await res.json();
      return { status: res.status, data };
    };

    console.log('--- TEST 1: Valid SMS matching account ---');
    const sms1 = "تم خصم 404.7 EGP  من بطاقة المدفوعة مقدما رقم 2513  باستخدام Mobile Payment عند PAYMOB*LIMBO CAFE       C  يوم 20/07/26  الساعه 10:42  المتاح 1593.2EGP  للمزيد إتصل ب ١٩٦٢٣";
    let res = await sendReq({ text: sms1 });
    console.log(`Status: ${res.status}`);
    
    // Check DB
    let txs = await Transaction.find({});
    console.log(`Transactions in DB: ${txs.length}`);
    if (txs.length > 0) {
      console.log(`Matched Account ID: ${txs[0].account}`);
      console.log(`Expected Account ID: ${account._id}`);
      console.log(`Status: ${txs[0].status}`);
    }

    console.log('\n--- TEST 2: Duplicate SMS ---');
    res = await sendReq({ text: sms1 });
    console.log(`Status: ${res.status} - Data: ${JSON.stringify(res.data)}`);
    txs = await Transaction.find({});
    console.log(`Transactions in DB (should be 1): ${txs.length}`);

    console.log('\n--- TEST 3: SMS with NO match (cardLast4 = 9999) ---');
    const sms2 = "تم خصم 404.7 EGP  من بطاقة المدفوعة مقدما رقم 9999  باستخدام Mobile Payment";
    res = await sendReq({ text: sms2 });
    console.log(`Status: ${res.status}`);
    txs = await Transaction.find({});
    console.log(`Transactions in DB (should be 2): ${txs.length}`);
    const tx2 = txs.find(t => t.rawSms === sms2);
    if (tx2) {
      console.log(`Matched Account ID (should be undefined/null): ${tx2.account}`);
      console.log(`Status: ${tx2.status}`);
    }

    console.log('\n--- TEST 4: Invalid Token ---');
    const resInvalid = await fetch(`http://localhost:${PORT}/api/sms/webhook/wrong-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: "hello" })
    });
    console.log(`Status: ${resInvalid.status} (expected 404)`);

    console.log('\n--- TEST 5: Rate Limiting ---');
    console.log('Sending 101 requests...');
    let rateLimitHit = false;
    for (let i = 0; i < 101; i++) {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: "test limit " + i }) });
      if (r.status === 429) {
        rateLimitHit = true;
        break;
      }
    }
    console.log(`Rate limit working? ${rateLimitHit}`);

  } catch (err) {
    console.error(err);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);
  }
}

runTests();
