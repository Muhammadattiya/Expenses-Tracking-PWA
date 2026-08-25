require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const app = require('./app'); 
const User = require('./models/User');
const Account = require('./models/Account');
const Category = require('./models/Category');
const Transaction = require('./models/Transaction');

const PORT = 5556;
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
    await Category.deleteMany({});
    await Transaction.deleteMany({});

    // 2. Create User
    const rawToken = 'test-shortcut-token';
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = new User({
      name: 'Test User',
      email: 'test@finova.com',
      password: 'password123',
      googleId: 'test-google-id-123',
      shortcutTokenHash: hashedToken
    });
    await user.save();

    const user2 = new User({
      name: 'Other User',
      email: 'other@finova.com',
      password: 'password123',
      googleId: 'other-google-id-123',
    });
    await user2.save();

    // 3. Create Account & Category
    const account = new Account({
      user: user._id,
      name: 'Cash',
      type: 'cash',
      balance_adjustment: 0,
      currency: 'EGP'
    });
    await account.save();

    const account2 = new Account({
      user: user2._id,
      name: 'Hacker Account',
      type: 'cash',
      balance_adjustment: 0,
      currency: 'EGP'
    });
    await account2.save();

    const category = new Category({
      user: user._id,
      name: 'Food',
      type: 'expense'
    });
    await category.save();

    // 4. Start Server
    server = app.listen(PORT, () => console.log(`Server listening on ${PORT}`));

    const baseUrl = `http://localhost:${PORT}/api/integrations/shortcut`;

    // Helper to send request
    const sendReq = async (endpoint, method = 'GET', body = null, token = rawToken) => {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
      });
      const data = await res.json().catch(() => null);
      return { status: res.status, data };
    };

    console.log('\n--- TEST 1: Get Accounts (Valid Token) ---');
    let res = await sendReq('/accounts');
    console.log(`Status: ${res.status}`);
    if (res.data.length === 1 && res.data[0]._id === account._id.toString()) {
      console.log('Passed: Returned correct accounts');
    } else {
      console.log('Failed: Returned incorrect accounts', res.data);
    }

    console.log('\n--- TEST 2: Get Categories (Invalid Token) ---');
    res = await sendReq('/categories', 'GET', null, 'wrong-token');
    console.log(`Status: ${res.status} (Expected 401)`);

    console.log('\n--- TEST 3: Create Transaction ---');
    res = await sendReq('/transactions', 'POST', {
      amount: 150,
      account: account._id,
      category: category._id
    });
    console.log(`Status: ${res.status} (Expected 201)`);
    console.log(`Data: ${res.data?.message}`);
    
    let txs = await Transaction.find({});
    console.log(`Transactions in DB: ${txs.length} (Expected 1)`);
    if (txs.length > 0) {
      console.log(`Amount: ${txs[0].amount}, Source: ${txs[0].source}`);
    }

    console.log('\n--- TEST 4: Idempotency (Duplicate Request) ---');
    const idempotencyKey = 'unique-req-123';
    await fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${rawToken}`,
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        amount: 200,
        account: account._id,
        category: category._id
      })
    });
    
    // Second identical request
    const dupRes = await fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${rawToken}`,
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        amount: 200,
        account: account._id,
        category: category._id
      })
    });
    
    txs = await Transaction.find({ idempotencyKey });
    console.log(`Duplicate Request Status: ${dupRes.status} (Expected 200)`);
    console.log(`Transactions with idempotencyKey in DB: ${txs.length} (Expected 1)`);

    console.log('\n--- TEST 5: Cross-User Account Attack ---');
    res = await sendReq('/transactions', 'POST', {
      amount: 500,
      account: account2._id, // trying to use another user's account
      category: category._id
    });
    console.log(`Status: ${res.status} (Expected 400 - Validation Error)`);
    console.log(`Error Message: ${res.data?.message}`);

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
