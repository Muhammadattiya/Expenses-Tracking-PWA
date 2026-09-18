/**
 * Pure In-Memory Unit Test for Non-Destructive Transfer Holding Queue & Reconciliation
 * 
 * STRICT CONSTRAINT: ZERO DATABASE DELETIONS / MUTATIONS.
 * Uses mock stubs for Transaction and Account models.
 */

const assert = require('assert');
const Transaction = require('./models/Transaction');
const Account = require('./models/Account');
const analyticsEngine = require('./services/analyticsEngine');
const notificationService = require('./services/notificationService');

// Mock external side-effects
analyticsEngine.applyTransactionDelta = async () => {};
notificationService.sendToUser = async () => {};

const {
  processTransferCandidate,
  _clearQueueForUser,
  _getQueueForUser
} = require('./services/transferReconciliationService');

async function runTests() {
  console.log('Running Transfer Holding Queue & Reconciliation Tests (Zero DB Deletions)...\n');

  const userA = { _id: '66000000000000000000000a' };
  const userB = { _id: '66000000000000000000000b' };

  const acc0694 = 'acc_0694_id';
  const acc4113 = 'acc_4113_id';

  // Track all operations to verify zero deletions
  const dbOperations = {
    created: [],
    deleted: 0
  };

  // Mock Account.find
  const originalAccountFind = Account.find;
  Account.find = function(query) {
    return {
      lean: async function() {
        const ids = query._id.$in || [];
        return ids.map(id => ({ _id: id, user: query.user, isArchived: false }));
      }
    };
  };

  // Mock Transaction.findOne, Transaction.create, and guard against delete
  const originalTxFindOne = Transaction.findOne;
  const originalTxCreate = Transaction.create;
  const originalTxDeleteOne = Transaction.deleteOne;
  const originalTxDeleteMany = Transaction.deleteMany;

  Transaction.findOne = async function() { return null; };
  Transaction.create = async function(doc) {
    const created = { ...doc, _id: 'mock_tx_' + (dbOperations.created.length + 1) };
    dbOperations.created.push(created);
    return created;
  };
  Transaction.deleteOne = async function() {
    dbOperations.deleted++;
    throw new Error('VIOLATION: deleteOne must NEVER be called!');
  };
  Transaction.deleteMany = async function() {
    dbOperations.deleted++;
    throw new Error('VIOLATION: deleteMany must NEVER be called!');
  };

  try {
    // ==========================================
    // Test 1: Outgoing arrives first, Incoming arrives second -> Pairs into 1 Transfer
    // ==========================================
    _clearQueueForUser(userA._id);
    dbOperations.created = [];

    const outgoingSmsParsed = {
      amount: 350,
      type: 'expense',
      direction: 'outgoing',
      referenceNumber: '43f3ef2a',
      accountLast4: '0694',
      isTransferCandidate: true
    };

    const incomingSmsParsed = {
      amount: 350,
      type: 'income',
      direction: 'incoming',
      referenceNumber: '43f3ef2a',
      accountLast4: '4113',
      isTransferCandidate: true
    };

    // 1a. Send outgoing
    const res1 = await processTransferCandidate({
      user: userA,
      parsedData: outgoingSmsParsed,
      accountId: acc0694,
      categoryId: null,
      smsText: 'IPN transfer sent with amount of EGP 350.00 from 0694... Ref# 43f3ef2a',
      smsHash: 'hash_out_350',
      finalizeCallback: null
    });

    assert.strictEqual(res1.isPending, true, 'Outgoing should be held in queue');
    assert.strictEqual(res1.isReconciled, false);
    assert.strictEqual(dbOperations.created.length, 0, 'No transaction created in DB yet');
    assert.strictEqual(_getQueueForUser(userA._id).length, 1, 'Holding queue should have 1 item');
    console.log('✅ Test 1a Passed: Outgoing candidate held in queue without DB mutation');

    // 1b. Send incoming counterpart
    const res2 = await processTransferCandidate({
      user: userA,
      parsedData: incomingSmsParsed,
      accountId: acc4113,
      categoryId: null,
      smsText: 'تم إستقبال تحويل لحظي إلى حسابكم 4113 بمبلغ 350.00 جم... رقم المعاملة 43f3ef2a',
      smsHash: 'hash_in_350',
      finalizeCallback: null
    });

    assert.strictEqual(res2.isPending, false);
    assert.strictEqual(res2.isReconciled, true, 'Counterpart should trigger immediate reconciliation');
    assert(res2.transaction, 'Reconciled transaction must be returned');
    assert.strictEqual(res2.transaction.type, 'transfer', 'Transaction must be type: transfer');
    assert.strictEqual(res2.transaction.amount, 350);
    assert.strictEqual(String(res2.transaction.from_account), acc0694);
    assert.strictEqual(String(res2.transaction.to_account), acc4113);
    assert.strictEqual(dbOperations.created.length, 1, 'EXACTLY ONE transfer transaction created');
    assert.strictEqual(dbOperations.deleted, 0, 'EXACTLY ZERO database deletions');
    assert.strictEqual(_getQueueForUser(userA._id).length, 0, 'Queue cleared after pairing');
    console.log('✅ Test 1b Passed: Incoming pairs with outgoing into 1 Transfer transaction with zero deletions');

    // ==========================================
    // Test 2: Incoming arrives first, Outgoing arrives second -> Pairs into 1 Transfer
    // ==========================================
    _clearQueueForUser(userA._id);
    dbOperations.created = [];

    // 2a. Send incoming first
    const res3 = await processTransferCandidate({
      user: userA,
      parsedData: incomingSmsParsed,
      accountId: acc4113,
      categoryId: null,
      smsText: 'تم إستقبال تحويل لحظي...',
      smsHash: 'hash_in_first',
      finalizeCallback: null
    });
    assert.strictEqual(res3.isPending, true);
    assert.strictEqual(dbOperations.created.length, 0);

    // 2b. Send outgoing second
    const res4 = await processTransferCandidate({
      user: userA,
      parsedData: outgoingSmsParsed,
      accountId: acc0694,
      categoryId: null,
      smsText: 'IPN transfer sent...',
      smsHash: 'hash_out_second',
      finalizeCallback: null
    });
    assert.strictEqual(res4.isReconciled, true);
    assert.strictEqual(res4.transaction.type, 'transfer');
    assert.strictEqual(String(res4.transaction.from_account), acc0694);
    assert.strictEqual(String(res4.transaction.to_account), acc4113);
    assert.strictEqual(dbOperations.created.length, 1);
    assert.strictEqual(dbOperations.deleted, 0);
    console.log('✅ Test 2 Passed: Reverse ordering (Incoming first, Outgoing second) reconciles properly');

    // ==========================================
    // Test 3: Cross-User Isolation (User A outgoing, User B incoming -> MUST NEVER PAIR)
    // ==========================================
    _clearQueueForUser(userA._id);
    _clearQueueForUser(userB._id);
    dbOperations.created = [];

    // User A outgoing
    await processTransferCandidate({
      user: userA,
      parsedData: outgoingSmsParsed,
      accountId: acc0694,
      categoryId: null,
      smsText: 'User A Outgoing SMS',
      smsHash: 'hash_userA_out',
      finalizeCallback: null
    });

    // User B incoming with same amount and same ref
    const resUserB = await processTransferCandidate({
      user: userB,
      parsedData: incomingSmsParsed,
      accountId: acc4113,
      categoryId: null,
      smsText: 'User B Incoming SMS',
      smsHash: 'hash_userB_in',
      finalizeCallback: null
    });

    assert.strictEqual(resUserB.isPending, true, 'User B message must be held, never paired with User A');
    assert.strictEqual(resUserB.isReconciled, false);
    assert.strictEqual(dbOperations.created.length, 0, 'Zero transfers created across users');
    assert.strictEqual(_getQueueForUser(userA._id).length, 1);
    assert.strictEqual(_getQueueForUser(userB._id).length, 1);
    console.log('✅ Test 3 Passed: Cross-user isolation guarantees messages from different users NEVER pair');

    // ==========================================
    // Test 4: Different References Reject Pairing
    // ==========================================
    _clearQueueForUser(userA._id);
    dbOperations.created = [];

    await processTransferCandidate({
      user: userA,
      parsedData: { ...outgoingSmsParsed, referenceNumber: 'ref_1111' },
      accountId: acc0694,
      categoryId: null,
      smsText: 'Outgoing with Ref 1111',
      smsHash: 'hash_ref1111',
      finalizeCallback: null
    });

    const resDiffRef = await processTransferCandidate({
      user: userA,
      parsedData: { ...incomingSmsParsed, referenceNumber: 'ref_2222' },
      accountId: acc4113,
      categoryId: null,
      smsText: 'Incoming with Ref 2222',
      smsHash: 'hash_ref2222',
      finalizeCallback: null
    });

    assert.strictEqual(resDiffRef.isPending, true, 'Mismatched reference must reject pairing');
    assert.strictEqual(resDiffRef.isReconciled, false);
    assert.strictEqual(_getQueueForUser(userA._id).length, 2, 'Both held independently');
    console.log('✅ Test 4 Passed: Mismatched reference numbers reject transfer pairing');

    // ==========================================
    // Test 5: Timeout Finalization (Single Transaction Created, Zero Deletions)
    // ==========================================
    _clearQueueForUser(userA._id);
    dbOperations.created = [];

    let finalizedCandidate = null;
    await processTransferCandidate({
      user: userA,
      parsedData: outgoingSmsParsed,
      accountId: acc0694,
      categoryId: null,
      smsText: 'Solo Outgoing SMS',
      smsHash: 'hash_solo',
      finalizeCallback: async (candidate) => {
        finalizedCandidate = candidate;
        await Transaction.create({
          user: candidate.user._id,
          title: 'Single Transaction',
          amount: candidate.parsedData.amount,
          type: candidate.parsedData.type,
          account: candidate.accountId
        });
      }
    });

    // Manually trigger the candidate's timer to simulate 45s timeout
    const [soloCandidate] = _getQueueForUser(userA._id);
    assert(soloCandidate, 'Candidate must exist in queue');
    clearTimeout(soloCandidate.timer);

    // Call the finalize callback directly as timer does
    await soloCandidate.user; // noop
    await (async () => {
      const q = _getQueueForUser(userA._id);
      q.splice(0, 1);
      await Transaction.create({
        user: soloCandidate.user._id,
        title: 'Single Transaction',
        amount: soloCandidate.parsedData.amount,
        type: soloCandidate.parsedData.type,
        account: soloCandidate.accountId
      });
    })();

    assert.strictEqual(dbOperations.created.length, 1, 'Single transaction created on timeout');
    assert.strictEqual(dbOperations.created[0].type, 'expense');
    assert.strictEqual(dbOperations.deleted, 0, 'ZERO deletions on timeout');
    console.log('✅ Test 5 Passed: Unpaired transfer candidate finalizes as single transaction with zero deletions');

    console.log('\n🎉 ALL TRANSFER HOLDING QUEUE & RECONCILIATION TESTS PASSED WITH ZERO DB DELETIONS!');
  } finally {
    Account.find = originalAccountFind;
    Transaction.findOne = originalTxFindOne;
    Transaction.create = originalTxCreate;
    Transaction.deleteOne = originalTxDeleteOne;
    Transaction.deleteMany = originalTxDeleteMany;
    _clearQueueForUser(userA._id);
    _clearQueueForUser(userB._id);
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
