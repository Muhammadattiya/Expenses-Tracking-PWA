// offline balance calculation verification
import assert from 'assert';

// Mock Data
const accounts = [
  { _id: 'accA', name: 'Account A', balance_adjustment: 10000 },
  { _id: 'accB', name: 'Account B', balance_adjustment: 2000 }
];

// We simulate a Dashboard state computation
function computeBalances(accounts, transactions) {
  const balances = {};
  
  // Initialize balances with base adjustment
  accounts.forEach(acc => {
    balances[acc._id] = acc.balance_adjustment || 0;
  });

  // Calculate based on all pending and completed transactions
  const validTransactions = transactions.filter(t => !t.status || t.status === 'completed' || t.status === 'pending');

  validTransactions.forEach(t => {
    const amount = Number(t.amount) || 0;
    
    if (t.type === 'income') {
      const accId = t.account?._id || t.account;
      if (accId && balances[accId] !== undefined) balances[accId] += amount;
    } 
    else if (t.type === 'expense') {
      const accId = t.account?._id || t.account;
      if (accId && balances[accId] !== undefined) balances[accId] -= amount;
    } 
    else if (t.type === 'transfer') {
      const fromId = t.from_account?._id || t.from_account;
      const toId = t.to_account?._id || t.to_account;
      if (fromId && balances[fromId] !== undefined) balances[fromId] -= amount;
      if (toId && balances[toId] !== undefined) balances[toId] += amount;
    }
    // settlements logic simplified here
  });

  return balances;
}

try {
  console.log('--- Offline Balance Verification Test ---');
  
  // 1. Initial State
  const initialBalances = computeBalances(accounts, []);
  console.log('Initial Balances:', initialBalances);
  assert.strictEqual(initialBalances['accA'], 10000, 'Initial A mismatch');
  assert.strictEqual(initialBalances['accB'], 2000, 'Initial B mismatch');

  // 2. Offline Phase: Create Pending Transactions
  let transactions = [
    { _id: 'local_1', type: 'expense', amount: 500, account: 'accA', status: 'pending' },
    { _id: 'local_2', type: 'transfer', amount: 300, from_account: 'accA', to_account: 'accB', status: 'pending' },
    { _id: 'local_3', type: 'income', amount: 1000, account: 'accA', status: 'pending' }
  ];

  const offlineBalances = computeBalances(accounts, transactions);
  console.log('Offline Balances (Pending):', offlineBalances);
  assert.strictEqual(offlineBalances['accA'], 10200, 'Offline A mismatch');
  assert.strictEqual(offlineBalances['accB'], 2300, 'Offline B mismatch');

  // 3. Sync Simulation Phase 1: One transaction syncs, replaced with server ID
  // Simulate UI update during sync: replace local_1 with server_1 (status completed)
  transactions = transactions.filter(t => t._id !== 'local_1');
  transactions.push({ _id: 'server_1', type: 'expense', amount: 500, account: 'accA', status: 'completed' });
  
  const syncPhase1Balances = computeBalances(accounts, transactions);
  console.log('Sync Phase 1 Balances:', syncPhase1Balances);
  // Balances should not double adjust
  assert.strictEqual(syncPhase1Balances['accA'], 10200, 'Sync Phase 1 A mismatch');
  assert.strictEqual(syncPhase1Balances['accB'], 2300, 'Sync Phase 1 B mismatch');

  // 4. Fully Synced Phase
  transactions = [
    { _id: 'server_1', type: 'expense', amount: 500, account: 'accA', status: 'completed' },
    { _id: 'server_2', type: 'transfer', amount: 300, from_account: 'accA', to_account: 'accB', status: 'completed' },
    { _id: 'server_3', type: 'income', amount: 1000, account: 'accA', status: 'completed' }
  ];

  const fullySyncedBalances = computeBalances(accounts, transactions);
  console.log('Fully Synced Balances:', fullySyncedBalances);
  assert.strictEqual(fullySyncedBalances['accA'], 10200, 'Fully Synced A mismatch');
  assert.strictEqual(fullySyncedBalances['accB'], 2300, 'Fully Synced B mismatch');

  console.log('✅ Offline Balance Verification Passed! Exact numerical convergence achieved.');
  process.exit(0);
} catch (error) {
  console.error('❌ Offline Balance Verification Failed:');
  console.error(error.message);
  process.exit(1);
}
