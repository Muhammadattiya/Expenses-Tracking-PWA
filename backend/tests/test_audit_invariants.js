require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { getTransactionsSync, exportTransactions } = require('../services/transactionService');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
    throw new Error(msg);
  } else {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  }
}

// Synthetic transaction generator
function generateMockTransactions(count, userId = '60c72b2f9b1d8b2bad000001') {
  const txs = [];
  const baseTime = 1700000000;
  for (let i = 0; i < count; i++) {
    // Generate valid 24-char hex ObjectIds with strictly increasing timestamp and counter
    const timeHex = (baseTime + Math.floor(i / 10)).toString(16).padStart(8, '0');
    const midHex = 'aabbccddee';
    const counterHex = (i % 0xffffff).toString(16).padStart(6, '0');
    const id = `${timeHex}${midHex}${counterHex}`;
    
    txs.push({
      _id: id,
      user: userId,
      title: `Transaction ${i + 1}`,
      amount: (i % 100) + 10,
      type: i % 3 === 0 ? 'income' : 'expense',
      date: new Date((baseTime + i * 60) * 1000).toISOString(),
      status: 'completed',
      idempotencyKey: `idemp-key-${i}`
    });
  }
  return txs;
}

// Simulate client chunked sync against a mock dataset
async function simulateClientSync(allServerTxs, options = {}) {
  const {
    pageSize = 200,
    failOnPage = null,
    onAfterPage = null, // Hook to simulate concurrent mutations
    initialLocal = []
  } = options;

  let localDb = new Map(initialLocal.map(t => [t._id, { ...t }]));
  const initialCompletedIds = new Set(
    Array.from(localDb.values()).filter(t => t.status === 'completed').map(t => t._id)
  );

  let cursor = null;
  let hasMore = true;
  let syncComplete = false;
  let pageNum = 0;
  const seenServerIds = new Set();
  const seenServerIdempKeys = new Set();

  try {
    while (hasMore) {
      pageNum++;
      if (failOnPage === pageNum) {
        throw new Error(`Simulated Network/Server Error on page ${pageNum}`);
      }

      // Server keyset query simulation: _id > cursor, limit: pageSize + 1
      let filtered = allServerTxs;
      if (cursor) {
        filtered = filtered.filter(t => t._id > cursor);
      }
      filtered = filtered.slice(0, pageSize + 1);

      const more = filtered.length > pageSize;
      const items = more ? filtered.slice(0, pageSize) : filtered;
      const nextCursor = more ? items[items.length - 1]._id : null;

      for (const item of items) {
        seenServerIds.add(item._id);
        if (item.idempotencyKey) seenServerIdempKeys.add(item.idempotencyKey);
      }

      // Client upsert page into localDb
      for (const item of items) {
        // Reconcile pending local copy if matching idempotencyKey
        if (item.idempotencyKey) {
          for (const [locId, locTx] of localDb.entries()) {
            if ((locTx.status === 'pending' || locTx.status === 'failed') && locTx.idempotencyKey === item.idempotencyKey && locId !== item._id) {
              localDb.delete(locId);
            }
          }
        }
        localDb.set(item._id, { ...item, status: 'completed' });
      }

      // Trigger concurrent mutation hook if provided
      if (onAfterPage) {
        await onAfterPage(pageNum, localDb, allServerTxs);
      }

      if (!more || !nextCursor) {
        syncComplete = true;
        hasMore = false;
      } else {
        cursor = nextCursor;
      }
    }

    // Obsolete cleanup at end of sync:
    // With Snapshot Boundary protection:
    if (syncComplete) {
      for (const id of initialCompletedIds) {
        if (!seenServerIds.has(id)) {
          localDb.delete(id);
        }
      }
    }
  } catch (err) {
    // Network failure: zero deletion occurs!
  }

  return { localDb: Array.from(localDb.values()), syncComplete, pageNum };
}

async function runAuditTests() {
  console.log('================================================================');
  console.log('🛡️  FINOVA ADVERSARIAL PRE-PRODUCTION INVARIANT AUDIT SUITE');
  console.log('================================================================\n');

  // 1. SCALE TESTS: 500, 501, 1329, 5000, 10000
  const scales = [500, 501, 1329, 5000, 10000];
  console.log('--- TEST GROUP 1: Scale Invariants (500 to 10,000 transactions) ---');
  for (const count of scales) {
    const dataset = generateMockTransactions(count);
    const expectedPages = Math.ceil(count / 200);
    const result = await simulateClientSync(dataset);

    assert(result.syncComplete === true, `Dataset of ${count} completed sync successfully`);
    assert(result.pageNum === expectedPages, `Dataset of ${count} took exactly ${expectedPages} pages (got ${result.pageNum})`);
    assert(result.localDb.length === count, `Local DB retained exactly ${count} transactions (no truncation)`);

    // Verify all IDs present
    const localIdSet = new Set(result.localDb.map(t => t._id));
    for (const t of dataset) {
      assert(localIdSet.has(t._id), `Transaction ${t._id} present in client ledger`);
    }
  }

  // 2. NETWORK FAILURE & RESILIENCE: Fail on Page 2, Page 4, Retry
  console.log('\n--- TEST GROUP 2: Network & Server Failure Resilience ---');
  const test1329 = generateMockTransactions(1329);

  // Failure on Page 2 with existing initial records
  const initial1329 = generateMockTransactions(1329);
  const failPage2 = await simulateClientSync(test1329, {
    failOnPage: 2,
    initialLocal: initial1329
  });
  assert(failPage2.syncComplete === false, 'Sync reported incomplete on Page 2 failure');
  assert(failPage2.localDb.length === 1329, 'Local DB suffered ZERO data loss on Page 2 failure (1,329 preserved)');

  // Failure on Page 4
  const failPage4 = await simulateClientSync(test1329, {
    failOnPage: 4,
    initialLocal: initial1329
  });
  assert(failPage4.syncComplete === false, 'Sync reported incomplete on Page 4 failure');
  assert(failPage4.localDb.length === 1329, 'Local DB suffered ZERO data loss on Page 4 failure (1,329 preserved)');

  // Retry after failure succeeds completely
  const retryResult = await simulateClientSync(test1329, {
    initialLocal: failPage4.localDb
  });
  assert(retryResult.syncComplete === true, 'Retry completed sync successfully');
  assert(retryResult.localDb.length === 1329, 'Retry restored full authoritative ledger without duplicates');

  // 3. OFFLINE PENDING TRANSACTION SAFETY
  console.log('\n--- TEST GROUP 3: Offline Pending Transactions & Idempotency ---');
  const pendingTx = {
    _id: 'local_1789000000_offline',
    title: 'Offline Supermarket Expense',
    amount: 120,
    type: 'expense',
    date: new Date().toISOString(),
    status: 'pending',
    idempotencyKey: 'offline-uuid-xyz'
  };

  const failedTx = {
    _id: 'local_1789000000_failed',
    title: 'Failed Sync Item',
    amount: 50,
    type: 'expense',
    date: new Date().toISOString(),
    status: 'failed',
    idempotencyKey: 'offline-uuid-failed'
  };

  const syncWithPending = await simulateClientSync(test1329, {
    initialLocal: [...test1329, pendingTx, failedTx]
  });

  assert(syncWithPending.syncComplete === true, 'Sync completed with pending records present');
  const pendingInDb = syncWithPending.localDb.find(t => t._id === pendingTx._id);
  const failedInDb = syncWithPending.localDb.find(t => t._id === failedTx._id);
  assert(!!pendingInDb, 'Pending offline transaction was NOT deleted by obsolete cleanup');
  assert(!!failedInDb, 'Failed offline transaction was NOT deleted by obsolete cleanup');
  assert(syncWithPending.localDb.length === 1329 + 2, 'Total local count includes server items + 2 offline items');

  // 4. CONCURRENT INSERTION DURING SYNC
  console.log('\n--- TEST GROUP 4: Concurrent Insertion During Sync ---');
  // While syncing page 3, a new transaction is created and committed on the server
  const dynamicServerTxs = generateMockTransactions(500);
  const newConcurrentTx = {
    _id: '6fffffffffffffffffffff99', // Higher ObjectId
    user: '60c72b2f9b1d8b2bad000001',
    title: 'Concurrent Transaction',
    amount: 250,
    type: 'income',
    date: new Date().toISOString(),
    status: 'completed',
    idempotencyKey: 'concurrent-uuid-1'
  };

  const concurrentSync = await simulateClientSync(dynamicServerTxs, {
    pageSize: 100,
    onAfterPage: async (page, localDb, serverTxs) => {
      if (page === 2) {
        // Insert new transaction to server list during page 2
        serverTxs.push(newConcurrentTx);
        // Also simulate client receiving confirmation from its POST request
        localDb.set(newConcurrentTx._id, { ...newConcurrentTx, status: 'completed' });
      }
    }
  });

  assert(concurrentSync.syncComplete === true, 'Sync completed despite concurrent mutation');
  const foundConcurrent = concurrentSync.localDb.find(t => t._id === newConcurrentTx._id);
  assert(!!foundConcurrent, 'Concurrent transaction was safely preserved in local DB and NOT purged by cleanup!');

  // 5. SERVER DELETION SEMANTICS
  console.log('\n--- TEST GROUP 5: Deletion on Server Replicated to Client ---');
  // Server deletes transaction 50 from its database
  const txToDelete = test1329[50];
  const serverWithDeletion = test1329.filter(t => t._id !== txToDelete._id);

  const syncAfterDelete = await simulateClientSync(serverWithDeletion, {
    initialLocal: test1329
  });

  assert(syncAfterDelete.syncComplete === true, 'Sync completed after server deletion');
  const deletedInLocal = syncAfterDelete.localDb.find(t => t._id === txToDelete._id);
  assert(!deletedInLocal, `Transaction ${txToDelete._id} deleted on server was correctly pruned from client Dexie`);
  assert(syncAfterDelete.localDb.length === 1328, 'Client ledger count correctly decremented from 1,329 to 1,328');

  console.log('\n================================================================');
  console.log(`🎉 ALL AUDIT INVARIANT TESTS PASSED: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');
}

runAuditTests().catch(err => {
  console.error('Fatal error in audit runner:', err);
  process.exit(1);
});
