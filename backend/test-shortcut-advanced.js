require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const app = require('./app'); 
const User = require('./models/User');
const Account = require('./models/Account');
const Category = require('./models/Category');
const Transaction = require('./models/Transaction');

const PORT = 5557;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finova_test_db';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`❌ FAIL: ${message}`);
  }
}

async function runTests() {
  let server;
  try {
    await mongoose.connect(MONGODB_URI);
    await Transaction.syncIndexes();

    await User.deleteMany({});
    await Account.deleteMany({});
    await Category.deleteMany({});
    await Transaction.deleteMany({});

    server = app.listen(PORT);

    // Mock a user
    const jwt = require('jsonwebtoken');
    const user = new User({ name: 'Test User', email: 'test@finova.com', password: 'password123', googleId: 'test-google-id' });
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret');

    // Mock another user
    const otherUser = new User({ name: 'Other User', email: 'other@finova.com', password: 'password123', googleId: 'other-google-id' });
    await otherUser.save();

    const account = new Account({ user: user._id, name: 'Cash', type: 'cash', balance_adjustment: 0, currency: 'EGP' });
    await account.save();
    
    const category = new Category({ user: user._id, name: 'Food', type: 'expense' });
    await category.save();

    const otherAccount = new Account({ user: otherUser._id, name: 'Other Cash', type: 'cash', balance_adjustment: 0, currency: 'EGP' });
    await otherAccount.save();

    const baseUrl = `http://localhost:${PORT}/api/integrations/shortcut`;

    console.log('\n--- 1. Token Generation ---');
    const genRes = await fetch(`${baseUrl}/token`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    const genData = await genRes.json();
    assert(genRes.status === 200, 'Token generation returns 200');
    const rawShortcutToken = genData.token;
    assert(!!rawShortcutToken, 'Token string is present in response');
    
    console.log('\n--- 2. Fetch Accounts & Categories (ID-Based) ---');
    const accRes = await fetch(`${baseUrl}/accounts`, { headers: { 'Authorization': `Bearer ${rawShortcutToken}` } });
    const accData = await accRes.json();
    assert(Array.isArray(accData) && accData.length === 1, 'Accounts is an array of size 1');
    assert(accData[0].id === account._id.toString() && accData[0].name === 'Cash', 'Account returns ID and Name correctly');

    const catRes = await fetch(`${baseUrl}/categories`, { headers: { 'Authorization': `Bearer ${rawShortcutToken}` } });
    const catData = await catRes.json();
    assert(Array.isArray(catData) && catData.length === 1, 'Categories is an array of size 1');
    assert(catData[0].id === category._id.toString() && catData[0].name === 'Food', 'Category returns ID and Name correctly');

    console.log('\n--- 3. Missing Idempotency Key ---');
    const missIdempRes = await fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rawShortcutToken}` },
      body: JSON.stringify({ amount: 100, accountId: account._id, categoryId: category._id })
    });
    assert(missIdempRes.status === 400, 'Missing Idempotency-Key returns 400');

    console.log('\n--- 4. Concurrent Idempotency ---');
    const idempotencyKey = 'concurrent-uuid-123';
    const makeReq = () => fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rawShortcutToken}`, 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ amount: 100, accountId: account._id, categoryId: category._id })
    });

    const results = await Promise.all([makeReq(), makeReq(), makeReq(), makeReq(), makeReq()]);
    assert(results.every(r => r.status === 201 || r.status === 200), 'Concurrent identical requests return 200 or 201');
    let txCount = await Transaction.countDocuments({ idempotencyKey });
    assert(txCount === 1, 'Exactly 1 transaction created in DB for concurrent identical requests');

    console.log('\n--- 5. Same Idempotency Key, Different Amount ---');
    const diffAmountRes = await fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rawShortcutToken}`, 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ amount: 9999, accountId: account._id, categoryId: category._id })
    });
    assert(diffAmountRes.status === 409, 'Same Idempotency-Key with different amount returns 409 Conflict');
    
    console.log('\n--- 6. Same Idempotency Key, Different Account ---');
    const tempAccount = new Account({ user: user._id, name: 'Bank', type: 'bank', balance_adjustment: 0, currency: 'EGP' });
    await tempAccount.save();
    const diffAccRes = await fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rawShortcutToken}`, 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ amount: 100, accountId: tempAccount._id, categoryId: category._id })
    });
    assert(diffAccRes.status === 409, 'Same Idempotency-Key with different account returns 409 Conflict');

    console.log('\n--- 7. Different Idempotency Keys ---');
    const diffKeyRes = await fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rawShortcutToken}`, 'Idempotency-Key': 'different-uuid-456' },
      body: JSON.stringify({ amount: 100, accountId: account._id, categoryId: category._id })
    });
    assert(diffKeyRes.status === 201, 'Different Idempotency-Key successfully creates transaction');

    console.log('\n--- 8. Malformed Inputs ---');
    const badRes1 = await fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rawShortcutToken}`, 'Idempotency-Key': 'uuid-err-1' },
      body: JSON.stringify({ amount: -50, accountId: account._id, categoryId: category._id })
    });
    assert(badRes1.status === 400, 'Negative amount returns 400');

    console.log('\n--- 9. Cross-User Isolation ---');
    const crossUserRes = await fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rawShortcutToken}`, 'Idempotency-Key': 'uuid-err-2' },
      body: JSON.stringify({ amount: 100, accountId: otherAccount._id, categoryId: category._id })
    });
    assert(crossUserRes.status === 400, 'Trying to use another user\'s account returns 400 (Access Denied)');

    console.log('\n--- 10. Missing IDs ---');
    const missingIdsRes = await fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rawShortcutToken}`, 'Idempotency-Key': 'uuid-err-3' },
      body: JSON.stringify({ amount: 100 })
    });
    assert(missingIdsRes.status === 400, 'Missing accountId/categoryId returns 400');

  } catch (err) {
    console.error(err);
    failed++;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    console.log(`\n--- Test Results: ${passed} Passed, ${failed} Failed ---`);
    process.exit(failed > 0 ? 1 : 0);
  }
}
runTests();
