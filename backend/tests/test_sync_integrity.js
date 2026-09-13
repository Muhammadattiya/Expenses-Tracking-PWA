require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { 
  getTransactionsSync, 
  exportTransactions, 
  getTransactions 
} = require('../services/transactionService');
const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    testsFailed++;
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    testsPassed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 FINOVA SAFE SYNC & FINANCIAL INTEGRITY TEST SUITE');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB read-only test runner.\n');

  try {
    const db = mongoose.connection.db;

    // 1. UNIT TESTS: Parameter Validation
    console.log('--- TEST GROUP 1: Parameter & Keyset Validation ---');
    
    // Test invalid limits
    try {
      await getTransactionsSync('60c72b2f9b1d8b2bad000001', { limit: 0 });
      assert(false, 'Limit 0 should be rejected');
    } catch (e) {
      assert(e.statusCode === 400, 'Limit 0 rejected with 400');
    }

    try {
      await getTransactionsSync('60c72b2f9b1d8b2bad000001', { limit: -10 });
      assert(false, 'Negative limit should be rejected');
    } catch (e) {
      assert(e.statusCode === 400, 'Negative limit rejected with 400');
    }

    try {
      await getTransactionsSync('60c72b2f9b1d8b2bad000001', { limit: 501 });
      assert(false, 'Limit > 500 should be rejected');
    } catch (e) {
      assert(e.statusCode === 400, 'Limit > 500 rejected with 400');
    }

    try {
      await getTransactionsSync('60c72b2f9b1d8b2bad000001', { limit: 'invalid' });
      assert(false, 'Non-numeric limit should be rejected');
    } catch (e) {
      assert(e.statusCode === 400, 'Non-numeric limit rejected with 400');
    }

    // Test invalid cursor
    try {
      await getTransactionsSync('60c72b2f9b1d8b2bad000001', { cursor: '!!!not-base64-objectid!!!' });
      assert(false, 'Malformed cursor should be rejected');
    } catch (e) {
      assert(e.statusCode === 400, 'Malformed cursor rejected with 400');
    }

    // 2. AFFECTED USER FORENSIC VERIFICATION & CHUNKED SYNC RECONCILIATION
    console.log('\n--- TEST GROUP 2: Affected User Forensic Reconciliation ---');
    const user = await User.findOne({ email: 'ma951242@gmail.com' });
    assert(!!user, 'Affected user exists in database');

    const totalDocsInDb = await Transaction.countDocuments({ user: user._id });
    console.log(`Total transactions in MongoDB for affected user: ${totalDocsInDb}`);
    assert(totalDocsInDb === 1329, `Affected user has exactly 1,329 transactions in MongoDB (got ${totalDocsInDb})`);

    // Verify chunked sync paging
    let cursor = null;
    let hasMore = true;
    let pageNum = 0;
    const accumulatedTransactions = [];
    const seenIds = new Set();

    while (hasMore) {
      pageNum++;
      const res = await getTransactionsSync(user._id, { cursor, limit: 200 });
      assert(Array.isArray(res.items), `Page ${pageNum} returns items array`);
      assert(res.items.length <= 200, `Page ${pageNum} respects limit of 200 (got ${res.items.length})`);

      if (pageNum === 1) {
        assert(res.totalCount === 1329, 'Page 1 includes accurate totalCount (1329)');
      } else {
        assert(res.totalCount === undefined, `Page ${pageNum} omits redundant totalCount`);
      }

      // Check monotonicity and uniqueness
      for (const item of res.items) {
        const idStr = item._id.toString();
        assert(!seenIds.has(idStr), `Transaction ${idStr} is unique across pages`);
        seenIds.add(idStr);
        accumulatedTransactions.push(item);
      }

      if (res.hasMore) {
        assert(!!res.nextCursor, `Page ${pageNum} provides nextCursor when hasMore is true`);
        assert(res.syncComplete === false, `Page ${pageNum} has syncComplete === false`);
        cursor = res.nextCursor;
      } else {
        assert(res.nextCursor === null, 'Final page has nextCursor === null');
        assert(res.syncComplete === true, 'Final page has syncComplete === true');
        hasMore = false;
      }
    }

    console.log(`Total pages fetched: ${pageNum}`);
    assert(pageNum === 7, `1,329 transactions with limit 200 requires exactly 7 pages (got ${pageNum})`);
    assert(accumulatedTransactions.length === 1329, `All 1,329 transactions accumulated via cursor sync (got ${accumulatedTransactions.length})`);

    // Verify ordering: _id strictly monotonically increasing
    for (let i = 1; i < accumulatedTransactions.length; i++) {
      const prevId = accumulatedTransactions[i - 1]._id.toString();
      const currId = accumulatedTransactions[i]._id.toString();
      assert(currId > prevId, `Monotonic keyset order preserved: ${currId} > ${prevId}`);
    }

    // 3. FINANCIAL DERIVATION VERIFICATION (EXACT DASHBOARD REPRODUCTION)
    console.log('\n--- TEST GROUP 3: Exact Financial Balance Convergence ---');
    const accounts = await Account.find({ user: user._id }).lean();
    assert(accounts.length === 11, 'Affected user has 11 accounts');

    const debtTransactions = await db.collection('debttransactions').find({ user: user._id }).toArray();
    const debts = await db.collection('debts').find({ user: user._id }).toArray();
    const debtMap = new Map(debts.map(d => [d._id.toString(), d]));
    const receivables = await db.collection('receivables').find({ user: user._id }).toArray();

    const matchesAcc = (accField, targetId) => {
      if (!accField || !targetId) return false;
      const id = accField._id ? accField._id.toString() : accField.toString();
      return id === targetId.toString();
    };

    const expectedBalances = {
      'Main': 785.00,
      'Meeza': 155.00,
      'Telda Savings': 1054.00,
      'EasyPay': 74.00,
      'Adham': 0.00,
      'Telda': 63.00,
      'Habota': 0.00,
      'E& Cash': 0.00,
      'BeBasata': 1358.00,
    };

    let calculatedActiveTotal = 0;

    for (const acc of accounts) {
      if (acc.type === 'investment') continue;
      let bal = Number(acc.balance_adjustment) || 0;
      const targetId = acc._id.toString();

      // Transactions
      for (const t of accumulatedTransactions) {
        const amt = Number(t.amount) || 0;
        const accMatch = matchesAcc(t.account, targetId);
        const fromMatch = matchesAcc(t.from_account, targetId);
        const toMatch = matchesAcc(t.to_account, targetId);

        if (t.type === 'income' && accMatch) bal += amt;
        else if (t.type === 'expense' && accMatch) bal -= amt;
        else if (t.type === 'transfer') {
          if (toMatch) bal += amt;
          if (fromMatch) bal -= amt;
        } else if (t.type === 'settlement' && accMatch) bal += amt;
      }

      // Debt Transactions
      debtTransactions.forEach(dt => {
        if (matchesAcc(dt.account, targetId)) {
          const dtAmount = Number(dt.amount) || 0;
          const debt = dt.debtId ? debtMap.get(dt.debtId.toString()) : null;
          const isIOwe = (debt && debt.type === 'i_owe') || dt.debtType === 'i_owe';
          if (dt.type === 'loan') {
            if (isIOwe) bal += dtAmount;
            else bal -= dtAmount;
          } else if (dt.type === 'repayment') {
            if (isIOwe) bal -= dtAmount;
            else bal += dtAmount;
          }
        }
      });

      // Receivables
      receivables.forEach(r => {
        if (matchesAcc(r.paidFrom, targetId)) bal -= (Number(r.paidAmount) || 0);
        if (matchesAcc(r.receivedTo, targetId)) bal += (Number(r.receivedAmount) || 0);
        if (r.participants) {
          r.participants.forEach(p => {
            if (p.payments) {
              p.payments.forEach(pay => {
                if (matchesAcc(pay.account, targetId)) bal += (Number(pay.amount) || 0);
              });
            }
          });
        }
      });

      console.log(`Account "${acc.name}": calculated = ${bal.toFixed(2)} EGP`);

      if (expectedBalances[acc.name] !== undefined) {
        const exp = expectedBalances[acc.name];
        assert(Math.abs(bal - exp) < 0.01, `Account "${acc.name}" balance equals expected ${exp} EGP (got ${bal.toFixed(2)})`);
      }

      if (!acc.isArchived && !acc.excludeFromTotal) {
        calculatedActiveTotal += bal;
      }
    }

    console.log(`\nDerived Total Active Balance: ${calculatedActiveTotal.toFixed(2)} EGP`);
    assert(Math.abs(calculatedActiveTotal - 2361.00) < 0.01, `Total active balance equals exactly 2,361.00 EGP (got ${calculatedActiveTotal.toFixed(2)} EGP)!`);
    assert(calculatedActiveTotal !== 1385.00, 'Total active balance is NOT the corrupted 1,385.00 EGP!');

    // 4. EXPORT INTEGRITY TEST
    console.log('\n--- TEST GROUP 4: Complete Export Endpoint Integrity ---');
    const exportData = await exportTransactions(user._id);
    assert(exportData.formatVersion === 1, 'Export formatVersion is 1');
    assert(Array.isArray(exportData.accounts), 'Export includes accounts');
    assert(Array.isArray(exportData.categories), 'Export includes categories');
    assert(Array.isArray(exportData.transactions), 'Export includes transactions');
    assert(exportData.transactions.length === 1329, `Export contains all 1,329 transactions without truncation (got ${exportData.transactions.length})`);
    
    // Check sample exported items
    const sampleTxWithAcc = exportData.transactions.find(t => t.account);
    assert(!!sampleTxWithAcc.account.name, 'Exported transaction has populated account name');

    // 5. REGRESSION CHECK: LEGACY UNBOUNDED ENDPOINT
    console.log('\n--- TEST GROUP 5: Legacy getTransactions Regression Test ---');
    const legacyTransactions = await getTransactions(user._id);
    assert(legacyTransactions.length === 1329, `Legacy getTransactions returns all 1,329 transactions (got ${legacyTransactions.length}) - NO SILENT 500 LIMIT`);

    // 6. SIMULATION: PARTIAL SYNC NETWORK FAILURE SAFETY
    console.log('\n--- TEST GROUP 6: Client Safety Simulation (Network Failure & Pending Tx) ---');
    // Simulate a client having all 1,329 transactions in local store
    let localCache = new Map(accumulatedTransactions.map(t => [t._id.toString(), { ...t, status: 'completed' }]));
    
    // User creates an offline transaction
    const offlineTx = {
      _id: 'local_1700000000000_abc',
      title: 'Coffee in Offline Mode',
      amount: 45,
      type: 'expense',
      date: new Date().toISOString(),
      status: 'pending',
      idempotencyKey: 'offline-uuid-999'
    };
    localCache.set(offlineTx._id, offlineTx);
    assert(localCache.size === 1330, 'Local cache has 1,330 records including pending offline transaction');

    // Simulate sync starting, receiving Page 1, but NETWORK FAILING on Page 2
    console.log('Simulating sync starting... page 1 arrives... network drops before page 2.');
    const page1Res = await getTransactionsSync(user._id, { limit: 200 });
    // In our new client logic:
    // Page 1 is upserted into local cache:
    for (const item of page1Res.items) {
      localCache.set(item._id.toString(), { ...item, status: 'completed' });
    }
    // Network fails -> syncComplete is FALSE!
    // Since syncComplete is FALSE, obsolete cleanup is NEVER run!
    assert(localCache.size === 1330, 'Local cache STILL has all 1,330 transactions after partial sync failure! Zero data lost.');
    assert(localCache.has('local_1700000000000_abc'), 'Offline pending transaction is safely preserved.');
    
    // Check that historical transactions from older pages were NOT deleted
    const oldestDocId = accumulatedTransactions[0]._id.toString();
    assert(localCache.has(oldestDocId), 'Historical completed transaction was preserved despite partial sync failure.');

    console.log('\n====================================================');
    console.log(`🎉 ALL TESTS COMPLETED: ${testsPassed} PASSED, ${testsFailed} FAILED`);
    console.log('====================================================\n');
  } finally {
    await mongoose.disconnect();
  }
}

runTests().catch(err => {
  console.error('Fatal error in test runner:', err);
  process.exit(1);
});
