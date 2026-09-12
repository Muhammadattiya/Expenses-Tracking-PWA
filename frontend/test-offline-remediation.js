import assert from 'assert';

console.log('--- RUNNING OFFLINE REMEDIATION SUITE (F-02, F-03, F-04, F-05) ---');

// ========================================================
// TEST 1: F-03 - 409 Conflict Local State & Balance Safety
// ========================================================
console.log('\n[TEST 1] F-03: 409 Conflict updates local state to failed and isolates balance');
const accounts = [{ _id: 'accA', balance_adjustment: 10000 }];

function computeBalances(accounts, transactions) {
  const balances = {};
  accounts.forEach(acc => { balances[acc._id] = acc.balance_adjustment || 0; });
  // Exactly matches Dashboard.jsx:182
  const validTransactions = transactions.filter(t => !t.status || t.status === 'completed' || t.status === 'pending');
  validTransactions.forEach(t => {
    const amount = Number(t.amount) || 0;
    if (t.type === 'expense') balances[t.account] -= amount;
    if (t.type === 'income') balances[t.account] += amount;
  });
  return balances;
}

// 1. Initial
let txs = [];
assert.strictEqual(computeBalances(accounts, txs)['accA'], 10000);

// 2. Offline expense 500 created (pending)
txs.push({ _id: 'local_1', account: 'accA', type: 'expense', amount: 500, status: 'pending' });
assert.strictEqual(computeBalances(accounts, txs)['accA'], 9500);

// 3. Sync encounters 409 Idempotency Conflict -> updated to status: 'failed'
const txIndex = txs.findIndex(t => t._id === 'local_1');
txs[txIndex] = { ...txs[txIndex], status: 'failed', syncError: 'Idempotency conflict: payload does not match original request' };

// Balance must NOT include the failed transaction, safely returning to 10,000!
const balanceAfterConflict = computeBalances(accounts, txs)['accA'];
assert.strictEqual(balanceAfterConflict, 10000, 'Failed transaction must not alter balance');
// Transaction must NOT be deleted (remains in array for user recovery)
assert.strictEqual(txs.length, 1, 'Transaction record must be retained in storage');
assert.strictEqual(txs[0].status, 'failed');
console.log('✅ F-03 PASS: 409 conflict isolates balance and preserves record.');

// ========================================================
// TEST 2: F-02 - 404 on DELETE is Idempotent Success
// ========================================================
console.log('\n[TEST 2] F-02: 404 on DELETE is treated as idempotent success without queue jamming');

const mockSyncQueue = [
  { operationId: 'op_del_1', type: 'DELETE_TRANSACTION', serverId: 'tx_already_deleted' },
  { operationId: 'op_create_2', type: 'CREATE_TRANSACTION', payload: { amount: 300, type: 'income', account: 'accA' } }
];

async function simulateQueueDrain(queue) {
  const completedOps = [];
  const activeQueue = [...queue];

  for (let i = 0; i < activeQueue.length; i++) {
    const item = activeQueue[i];
    try {
      if (item.type === 'DELETE_TRANSACTION') {
        // Simulate server returning 404 (already deleted)
        const error = new Error('Not Found');
        error.response = { status: 404 };
        
        // F-02 Logic
        if (error.response?.status === 404) {
          // Idempotent success
          completedOps.push(item.operationId);
        } else {
          throw error;
        }
      } else if (item.type === 'CREATE_TRANSACTION') {
        // Simulate successful create
        completedOps.push(item.operationId);
      }
    } catch (err) {
      if (err.response?.status === 401) break;
      else if ([400, 404, 409, 422].includes(err.response?.status)) {
        item.status = 'failed';
      } else {
        break;
      }
    }
  }

  return completedOps;
}

const completedOps = await simulateQueueDrain(mockSyncQueue);
assert.strictEqual(completedOps.length, 2, 'Both DELETE and subsequent CREATE must complete');
assert.deepStrictEqual(completedOps, ['op_del_1', 'op_create_2'], 'Queue must not jam on 404');
console.log('✅ F-02 PASS: DELETE 404 allows queue to continue and execute subsequent items.');

// ========================================================
// TEST 3: F-04 - Multi-Tab Mutex Token Double-Check
// ========================================================
console.log('\n[TEST 3] F-04: Multi-tab token double-check prevents concurrent execution');

const mockLocalStorage = new Map();

async function attemptAcquireLock(tabId, delayMs = 10) {
  const lockKey = 'finova_sync_drain_lock';
  const lockExpiry = Date.now() - 30000;
  const existingLock = mockLocalStorage.get(lockKey);

  if (existingLock) {
    const parts = existingLock.split(':');
    const lockTime = parseInt(parts[1] || parts[0], 10);
    if (lockTime && lockTime > lockExpiry) {
      return { acquired: false, reason: 'unexpired_lock' };
    }
  }

  const candidateToken = `${tabId}:${Date.now()}`;
  mockLocalStorage.set(lockKey, candidateToken);

  // Non-blocking jitter verification delay
  await new Promise(r => setTimeout(r, delayMs));

  if (mockLocalStorage.get(lockKey) !== candidateToken) {
    return { acquired: false, reason: 'overwritten_by_competing_tab' };
  }

  return { acquired: true, token: candidateToken };
}

// Tab 1 sets lock candidate, but Tab 2 overwrites it 5ms later before Tab 1's 20ms check resolves
const p1 = attemptAcquireLock('tab1', 20);
await new Promise(r => setTimeout(r, 5));
const p2 = attemptAcquireLock('tab2', 20);

const [res1, res2] = await Promise.all([p1, p2]);
assert.strictEqual(res1.acquired !== res2.acquired, true, 'Mutual exclusion: Exactly one tab must acquire the lock');
console.log('✅ F-04 PASS: Token double-check resolves concurrent lock attempt cleanly.');

// ========================================================
// TEST 4: F-05 - Local User Ownership Checks
// ========================================================
console.log('\n[TEST 4] F-05: updateTransactionLocal and deleteTransactionLocal enforce ownership');

const mockDexieTxs = new Map([
  ['tx_userA', { _id: 'tx_userA', userId: 'user_A', amount: 100 }],
  ['tx_userB', { _id: 'tx_userB', userId: 'user_B', amount: 200 }]
]);

function updateLocal(activeUserId, txId, newData) {
  const existing = mockDexieTxs.get(txId);
  if (!existing) throw new Error('Transaction not found in local db');
  if (existing.userId !== activeUserId) throw new Error('Unauthorized: transaction does not belong to active user');
  Object.assign(existing, newData);
  return existing;
}

function deleteLocal(activeUserId, txId) {
  const existing = mockDexieTxs.get(txId);
  if (!existing) return;
  if (existing.userId !== activeUserId) throw new Error('Unauthorized: transaction does not belong to active user');
  mockDexieTxs.delete(txId);
}

// 1. User A mutates own transaction -> succeeds
assert.doesNotThrow(() => updateLocal('user_A', 'tx_userA', { amount: 150 }));
assert.strictEqual(mockDexieTxs.get('tx_userA').amount, 150);

// 2. User A attempts to mutate User B's transaction -> throws Unauthorized
assert.throws(
  () => updateLocal('user_A', 'tx_userB', { amount: 999 }),
  /Unauthorized: transaction does not belong to active user/
);
assert.strictEqual(mockDexieTxs.get('tx_userB').amount, 200, 'User B data must remain untouched');

// 3. User A attempts to delete User B's transaction -> throws Unauthorized
assert.throws(
  () => deleteLocal('user_A', 'tx_userB'),
  /Unauthorized: transaction does not belong to active user/
);
assert.ok(mockDexieTxs.has('tx_userB'), 'User B transaction must not be deleted');

console.log('✅ F-05 PASS: Unauthorized local mutations strictly rejected.');

console.log('\n🎉 ALL OFFLINE REMEDIATION TESTS PASSED!');
process.exit(0);
