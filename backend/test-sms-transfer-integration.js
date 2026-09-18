/**
 * Comprehensive Integration Test Suite for SMS Transfer Reconciliation
 * Tests all requirements from spec.md, plan.md, and tasks.md:
 * - T011: Outgoing-first and incoming-first arrival pairing
 * - T017: Duplicate and replay delivery deduplication
 * - T018: Near-simultaneous arrival concurrency
 * - T021: Negative cases (window exceeded, mismatched ref, same account, multi-tenant isolation)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('./models/User');
const Account = require('./models/Account');
const Transaction = require('./models/Transaction');
const { handleSmsWebhook } = require('./controllers/smsWebhookController');
const { computePairIdempotencyKey } = require('./services/transferReconciliationService');

const mockReqRes = (userToken, smsText) => {
  let statusCode = 200;
  let responseData = null;
  const req = {
    params: { userToken },
    body: { text: smsText }
  };
  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    }
  };
  const next = (err) => {
    if (err) throw err;
  };
  return { req, res, next, getResult: () => ({ statusCode, responseData }) };
};

const runWebhook = async (token, smsText) => {
  const { req, res, next, getResult } = mockReqRes(token, smsText);
  await handleSmsWebhook(req, res, next);
  return getResult();
};

async function runIntegrationTests() {
  console.log('--- STARTING SMS TRANSFER RECONCILIATION INTEGRATION SUITE ---');
  let passedCount = 0;
  let failedCount = 0;

  const assert = (condition, testName, extraInfo = '') => {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName} ${extraInfo ? `(${extraInfo})` : ''}`);
      failedCount++;
    }
  };

  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finova_test_db';
    await mongoose.connect(mongoUri);

    // Clean up test collections
    await User.deleteMany({ email: { $in: ['userA@test.com', 'userB@test.com'] } });
    await Account.deleteMany({});
    await Transaction.deleteMany({});

    // Setup Test User A
    const tokenA = 'token-user-a-1234567890';
    const hashedTokenA = crypto.createHash('sha256').update(tokenA).digest('hex');
    const userA = await User.create({
      name: 'User A',
      email: 'userA@test.com',
      password: 'password123',
      smsWebhookToken: hashedTokenA
    });

    const accountA_0694 = await Account.create({
      user: userA._id,
      name: 'ADIB Account 0694',
      type: 'bank',
      cardLast4: '0694',
      currency: 'EGP'
    });

    const accountA_4113 = await Account.create({
      user: userA._id,
      name: 'CIB Account 4113',
      type: 'bank',
      cardLast4: '4113',
      currency: 'EGP'
    });

    // Setup Test User B
    const tokenB = 'token-user-b-0987654321';
    const hashedTokenB = crypto.createHash('sha256').update(tokenB).digest('hex');
    const userB = await User.create({
      name: 'User B',
      email: 'userB@test.com',
      password: 'password123',
      smsWebhookToken: hashedTokenB
    });

    const accountB_0694 = await Account.create({
      user: userB._id,
      name: 'User B Account 0694',
      type: 'bank',
      cardLast4: '0694',
      currency: 'EGP'
    });

    const accountB_9999 = await Account.create({
      user: userB._id,
      name: 'User B Account 9999',
      type: 'bank',
      cardLast4: '9999',
      currency: 'EGP'
    });

    // =========================================================================
    // Scenario 1: Outgoing-First Order (T011)
    // =========================================================================
    console.log('\n--- Scenario 1: Outgoing-First Order ---');
    await Transaction.deleteMany({});

    const smsOut1 = 'IPN transfer sent with amount of EGP 350.00 from 0694 on 18/09 at 07:32 AM. Ref# 43f3ef2a. For more details call 19700';
    const resOut1 = await runWebhook(tokenA, smsOut1);
    assert(resOut1.statusCode === 200, 'Scenario 1: Outgoing SMS accepted');

    const interimTx1 = await Transaction.find({ user: userA._id });
    assert(interimTx1.length === 1 && interimTx1[0].type === 'expense', 'Scenario 1: Saved as interim expense before counterpart arrives');

    const smsIn1 = 'تم إستقبال تحويل لحظي إلى حسابكم 4113 بمبلغ 350.00 جم يوم 09-18 الساعة 07:32 رقم مرجعي 43f3ef2a';
    const resIn1 = await runWebhook(tokenA, smsIn1);
    assert(resIn1.statusCode === 200 && resIn1.responseData.isReconciled === true, 'Scenario 1: Incoming SMS triggers reconciliation');

    const finalTxs1 = await Transaction.find({ user: userA._id });
    assert(finalTxs1.length === 1, 'Scenario 1: Exactly 1 transaction exists in database', `Count: ${finalTxs1.length}`);

    const transfer1 = finalTxs1[0];
    assert(transfer1.type === 'transfer', 'Scenario 1: Transaction converted to transfer');
    assert(transfer1.amount === 350, 'Scenario 1: Transfer amount is 350');
    assert(String(transfer1.from_account) === String(accountA_0694._id), 'Scenario 1: from_account points to 0694');
    assert(String(transfer1.to_account) === String(accountA_4113._id), 'Scenario 1: to_account points to 4113');
    assert(transfer1.title === 'تحويل ذاتي (IPN)', 'Scenario 1: Title standardized to تحويل ذاتي (IPN)');
    assert(transfer1.smsProvenance && transfer1.smsProvenance.length === 2, 'Scenario 1: Dual provenance persisted (2 records)');
    assert(transfer1.account == null && transfer1.category == null, 'Scenario 1: Single account and category cleared on transfer');

    // =========================================================================
    // Scenario 2: Incoming-First Order (T011)
    // =========================================================================
    console.log('\n--- Scenario 2: Incoming-First Order ---');
    await Transaction.deleteMany({});

    const smsIn2 = 'تم إستقبال تحويل لحظي إلى حسابكم 4113 بمبلغ 500.00 جم يوم 09-18 الساعة 08:15 رقم مرجعي 509818302771';
    const resIn2 = await runWebhook(tokenA, smsIn2);
    assert(resIn2.statusCode === 200, 'Scenario 2: Incoming SMS accepted first');

    const interimTx2 = await Transaction.find({ user: userA._id });
    assert(interimTx2.length === 1 && interimTx2[0].type === 'income', 'Scenario 2: Saved as interim income before counterpart arrives');

    const smsOut2 = 'IPN transfer sent with amount of EGP 500.00 from 0694 on 18/09 at 08:15 AM. Ref# 509818302771. For more details call 19700';
    const resOut2 = await runWebhook(tokenA, smsOut2);
    assert(resOut2.statusCode === 200 && resOut2.responseData.isReconciled === true, 'Scenario 2: Outgoing SMS triggers reconciliation');

    const finalTxs2 = await Transaction.find({ user: userA._id });
    assert(finalTxs2.length === 1, 'Scenario 2: Exactly 1 transaction exists in database');

    const transfer2 = finalTxs2[0];
    assert(transfer2.type === 'transfer', 'Scenario 2: Transaction converted to transfer');
    assert(transfer2.amount === 500, 'Scenario 2: Transfer amount is 500');
    assert(String(transfer2.from_account) === String(accountA_0694._id), 'Scenario 2: Correct from_account (0694) maintained despite arrival order');
    assert(String(transfer2.to_account) === String(accountA_4113._id), 'Scenario 2: Correct to_account (4113) maintained despite arrival order');

    // =========================================================================
    // Scenario 3: Near-Simultaneous Arrival Concurrency (T018)
    // =========================================================================
    console.log('\n--- Scenario 3: Near-Simultaneous Arrival Concurrency ---');
    await Transaction.deleteMany({});

    const smsOut3 = 'IPN transfer sent with amount of EGP 750.00 from 0694 on 18/09 at 09:00 AM. Ref# 99881122. For more details call 19700';
    const smsIn3 = 'تم إستقبال تحويل لحظي إلى حسابكم 4113 بمبلغ 750.00 جم يوم 09-18 الساعة 09:00 رقم مرجعي 99881122';

    const [resOut3, resIn3] = await Promise.all([
      runWebhook(tokenA, smsOut3),
      runWebhook(tokenA, smsIn3)
    ]);

    assert(resOut3.statusCode === 200 && resIn3.statusCode === 200, 'Scenario 3: Both concurrent requests return 200 OK');

    const finalTxs3 = await Transaction.find({ user: userA._id });
    assert(finalTxs3.length === 1, 'Scenario 3: Exactly 1 transfer transaction created without race condition duplication');
    assert(finalTxs3[0].type === 'transfer', 'Scenario 3: Reconciled to transfer');
    assert(finalTxs3[0].amount === 750, 'Scenario 3: Amount matches 750');

    // =========================================================================
    // Scenario 4: Duplicate Delivery and Replay Safety (T017)
    // =========================================================================
    console.log('\n--- Scenario 4: Duplicate Delivery & Replay Safety ---');
    // Replay outgoing SMS from Scenario 3
    const replayOut = await runWebhook(tokenA, smsOut3);
    assert(replayOut.statusCode === 200, 'Scenario 4: Replay of outgoing SMS returns 200 OK');
    assert(replayOut.responseData.message.includes('deduplicated'), 'Scenario 4: Outgoing replay deduplicated via provenance/hash');

    // Replay incoming SMS from Scenario 3
    const replayIn = await runWebhook(tokenA, smsIn3);
    assert(replayIn.statusCode === 200, 'Scenario 4: Replay of incoming SMS returns 200 OK');
    assert(replayIn.responseData.message.includes('deduplicated'), 'Scenario 4: Incoming replay deduplicated via provenance/hash');

    const txsAfterReplay = await Transaction.find({ user: userA._id });
    assert(txsAfterReplay.length === 1, 'Scenario 4: No duplicate transactions created upon replay of either counterpart');

    // =========================================================================
    // Scenario 5: Asymmetric Reference Number (FR-009)
    // =========================================================================
    console.log('\n--- Scenario 5: Asymmetric Reference Presence ---');
    await Transaction.deleteMany({});

    const smsOut5 = 'IPN transfer sent with amount of EGP 120.00 from 0694 on 18/09 at 10:15 AM. Ref# asym12345. For more details call 19700';
    const smsIn5 = 'تم إستقبال تحويل لحظي إلى حسابكم 4113 بمبلغ 120.00 جم يوم 09-18 الساعة 10:15'; // No reference number!

    await runWebhook(tokenA, smsOut5);
    const resIn5 = await runWebhook(tokenA, smsIn5);
    assert(resIn5.responseData.isReconciled === true, 'Scenario 5: Asymmetric reference successfully paired when one side lacks Ref#');

    const finalTxs5 = await Transaction.find({ user: userA._id });
    assert(finalTxs5.length === 1 && finalTxs5[0].type === 'transfer', 'Scenario 5: Reconciled into single transfer');
    assert(finalTxs5[0].referenceNumber === 'asym12345', 'Scenario 5: Reference preserved from outgoing message');

    // =========================================================================
    // Scenario 6: Mismatched Reference Numbers (T021)
    // =========================================================================
    console.log('\n--- Scenario 6: Mismatched Reference Numbers ---');
    await Transaction.deleteMany({});

    const smsOut6 = 'IPN transfer sent with amount of EGP 200.00 from 0694 on 18/09 at 11:00 AM. Ref# ref11111. For more details call 19700';
    const smsIn6 = 'تم إستقبال تحويل لحظي إلى حسابكم 4113 بمبلغ 200.00 جم يوم 09-18 الساعة 11:00 رقم مرجعي ref22222';

    await runWebhook(tokenA, smsOut6);
    const resIn6 = await runWebhook(tokenA, smsIn6);
    assert(resIn6.responseData.isReconciled === false, 'Scenario 6: Pairing rejected when references conflict');

    const finalTxs6 = await Transaction.find({ user: userA._id });
    assert(finalTxs6.length === 2, 'Scenario 6: Both remain independent transactions (1 expense, 1 income)');
    const types6 = finalTxs6.map(t => t.type).sort();
    assert(types6[0] === 'expense' && types6[1] === 'income', 'Scenario 6: Preserved as expense and income');

    // =========================================================================
    // Scenario 7: Same Account on Both Sides (T021)
    // =========================================================================
    console.log('\n--- Scenario 7: Same Account on Both Sides ---');
    await Transaction.deleteMany({});

    const smsOut7 = 'IPN transfer sent with amount of EGP 300.00 from 0694 on 18/09 at 12:00 PM. Ref# sameacc1. For more details call 19700';
    const smsIn7 = 'تم إستقبال تحويل لحظي إلى حسابكم 0694 بمبلغ 300.00 جم يوم 09-18 الساعة 12:00 رقم مرجعي sameacc1';

    await runWebhook(tokenA, smsOut7);
    const resIn7 = await runWebhook(tokenA, smsIn7);
    assert(resIn7.responseData.isReconciled === false, 'Scenario 7: Pairing rejected when source and destination accounts are identical');

    const finalTxs7 = await Transaction.find({ user: userA._id });
    assert(finalTxs7.length === 2, 'Scenario 7: Maintained as two independent transactions');

    // =========================================================================
    // Scenario 8: Pairing Window Exceeded >45s (T021)
    // =========================================================================
    console.log('\n--- Scenario 8: Pairing Window Exceeded (>45s) ---');
    await Transaction.deleteMany({});

    const smsOut8 = 'IPN transfer sent with amount of EGP 400.00 from 0694 on 18/09 at 01:00 PM. Ref# window45. For more details call 19700';
    await runWebhook(tokenA, smsOut8);

    // Backdate the first transaction by 60 seconds (outside the 45s window)
    const backdatedTx = await Transaction.findOne({ user: userA._id });
    await Transaction.collection.updateOne(
      { _id: backdatedTx._id },
      { $set: { createdAt: new Date(Date.now() - 60 * 1000) } }
    );

    const smsIn8 = 'تم إستقبال تحويل لحظي إلى حسابكم 4113 بمبلغ 400.00 جم يوم 09-18 الساعة 01:00 رقم مرجعي window45';
    const resIn8 = await runWebhook(tokenA, smsIn8);
    assert(resIn8.responseData.isReconciled === false, 'Scenario 8: Pairing rejected when messages arrive >45s apart');

    const finalTxs8 = await Transaction.find({ user: userA._id });
    assert(finalTxs8.length === 2, 'Scenario 8: Both transactions preserved independently');

    // =========================================================================
    // Scenario 9: Strict Multi-Tenant Isolation (T021, T023)
    // =========================================================================
    console.log('\n--- Scenario 9: Multi-Tenant Boundary Isolation ---');
    await Transaction.deleteMany({});

    const smsUserA = 'IPN transfer sent with amount of EGP 600.00 from 0694 on 18/09 at 02:00 PM. Ref# tenant1. For more details call 19700';
    const smsUserB = 'تم إستقبال تحويل لحظي إلى حسابكم 0694 بمبلغ 600.00 جم يوم 09-18 الساعة 02:00 رقم مرجعي tenant1';

    await runWebhook(tokenA, smsUserA);
    await runWebhook(tokenB, smsUserB);

    const txsUserA = await Transaction.find({ user: userA._id });
    const txsUserB = await Transaction.find({ user: userB._id });

    assert(txsUserA.length === 1 && txsUserA[0].type === 'expense', 'Scenario 9: User A transaction remains independent expense');
    assert(txsUserB.length === 1 && txsUserB[0].type === 'income', 'Scenario 9: User B transaction remains independent income');
    assert(txsUserA[0].type !== 'transfer' && txsUserB[0].type !== 'transfer', 'Scenario 9: Zero cross-tenant pairing occurred');

    // =========================================================================
    // Scenario 10: Unresolved Account Zero-Guessing Fallback (US1 / US4)
    // =========================================================================
    console.log('\n--- Scenario 10: Zero-Guessing Unresolved Account Fallback ---');
    await Transaction.deleteMany({});

    // SMS where account is not present (e.g. general transfer)
    const smsNoAccount = 'تم تنفيذ تحويل لحظي بمبلغ 250.00 جم إلى شخص آخر رقم مرجعي 987654321 يوم 08-21';
    const smsWithAccount = 'تم إستقبال تحويل لحظي إلى حسابكم 4113 بمبلغ 250.00 جم يوم 08-21 الساعة 04:50 رقم مرجعي 987654321';

    await runWebhook(tokenA, smsNoAccount);
    const resNoAcc = await runWebhook(tokenA, smsWithAccount);

    assert(resNoAcc.responseData.isReconciled === false, 'Scenario 10: Pairing rejected when one message has unresolved account');
    const finalTxs10 = await Transaction.find({ user: userA._id });
    assert(finalTxs10.length === 2, 'Scenario 10: Preserved as two independent transactions');

  } catch (err) {
    console.error('[CRITICAL] Integration Suite Exception:', err);
    failedCount++;
  } finally {
    // Allow any pending background analytics promises to finish
    await new Promise(r => setTimeout(r, 200));
    await mongoose.disconnect();
    console.log(`\n======================================================`);
    console.log(`INTEGRATION RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log(`======================================================`);
    if (failedCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runIntegrationTests();
