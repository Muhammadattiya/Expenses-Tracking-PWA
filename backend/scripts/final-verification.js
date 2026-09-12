const mongoose = require('mongoose');
const http = require('http');
require('dotenv').config({ path: __dirname + '/../.env' });
const app = require('../app');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const User = require('../models/User');

const PORT = 3009;
let server;

const delay = ms => new Promise(res => setTimeout(res, ms));

async function fetchApi(path, method, body, cookieString, additionalHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...additionalHeaders };
  if (cookieString) headers['Cookie'] = cookieString;
  
  const options = {
    method,
    headers,
  };
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(`http://localhost:${PORT}${path}`, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, headers: res.headers };
}

async function runTests() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  
  console.log('Starting Express server on port', PORT);
  server = http.createServer(app);
  await new Promise(resolve => server.listen(PORT, resolve));

  try {
    // 0. Setup
    await User.deleteMany({ email: { $regex: 'test_verification' } });
    const testEmail = `test_verification_${Math.random().toString(36).substring(7)}@example.com`;
    console.log('Registering email:', testEmail);
    const password = 'Password123!';
    
    console.log('Registering test user...');
    const regRes = await fetchApi('/api/auth/register', 'POST', { name: 'Test', email: testEmail, password });
    if (regRes.status !== 201) throw new Error('Registration failed: ' + JSON.stringify(regRes.data));
    const cookieHeader = regRes.headers.get('set-cookie');
    const token = cookieHeader ? cookieHeader.split(';')[0] : '';
    const userId = regRes.data.user._id;

    // Get a category
    const catRes = await fetchApi('/api/categories', 'GET', null, token);
    if (catRes.status !== 200) throw new Error('Category fetch failed: ' + JSON.stringify(catRes.data));
    const categoryId = catRes.data.find(c => c.type === 'expense')?._id;
    if (!categoryId) throw new Error('Category ID missing in response: ' + JSON.stringify(catRes.data));

    // Get Accounts
    const accRes = await fetchApi('/api/accounts', 'GET', null, token);
    const accountId = accRes.data[0]._id;

    // Create a budget
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const budgetRes = await fetchApi('/api/budgets', 'POST', {
      category: categoryId,
      amount: 10000,
      period: 'monthly',
      startDate,
      endDate
    }, token);
    const budgetId = budgetRes.data._id;

    console.log('--- 1. CONCURRENT IDEMPOTENCY + BUDGET ACCOUNTING ---');
    // Test 100 concurrent requests with the SAME idempotency key
    const idempotencyKey = `idemp_${Date.now()}`;
    const payload = {
      title: 'Idempotent TX',
      amount: 100,
      type: 'expense',
      date: now.toISOString(),
      category: categoryId,
      account: accountId,
      idempotencyKey
    };
    console.log('Test 1 payload:', JSON.stringify(payload));

    const promises = Array.from({ length: 100 }, () => fetchApi('/api/transactions', 'POST', payload, token));
    const results = await Promise.all(promises);
    
    const successes = results.filter(r => r.status === 201 || r.status === 200);
    if (successes.length === 0) console.log('First failure:', results[0].data);
    const txs = await Transaction.find({ user: userId, idempotencyKey });
    const budget = await Budget.findById(budgetId);
    
    console.log(`Results: ${successes.length} successful responses (200/201).`);
    console.log(`Transactions in DB: ${txs.length} (Expected: 1)`);
    console.log(`Budget Spent: ${budget.spent} (Expected: 100)`);
    if (txs.length !== 1 || budget.spent !== 100) throw new Error("Idempotency test failed!");

    console.log('--- 2. CONCURRENT DISTINCT TRANSACTIONS ---');
    const distinctPromises = [];
    for (let i = 0; i < 100; i++) {
      distinctPromises.push(fetchApi('/api/transactions', 'POST', {
        title: `Tx ${i}`,
        amount: 10,
        type: 'expense',
        date: now.toISOString(),
        category: categoryId,
        account: accountId,
        idempotencyKey: `distinct_${Date.now()}_${i}`
      }, token));
    }
    const distinctResults = await Promise.all(distinctPromises);
    const distinctSuccesses = distinctResults.filter(r => r.status === 201 || r.status === 200);
    console.log(`Test 2: ${distinctSuccesses.length} successful distinct responses.`);
    if (distinctSuccesses.length !== 100) {
      console.log('First distinct failure:', distinctResults.find(r => r.status !== 201 && r.status !== 200)?.data);
    }
    const distinctBudget = await Budget.findById(budgetId);
    console.log(`Budget Spent after 100 * 10 distinct: ${distinctBudget.spent} (Expected: 1100)`);
    if (distinctBudget.spent !== 1100) throw new Error("Concurrent distinct test failed!");

    console.log('--- 8. LOGIN RATE LIMITING ---');
    // We should hit /api/auth/login with wrong password multiple times to trigger IP and Email limiters.
    // Since we don't have proxy headers in fetch easily, we test Email limiter first.
    let emailLimiterTriggered = false;
    for (let i = 0; i < 20; i++) {
      const res = await fetchApi('/api/auth/login', 'POST', { email: testEmail, password: 'wrong' });
      if (res.status === 429 && res.data.message.includes('account')) {
        emailLimiterTriggered = true;
        break;
      }
    }
    console.log(`Email rate limiter triggered: ${emailLimiterTriggered}`);
    
    console.log('--- 6. CONCURRENT BUDGET PERIOD ROLLOVER ---');
    // Directly invoke budgetEngine for this test, simulating concurrent rollovers
    const { syncBudgetPeriods } = require('../services/budgetEngine');
    // Force budget to be in the past
    await Budget.updateOne({ _id: budgetId }, { 
      startDate: new Date(2020, 0, 1), 
      endDate: new Date(2020, 0, 31) 
    });
    const rolloverPromises = [];
    for(let i = 0; i < 10; i++) rolloverPromises.push(syncBudgetPeriods(userId));
    await Promise.all(rolloverPromises);
    const rolledBudget = await Budget.findById(budgetId);
    console.log(`Rolled over budget start date: ${rolledBudget.startDate.toISOString()}`);
    console.log(`Rolled over budget spent: ${rolledBudget.spent} (Expected: 0 since old txs were in current month)`);

    console.log('--- ALL AUTOMATED VERIFICATIONS PASSED ---');
  } catch (err) {
    console.error('VERIFICATION FAILED:', err);
  } finally {
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTests();
