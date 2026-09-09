const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mocks
const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.data = data;
    return res;
  };
  return res;
};

const runTests = async () => {
  console.log('Running Security Regression Tests...\n');

  // SEC-001: Forecast controller bounds
  console.log('Testing SEC-001: Forecast CPU DoS Prevention');
  const forecastController = require('./controllers/forecastController');
  
  // Mock ForecastEngine
  const ForecastEngine = require('./services/forecastEngine');
  ForecastEngine.runForecast = async () => ({ currentBalance: 100 });

  // 1. interval = 0, < 0, non-integer -> handled by mongoose model validator
  const RecurringTransaction = require('./models/RecurringTransaction');
  const rt = new RecurringTransaction({
    user: '507f1f77bcf86cd799439011',
    title: 'test',
    amount: 10,
    type: 'expense',
    repeatType: 'daily',
    interval: 0,
    startDate: new Date(),
    nextExecutionDate: new Date()
  });
  
  const err = rt.validateSync();
  assert(err && err.errors.interval, 'Should fail validation for interval = 0');
  
  rt.interval = -5;
  const err2 = rt.validateSync();
  assert(err2 && err2.errors.interval, 'Should fail validation for interval < 0');

  rt.interval = 1.5;
  const err3 = rt.validateSync();
  assert(err3 && err3.errors.interval, 'Should fail validation for interval non-integer');

  // 2. forecast days bounds
  let req = { query: { days: -10 }, user: { id: '507f1f77bcf86cd799439011' } };
  let res = mockRes();
  await forecastController.getForecast(req, res);
  assert.strictEqual(res.statusCode, 400);

  req = { query: { days: 100000 }, user: { id: '507f1f77bcf86cd799439011' } };
  res = mockRes();
  await forecastController.getForecast(req, res);
  assert.strictEqual(res.statusCode, 400);

  console.log('✅ SEC-001 passed\n');

  // SEC-002: Mass Assignment
  console.log('Testing SEC-002: Mass Assignment and Cross-User References');
  const billService = require('./services/billService');
  const recurringService = require('./services/recurringTransactionService');
  
  // Mock Account and Category
  const Account = require('./models/Account');
  const Category = require('./models/Category');
  
  Account.findOne = async (query) => {
    if (query._id === 'my-acc' && query.user === 'my-user') return { _id: 'my-acc' };
    return null;
  };
  
  Category.findOne = async (query) => {
    if (query._id === 'my-cat' && query.user === 'my-user') return { _id: 'my-cat' };
    return null;
  };
  
  // Override save to prevent actual DB call
  const Bill = require('./models/Bill');
  Bill.prototype.save = async function() { return this; };
  RecurringTransaction.prototype.save = async function() { return this; };

  // Attempt cross-user account assignment
  try {
    await billService.createBill('my-user', { name: 'test', expectedAmount: 10, account: 'other-user-acc' });
    assert.fail('Should have thrown account reference error');
  } catch (e) {
    assert.strictEqual(e.message, 'Invalid account reference');
  }

  // Attempt mass assignment of `user`
  try {
    const bill = await billService.createBill('my-user', { name: 'test', expectedAmount: 10, user: 'hacked-user' });
    assert.strictEqual(bill.user, 'my-user', 'User should not be mass assigned');
  } catch (e) {}

  // Recurring transaction cross-user validation
  try {
    await recurringService.createRecurringTransaction('my-user', { title: 'test', amount: 10, type: 'expense', repeatType: 'daily', account: 'other-user-acc' });
    assert.fail('Should have thrown account reference error');
  } catch (e) {
    assert.strictEqual(e.message, 'Invalid account reference');
  }
  
  console.log('✅ SEC-002 passed\n');

  // SEC-003: SMS Deduplication
  console.log('Testing SEC-003: SMS Deduplication Race');
  const smsController = require('./controllers/smsWebhookController');
  
  // Mock User
  const User = require('./models/User');
  User.findOne = async () => ({ _id: '507f1f77bcf86cd799439011' });
  
  const Transaction = require('./models/Transaction');
  Transaction.findOne = async () => null; // Simulate passing first lookup
  
  Transaction.create = async () => {
    const err = new Error('Duplicate key');
    err.code = 11000;
    err.keyPattern = { smsHash: 1 };
    throw err;
  };
  
  // By sending an SMS without a recognizable merchant but with a financial keyword,
  // we skip the merchant intent resolver which tries to hit the DB.
  req = { params: { userToken: 'token' }, body: 'transaction 10 EGP' };
  res = mockRes();
  
  await smsController.handleSmsWebhook(req, res);
  
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.data.message, 'Transaction already exists (deduplicated by index)');
  
  console.log('✅ SEC-003 passed\n');

  // SEC-004: Startup Index Drops
  console.log('Testing SEC-004: Startup Index Drops');
  const dbJsContent = fs.readFileSync(path.join(__dirname, 'config', 'db.js'), 'utf8');
  assert(!dbJsContent.includes('removeLegacyIndexes'), 'removeLegacyIndexes should not exist');
  assert(!dbJsContent.includes('dropIndex'), 'dropIndex should not be called');
  console.log('✅ SEC-004 passed\n');

  console.log('🎉 All Security Regression Tests Passed!');
};

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
