const assert = require('assert');
const mongoose = require('mongoose');
const { matchAndReconcileBill } = require('./services/billReconciliationService');
const Bill = require('./models/Bill');

async function testBillMatching() {
  console.log('Testing Bill Auto-Reconciliation Engine...');

  const userId = new mongoose.Types.ObjectId();
  const txId = new mongoose.Types.ObjectId();

  let paidMarked = false;
  let paidTxId = null;

  const mockBill = {
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    name: 'فاتورة WE انترنت',
    expectedAmount: 350,
    dueDate: new Date(),
    status: 'upcoming',
    keywords: ['we', 'telecom egypt'],
    save: async function() { this.status = 'paid'; return this; }
  };

  // Mock Bill.find
  Bill.find = function(query) {
    return Promise.resolve([mockBill]);
  };

  // Case 1: Match by keyword + amount + timing
  const txWE = {
    _id: txId,
    user: userId,
    type: 'expense',
    amount: 350,
    title: 'WE Internet Payment',
    date: new Date()
  };

  // Inject mock billService markAsPaid
  const billService = require('./services/billService');
  const origMarkAsPaid = billService.markAsPaid;
  billService.markAsPaid = async (uId, bId, tId) => {
    paidMarked = true;
    paidTxId = tId;
    return { ...mockBill, status: 'paid' };
  };

  const result1 = await matchAndReconcileBill(userId, txWE);
  assert.strictEqual(result1.matched, true, 'Bill should match WE keyword and exact amount');
  assert.strictEqual(String(result1.bill._id), String(mockBill._id));
  assert.strictEqual(paidMarked, true, 'markAsPaid should have been called');
  assert.strictEqual(paidTxId, String(txId), 'Transaction ID should be passed to markAsPaid');

  // Case 2: Reject non-expense transaction
  const txIncome = {
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    type: 'income',
    amount: 350,
    title: 'WE Refund',
    date: new Date()
  };
  const resultIncome = await matchAndReconcileBill(userId, txIncome);
  assert.strictEqual(resultIncome.matched, false, 'Income transaction must never reconcile bills');

  // Case 3: Reject large amount mismatch (> 10% tolerance)
  const txAmountMismatch = {
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    type: 'expense',
    amount: 500, // 350 vs 500 is > 10%
    title: 'WE payment',
    date: new Date()
  };
  const resultMismatch = await matchAndReconcileBill(userId, txAmountMismatch);
  assert.strictEqual(resultMismatch.matched, false, 'Amount mismatch > 10% must be rejected');

  // Case 4: Reject date out of range (> 7 days)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 15);
  const txOld = {
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    type: 'expense',
    amount: 350,
    title: 'WE payment',
    date: pastDate
  };
  const resultOld = await matchAndReconcileBill(userId, txOld);
  assert.strictEqual(resultOld.matched, false, 'Date out of +/- 7 days range must be rejected');

  // Case 5: Reject if keywords or name do not match at all
  const txUnrelated = {
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    type: 'expense',
    amount: 350,
    title: 'KFC Restaurant',
    date: new Date()
  };
  const resultUnrelated = await matchAndReconcileBill(userId, txUnrelated);
  assert.strictEqual(resultUnrelated.matched, false, 'Unrelated merchant must not match bill');

  // Case 6: Accept 5% tolerance variation (e.g. utility with small extra stamp fee)
  const txTolerance = {
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    type: 'expense',
    amount: 360, // ~2.8% diff
    title: 'WE Internet Bill',
    date: new Date()
  };
  const resultTolerance = await matchAndReconcileBill(userId, txTolerance);
  assert.strictEqual(resultTolerance.matched, true, 'Small variable tolerance (<=10%) should match');

  // Restore
  billService.markAsPaid = origMarkAsPaid;

  console.log('✅ Bill Auto-Reconciliation unit tests passed successfully!');
}

testBillMatching().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
