const mongoose = require('mongoose');
const assert = require('assert');
const Bill = require('../models/Bill');
const User = require('../models/User');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const billService = require('../services/billService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/finova_test';

async function runTests() {
  console.log('--- STARTING BILL PAYMENT HISTORY & RECURRING CYCLE PERSISTENCE TESTS ---');
  await mongoose.connect(MONGO_URI);

  try {
    // 1. Create Test User and dependencies
    const testEmail = `test_bill_history_${Date.now()}@finova.local`;
    const user = await User.create({
      name: 'Bill History User',
      email: testEmail,
      password: 'hashed_password'
    });

    const account = await Account.create({
      user: user._id,
      name: 'Main Bank',
      type: 'bank',
      balance: 10000
    });

    const category = await Category.create({
      user: user._id,
      name: 'Utilities',
      type: 'expense'
    });

    // TEST 1: One-time bill payment persists in paymentHistory
    console.log('\n[TEST 1] One-time bill payment records in paymentHistory:');
    const oneTimeBill = await billService.createBill(user._id, {
      name: 'Electricity One-Time',
      expectedAmount: 350,
      category: category._id,
      account: account._id,
      dueDate: new Date('2026-09-15T12:00:00.000Z'),
      repeat: 'never'
    });

    const dummyTx1 = await Transaction.create({
      user: user._id,
      account: account._id,
      category: category._id,
      amount: 350,
      type: 'expense',
      date: new Date()
    });

    const paidOneTime = await billService.markAsPaid(user._id, oneTimeBill._id, dummyTx1._id);
    assert.strictEqual(paidOneTime.status, 'paid');
    assert.ok(paidOneTime.paymentDate instanceof Date, 'paymentDate must be a Date');
    assert.strictEqual(paidOneTime.paymentHistory.length, 1, 'paymentHistory must have 1 entry');
    assert.strictEqual(paidOneTime.paymentHistory[0].amount, 350);
    assert.strictEqual(paidOneTime.paymentHistory[0].transactionId.toString(), dummyTx1._id.toString());
    assert.strictEqual(new Date(paidOneTime.paymentHistory[0].dueDate).toISOString(), new Date('2026-09-15T12:00:00.000Z').toISOString());
    console.log('  ✓ One-time bill recorded payment history successfully.');

    // TEST 2: Recurring bill payments across multiple cycles persist all historical payment dates
    console.log('\n[TEST 2] Recurring bill preserves payment history across cycles:');
    const initialDueDate = new Date('2026-09-10T00:00:00.000Z');
    const monthlyBill = await billService.createBill(user._id, {
      name: 'Internet Subscription',
      expectedAmount: 500,
      category: category._id,
      account: account._id,
      dueDate: initialDueDate,
      repeat: 'monthly'
    });

    // Cycle 1 Payment (September)
    const txCycle1 = await Transaction.create({
      user: user._id,
      account: account._id,
      category: category._id,
      amount: 500,
      type: 'expense',
      date: new Date('2026-09-08T10:00:00.000Z')
    });

    const paidCycle1 = await billService.markAsPaid(user._id, monthlyBill._id, txCycle1._id);
    assert.strictEqual(paidCycle1.status, 'upcoming', 'Recurring bill status moves to upcoming for next cycle');
    assert.strictEqual(paidCycle1.paymentHistory.length, 1, 'Cycle 1 recorded in paymentHistory');
    assert.strictEqual(paidCycle1.paymentHistory[0].amount, 500);
    assert.strictEqual(paidCycle1.paymentHistory[0].transactionId.toString(), txCycle1._id.toString());
    assert.strictEqual(new Date(paidCycle1.paymentHistory[0].dueDate).toISOString(), initialDueDate.toISOString());
    assert.ok(paidCycle1.paymentDate, 'paymentDate is preserved');
    assert.ok(paidCycle1.lastPaymentDate, 'lastPaymentDate is set');
    assert.strictEqual(paidCycle1.lastTransactionId.toString(), txCycle1._id.toString());
    
    // Check advanced due date (October)
    const expectedNextDueDate = new Date(initialDueDate);
    expectedNextDueDate.setMonth(expectedNextDueDate.getMonth() + 1);
    assert.strictEqual(new Date(paidCycle1.dueDate).getMonth(), expectedNextDueDate.getMonth());
    console.log('  ✓ Cycle 1 payment recorded, cycle advanced to October.');

    // Cycle 2 Payment (October)
    const txCycle2 = await Transaction.create({
      user: user._id,
      account: account._id,
      category: category._id,
      amount: 500,
      type: 'expense',
      date: new Date('2026-10-09T14:30:00.000Z')
    });

    const paidCycle2 = await billService.markAsPaid(user._id, monthlyBill._id, txCycle2._id);
    assert.strictEqual(paidCycle2.paymentHistory.length, 2, 'paymentHistory MUST contain BOTH cycle payments!');
    
    // Verify Cycle 1 data is STILL intact and was NOT erased or overwritten!
    assert.strictEqual(paidCycle2.paymentHistory[0].transactionId.toString(), txCycle1._id.toString(), 'Cycle 1 txId preserved');
    assert.strictEqual(new Date(paidCycle2.paymentHistory[0].dueDate).toISOString(), initialDueDate.toISOString(), 'Cycle 1 dueDate preserved');
    assert.ok(paidCycle2.paymentHistory[0].paidAt, 'Cycle 1 paidAt preserved');

    // Verify Cycle 2 data is accurately recorded
    assert.strictEqual(paidCycle2.paymentHistory[1].transactionId.toString(), txCycle2._id.toString(), 'Cycle 2 txId recorded');
    assert.strictEqual(new Date(paidCycle2.paymentHistory[1].dueDate).toISOString(), expectedNextDueDate.toISOString(), 'Cycle 2 dueDate recorded');
    assert.strictEqual(paidCycle2.lastTransactionId.toString(), txCycle2._id.toString());

    // Cycle advanced to November
    const expectedNovDueDate = new Date(expectedNextDueDate);
    expectedNovDueDate.setMonth(expectedNovDueDate.getMonth() + 1);
    assert.strictEqual(new Date(paidCycle2.dueDate).getMonth(), expectedNovDueDate.getMonth());
    console.log('  ✓ Cycle 2 payment recorded, Cycle 1 payment was NOT erased and is fully preserved in history!');

    // TEST 4: calculateServerLiabilities for past month / past week accurately accounts for paid vs unpaid bills using paymentHistory
    console.log('\n[TEST 4] calculateServerLiabilities accounts for paid vs unpaid bills in past date filters:');
    const { calculateServerLiabilities } = require('../services/analyticsEngine');

    // For September (which had initialDueDate September 10, paid via txCycle1 on September 8):
    // If we calculate liabilities for September 1 to September 12:
    const septFrom = '2026-09-01T00:00:00.000Z';
    const septTo = '2026-09-12T23:59:59.999Z';
    const liabilitiesPaid = await calculateServerLiabilities(user._id, septFrom, septTo);
    assert.strictEqual(liabilitiesPaid.bills, 0, 'Paid bill in September period must NOT count as unpaid liability');
    console.log('  ✓ Paid bill in September correctly counted as 0 unpaid liabilities.');

    // Now create an unpaid bill in September period
    const unpaidBill = await billService.createBill(user._id, {
      name: 'Unpaid Water Bill',
      expectedAmount: 200,
      category: category._id,
      account: account._id,
      dueDate: new Date('2026-09-05T12:00:00.000Z'),
      repeat: 'never'
    });

    // TEST 5: Early payment deduplication and period filtering simulation (Day 10 bill paid on Day 8)
    console.log('\n[TEST 5] Early payment deduplication and period filtering simulation:');
    const earlyBill = await billService.createBill(user._id, {
      name: 'Gym Membership',
      expectedAmount: 450,
      category: category._id,
      account: account._id,
      dueDate: new Date('2026-09-10T00:00:00.000Z'),
      repeat: 'monthly'
    });

    const earlyTx = await Transaction.create({
      user: user._id,
      account: account._id,
      category: category._id,
      amount: 450,
      type: 'expense',
      date: new Date('2026-09-08T09:00:00.000Z')
    });

    const paidEarlyBill = await billService.markAsPaid(user._id, earlyBill._id, earlyTx._id);
    assert.strictEqual(new Date(paidEarlyBill.dueDate).getMonth(), 9, 'Cycle advanced to October');
    assert.strictEqual(paidEarlyBill.paymentHistory.length, 1);
    assert.strictEqual(paidEarlyBill.paymentHistory[0].amount, 450);

    // Filter A: September (month containing Day 8 and Day 10)
    const liabilitiesSept = await calculateServerLiabilities(user._id, '2026-09-01T00:00:00.000Z', '2026-09-30T23:59:59.999Z');
    assert.strictEqual(liabilitiesSept.bills, 200, 'Unpaid Water Bill (200) counted, early-paid Gym (450) excluded');

    // Filter B: Week of Day 8 only ('2026-09-01' to '2026-09-08')
    const liabilitiesWeekOfPayment = await calculateServerLiabilities(user._id, '2026-09-01T00:00:00.000Z', '2026-09-08T23:59:59.999Z');
    assert.strictEqual(liabilitiesWeekOfPayment.bills, 200, 'Water bill (200) due Sept 5 is unpaid, Gym paid is 0');

    // Filter C: Week of Day 10 only ('2026-09-09' to '2026-09-15')
    const liabilitiesWeekOfDue = await calculateServerLiabilities(user._id, '2026-09-09T00:00:00.000Z', '2026-09-15T23:59:59.999Z');
    assert.strictEqual(liabilitiesWeekOfDue.bills, 0, 'Gym bill was due Sept 10 but was paid early on Sept 8, so 0 unpaid liabilities');
    console.log('  ✓ Early-paid bill correctly evaluated across all periods without false liabilities.');

    // Clean up
    await Bill.deleteMany({ user: user._id });
    await Transaction.deleteMany({ user: user._id });
    await Account.deleteMany({ user: user._id });
    await Category.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });

    console.log('\n ALL BILL PAYMENT HISTORY & RECURRING CYCLE TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
