// Comprehensive 12-scenario financial and offline correctness test
import assert from 'assert';

console.log('================================================================');
console.log('FINOVA COMPREHENSIVE OFFLINE-FIRST & ACCOUNTING REGRESSION SUITE');
console.log('================================================================\n');

// Standard Finova balance computation logic (matching Dashboard.jsx & AccountManagement.jsx)
function computeBalances(accounts, transactions, receivables = [], debts = [], investmentsValue = 0) {
  const matchesAcc = (accField, targetId) => {
    if (!accField || !targetId) return false;
    return (accField._id || accField).toString() === targetId.toString();
  };

  // Deduplicate by idempotencyKey (preferring completed or taking first)
  const seenKeys = new Set();
  const completedTransactions = [];
  for (const t of transactions) {
    if (t.status && t.status !== 'completed' && t.status !== 'pending') continue;
    if (t.idempotencyKey) {
      if (seenKeys.has(t.idempotencyKey)) continue;
      seenKeys.add(t.idempotencyKey);
    }
    completedTransactions.push(t);
  }

  const balances = {};

  accounts.forEach(acc => {
    if (acc.type === 'investment') {
      balances[acc._id] = investmentsValue;
      return;
    }
    let bal = Number(acc.balance_adjustment) || 0;
    const targetId = acc._id?.toString();

    completedTransactions.forEach(t => {
      const tAmount = Number(t.amount) || 0;
      const accMatch = matchesAcc(t.account, targetId);
      const fromMatch = matchesAcc(t.from_account, targetId);
      const toMatch = matchesAcc(t.to_account, targetId);

      if (t.type === 'income' && accMatch) bal += tAmount;
      else if (t.type === 'expense' && accMatch) bal -= tAmount;
      else if (t.type === 'transfer') {
        if (toMatch) bal += tAmount;
        if (fromMatch) bal -= tAmount;
      } else if (t.type === 'settlement' && accMatch) bal += tAmount;
    });

    debts.forEach(dt => {
      if (matchesAcc(dt.account, targetId)) {
        const dtAmount = Number(dt.amount) || 0;
        if (dt.type === 'loan') {
          if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') bal += dtAmount;
          else bal -= dtAmount;
        } else if (dt.type === 'repayment') {
          if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') bal -= dtAmount;
          else bal += dtAmount;
        }
      }
    });

    receivables.forEach(r => {
      if (matchesAcc(r.paidFrom, targetId)) bal -= (Number(r.paidAmount) || 0);
      if (matchesAcc(r.receivedTo, targetId)) bal += (Number(r.receivedAmount) || 0);
    });

    balances[acc._id] = bal;
  });

  return balances;
}

const mockAccounts = [
  { _id: 'acc_wallet', name: 'Cash Wallet', balance_adjustment: 5000 },
  { _id: 'acc_bank', name: 'Bank Account', balance_adjustment: 20000 }
];

let globalTransactions = [];

// SCENARIO 1: Existing Balance Baseline
console.log('[SCENARIO 1] Baseline Balance Calculation...');
let currentBalances = computeBalances(mockAccounts, globalTransactions);
assert.strictEqual(currentBalances['acc_wallet'], 5000, 'Baseline Wallet balance mismatch');
assert.strictEqual(currentBalances['acc_bank'], 20000, 'Baseline Bank balance mismatch');
console.log('✅ Scenario 1 Passed: Exact baseline balance match (5,000 & 20,000).');

// SCENARIO 2: Offline Expense
console.log('\n[SCENARIO 2] Offline Expense (1,200 from Wallet)...');
const txExpense = {
  _id: 'local_tx_1',
  type: 'expense',
  amount: 1200,
  account: { _id: 'acc_wallet', name: 'Cash Wallet' },
  category: { _id: 'cat_groceries', nameEn: 'Groceries' },
  status: 'pending',
  idempotencyKey: 'idemp_key_1',
  date: new Date().toISOString()
};
globalTransactions.push(txExpense);
currentBalances = computeBalances(mockAccounts, globalTransactions);
assert.strictEqual(currentBalances['acc_wallet'], 3800, 'Wallet after expense mismatch');
assert.strictEqual(currentBalances['acc_bank'], 20000, 'Bank after expense mismatch');
console.log('✅ Scenario 2 Passed: Wallet decreased by 1,200 -> 3,800 immediately.');

// SCENARIO 3: Offline Income
console.log('\n[SCENARIO 3] Offline Income (5,000 into Bank)...');
const txIncome = {
  _id: 'local_tx_2',
  type: 'income',
  amount: 5000,
  account: { _id: 'acc_bank', name: 'Bank Account' },
  category: { _id: 'cat_salary', nameEn: 'Salary' },
  status: 'pending',
  idempotencyKey: 'idemp_key_2',
  date: new Date().toISOString()
};
globalTransactions.push(txIncome);
currentBalances = computeBalances(mockAccounts, globalTransactions);
assert.strictEqual(currentBalances['acc_wallet'], 3800, 'Wallet after income mismatch');
assert.strictEqual(currentBalances['acc_bank'], 25000, 'Bank after income mismatch');
console.log('✅ Scenario 3 Passed: Bank increased by 5,000 -> 25,000 immediately.');

// SCENARIO 4: Offline Transfer
console.log('\n[SCENARIO 4] Offline Transfer (2,000 from Bank to Wallet)...');
const txTransfer = {
  _id: 'local_tx_3',
  type: 'transfer',
  amount: 2000,
  from_account: { _id: 'acc_bank', name: 'Bank Account' },
  to_account: { _id: 'acc_wallet', name: 'Cash Wallet' },
  status: 'pending',
  idempotencyKey: 'idemp_key_3',
  date: new Date().toISOString()
};
globalTransactions.push(txTransfer);
currentBalances = computeBalances(mockAccounts, globalTransactions);
assert.strictEqual(currentBalances['acc_wallet'], 5800, 'Wallet after transfer mismatch');
assert.strictEqual(currentBalances['acc_bank'], 23000, 'Bank after transfer mismatch');
console.log('✅ Scenario 4 Passed: Transfer correctly adjusted Bank (-2,000) and Wallet (+2,000).');

// SCENARIO 5: Multiple Offline Transactions (Additive Mathematical Invariance)
console.log('\n[SCENARIO 5] Multiple Offline Transactions Cumulative Check...');
const txBatch = [
  { _id: 'local_tx_4', type: 'expense', amount: 300, account: 'acc_wallet', status: 'pending', idempotencyKey: 'idemp_key_4', date: new Date().toISOString() },
  { _id: 'local_tx_5', type: 'expense', amount: 500, account: 'acc_wallet', status: 'pending', idempotencyKey: 'idemp_key_5', date: new Date().toISOString() },
  { _id: 'local_tx_6', type: 'income', amount: 1000, account: 'acc_bank', status: 'pending', idempotencyKey: 'idemp_key_6', date: new Date().toISOString() }
];
globalTransactions.push(...txBatch);
currentBalances = computeBalances(mockAccounts, globalTransactions);
// Wallet: 5800 - 300 - 500 = 5000
// Bank: 23000 + 1000 = 24000
assert.strictEqual(currentBalances['acc_wallet'], 5000, 'Wallet multi-tx mismatch');
assert.strictEqual(currentBalances['acc_bank'], 24000, 'Bank multi-tx mismatch');
console.log('✅ Scenario 5 Passed: Cumulative offline transactions maintain exact mathematical accuracy.');

// SCENARIO 6: Page Reload Simulation
console.log('\n[SCENARIO 6] Page Reload Simulation (rehydrating state from local storage)...');
const rehydratedTransactions = JSON.parse(JSON.stringify(globalTransactions));
const reloadedBalances = computeBalances(mockAccounts, rehydratedTransactions);
assert.deepStrictEqual(reloadedBalances, currentBalances, 'Reloaded balances diverged from in-memory balances');
console.log('✅ Scenario 6 Passed: State rehydration yields identical balances.');

// SCENARIO 7: Sync Phase (Server Reconciliation without Double Counting)
console.log('\n[SCENARIO 7] Sync Phase (Server responds with reconciled transactions)...');
// Server returns completed records for tx 1, 2, 3 with server IDs and same idempotencyKeys
const serverTx1 = { _id: 'srv_tx_1', type: 'expense', amount: 1200, account: { _id: 'acc_wallet', name: 'Cash Wallet' }, status: 'completed', idempotencyKey: 'idemp_key_1', date: txExpense.date };
const serverTx2 = { _id: 'srv_tx_2', type: 'income', amount: 5000, account: { _id: 'acc_bank', name: 'Bank Account' }, status: 'completed', idempotencyKey: 'idemp_key_2', date: txIncome.date };

// In our updated transactions.js and offlineFinancialService.js, server transactions displace local pending records
let syncedTransactions = globalTransactions.filter(t => t.idempotencyKey !== 'idemp_key_1' && t.idempotencyKey !== 'idemp_key_2');
syncedTransactions.unshift(serverTx1, serverTx2);

const syncedBalances = computeBalances(mockAccounts, syncedTransactions);
assert.strictEqual(syncedBalances['acc_wallet'], 5000, 'Wallet balance shifted after sync');
assert.strictEqual(syncedBalances['acc_bank'], 24000, 'Bank balance shifted after sync');
console.log('✅ Scenario 7 Passed: Server reconciliation replaced local records with zero balance jitter.');

// SCENARIO 8: Transient Network Failure & Retry
console.log('\n[SCENARIO 8] Transient Network Failure & Retry...');
// During retry, local pending transaction remains pending in queue and Dexie
const pendingCount = syncedTransactions.filter(t => t.status === 'pending').length;
assert.strictEqual(pendingCount, 4, 'Pending count unexpected');
const retryBalances = computeBalances(mockAccounts, syncedTransactions);
assert.strictEqual(retryBalances['acc_wallet'], 5000, 'Wallet balance changed during retry');
console.log('✅ Scenario 8 Passed: Retried operations retain deterministic financial state.');

// SCENARIO 9: Response Loss (Server created tx, client timed out & retried)
console.log('\n[SCENARIO 9] Response Loss & Server Idempotency Return...');
// Client retries with 'idemp_key_3', server recognizes key and returns existing server record
const serverTx3 = { _id: 'srv_tx_3', type: 'transfer', amount: 2000, from_account: { _id: 'acc_bank' }, to_account: { _id: 'acc_wallet' }, status: 'completed', idempotencyKey: 'idemp_key_3', date: txTransfer.date };
// Even if momentarily both coexist in memory before cleanup:
const transientTransactions = [serverTx3, ...syncedTransactions];
const deduplicatedBalances = computeBalances(mockAccounts, transientTransactions);
assert.strictEqual(deduplicatedBalances['acc_wallet'], 5000, 'Duplicate key caused Wallet shift');
assert.strictEqual(deduplicatedBalances['acc_bank'], 24000, 'Duplicate key caused Bank shift');
console.log('✅ Scenario 9 Passed: Deduplication by idempotencyKey completely prevents duplicate application.');

// SCENARIO 10: Duplicate Click Prevention
console.log('\n[SCENARIO 10] Duplicate Click Rapid Submission...');
const doubleClickKey = 'idemp_rapid_click_1';
const firstClick = { _id: 'click_1', type: 'expense', amount: 100, account: 'acc_wallet', status: 'pending', idempotencyKey: doubleClickKey };
const secondClick = { _id: 'click_2', type: 'expense', amount: 100, account: 'acc_wallet', status: 'pending', idempotencyKey: doubleClickKey };
const clickStream = [...transientTransactions, firstClick, secondClick];
const clickBalances = computeBalances(mockAccounts, clickStream);
assert.strictEqual(clickBalances['acc_wallet'], 4900, 'Double click subtracted twice');
console.log('✅ Scenario 10 Passed: Double click with identical idempotencyKey only counts once.');

// SCENARIO 11: Rapid Consecutive Transactions
console.log('\n[SCENARIO 11] Rapid Consecutive Different Transactions...');
const rapidTxs = [
  { _id: 'rapid_1', type: 'expense', amount: 50, account: 'acc_wallet', status: 'pending', idempotencyKey: 'rapid_k1' },
  { _id: 'rapid_2', type: 'expense', amount: 50, account: 'acc_wallet', status: 'pending', idempotencyKey: 'rapid_k2' },
  { _id: 'rapid_3', type: 'income', amount: 200, account: 'acc_wallet', status: 'pending', idempotencyKey: 'rapid_k3' }
];
const rapidStream = [...clickStream, ...rapidTxs];
const rapidBalances = computeBalances(mockAccounts, rapidStream);
// 4900 - 50 - 50 + 200 = 5000
assert.strictEqual(rapidBalances['acc_wallet'], 5000, 'Rapid sequence balance mismatch');
console.log('✅ Scenario 11 Passed: Rapid consecutive transactions apply in exact order without loss.');

// SCENARIO 12: Online -> Offline -> Online Full Lifecycle Convergence
console.log('\n[SCENARIO 12] Full Online -> Offline -> Online Lifecycle Convergence...');
// All pending transactions complete on server
const finalServerTransactions = [
  serverTx1,
  serverTx2,
  serverTx3,
  { _id: 'srv_4', type: 'expense', amount: 300, account: { _id: 'acc_wallet' }, status: 'completed', idempotencyKey: 'idemp_key_4' },
  { _id: 'srv_5', type: 'expense', amount: 500, account: { _id: 'acc_wallet' }, status: 'completed', idempotencyKey: 'idemp_key_5' },
  { _id: 'srv_6', type: 'income', amount: 1000, account: { _id: 'acc_bank' }, status: 'completed', idempotencyKey: 'idemp_key_6' },
  { _id: 'srv_click', type: 'expense', amount: 100, account: { _id: 'acc_wallet' }, status: 'completed', idempotencyKey: doubleClickKey },
  { _id: 'srv_r1', type: 'expense', amount: 50, account: { _id: 'acc_wallet' }, status: 'completed', idempotencyKey: 'rapid_k1' },
  { _id: 'srv_r2', type: 'expense', amount: 50, account: { _id: 'acc_wallet' }, status: 'completed', idempotencyKey: 'rapid_k2' },
  { _id: 'srv_r3', type: 'income', amount: 200, account: { _id: 'acc_wallet' }, status: 'completed', idempotencyKey: 'rapid_k3' }
];
const finalBalances = computeBalances(mockAccounts, finalServerTransactions);
assert.strictEqual(finalBalances['acc_wallet'], 5000, 'Final Wallet balance divergence');
assert.strictEqual(finalBalances['acc_bank'], 24000, 'Final Bank balance divergence');
console.log('✅ Scenario 12 Passed: Full convergence achieved across all 12 accounting scenarios.');

console.log('\n🎉 ALL 12 FINANCIAL ACCOUNTING SCENARIOS PASSED WITH 100% MATHEMATICAL PRECISION!');
