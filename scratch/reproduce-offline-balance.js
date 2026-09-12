const { Dexie } = require('dexie');
const { indexedDB, IDBKeyRange } = require('fake-indexeddb');

// Initialize Dexie with fake-indexeddb
const db = new Dexie('TestFinovaDB', { indexedDB, IDBKeyRange });

db.version(8).stores({
  transactions: '_id, userId, date, type, account, from_account, to_account, status, operationId, idempotencyKey, [userId+status], [userId+date]',
  accounts: '_id, userId, name, type',
  categories: '_id, userId, name, type',
  syncQueue: '++id, operationId, userId, localId, idempotencyKey, type, status, createdAt',
  syncMetadata: 'key, userId'
});

async function runTest() {
  const userId = 'user_123';
  
  // Seed accounts
  const initialAccounts = [
    { _id: 'acc_cash', userId, name: 'Cash', type: 'cash', balance_adjustment: 5000, excludeFromTotal: false, isArchived: false },
    { _id: 'acc_bank', userId, name: 'Bank', type: 'bank', balance_adjustment: 10000, excludeFromTotal: false, isArchived: false }
  ];
  await db.accounts.bulkPut(initialAccounts);
  
  // Seed existing transactions
  const existingTransactions = [
    { _id: 'tx_1', userId, type: 'income', amount: 2000, account: { _id: 'acc_cash', name: 'Cash' }, date: new Date().toISOString(), status: 'completed' },
    { _id: 'tx_2', userId, type: 'expense', amount: 500, account: { _id: 'acc_cash', name: 'Cash' }, date: new Date().toISOString(), status: 'completed' }
  ];
  await db.transactions.bulkPut(existingTransactions);

  // Compute balance function as in Dashboard.jsx
  function computeDashboard(accounts, allTransactions, allReceivables = [], investmentsValue = 0, allDebtTransactions = []) {
    const completedTransactions = allTransactions.filter(t => !t.status || t.status === 'completed' || t.status === 'pending');
    
    const getAccountBalance = (account) => {
      if (account.type === 'investment') return investmentsValue;
      let bal = account.balance_adjustment || 0;
      completedTransactions.forEach(t => {
        if (t.type === 'income' && (t.account?._id || t.account) === account._id) bal += t.amount;
        else if (t.type === 'expense' && (t.account?._id || t.account) === account._id) bal -= t.amount;
        else if (t.type === 'transfer') {
          if ((t.to_account?._id || t.to_account) === account._id) bal += t.amount;
          if ((t.from_account?._id || t.from_account) === account._id) bal -= t.amount;
        } else if (t.type === 'settlement' && (t.account?._id || t.account) === account._id) bal += t.amount;
      });

      allDebtTransactions.forEach(dt => {
        if ((dt.account?._id || dt.account) === account._id) {
          if (dt.type === 'loan') {
            if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') bal += dt.amount;
            else bal -= dt.amount;
          } else if (dt.type === 'repayment') {
            if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') bal -= dt.amount;
            else bal += dt.amount;
          }
        }
      });

      allReceivables.forEach(r => {
        if ((r.paidFrom?._id || r.paidFrom) === account._id) bal -= r.paidAmount;
        if ((r.receivedTo?._id || r.receivedTo) === account._id) bal += r.receivedAmount;
        if (r.participants) {
          r.participants.forEach(p => {
            if (p.payments) {
              p.payments.forEach(pay => {
                if ((pay.account?._id || pay.account) === account._id) bal += pay.amount;
              });
            }
          });
        }
      });
      return bal;
    };

    const calculatedBalance = accounts
      .filter(acc => !acc.excludeFromTotal && !acc.isArchived)
      .reduce((sum, acc) => sum + getAccountBalance(acc), 0);

    const perAccount = {};
    accounts.forEach(acc => {
      perAccount[acc._id] = getAccountBalance(acc);
    });

    return { total: calculatedBalance, perAccount };
  }

  // Baseline
  let accountsFromDb = await db.accounts.where({ userId }).toArray();
  let txsFromDb = await db.transactions.where({ userId }).toArray();
  let baseline = computeDashboard(accountsFromDb, txsFromDb);
  console.log('Baseline Balance:', baseline);

  // Now simulate creating an offline transaction as AddTransaction does:
  // User selects account 'acc_cash' (string)
  const localTx = {
    _id: `local_${Date.now()}`,
    userId,
    type: 'expense',
    amount: 300,
    account: 'acc_cash',
    category: 'cat_food',
    date: new Date().toISOString(),
    status: 'pending',
    operationId: 'op_1',
    idempotencyKey: 'idemp_1'
  };
  await db.transactions.add(localTx);

  // Now simulate what Dashboard fetches when offline:
  // In Dashboard.jsx fetchData:
  // getTransactions() offline returns:
  txsFromDb = await db.transactions.where({ userId }).toArray();
  accountsFromDb = await db.accounts.where({ userId }).toArray();
  
  // BUT what if Dashboard also calls getReceivables() which returns [] instead of the server receivables?
  // What if online had receivables:
  const onlineReceivables = [
    { _id: 'rec_1', paidFrom: 'acc_cash', paidAmount: 1000, receivedTo: null, receivedAmount: 0 }
  ];
  
  const onlineWithReceivables = computeDashboard(accountsFromDb, [existingTransactions[0], existingTransactions[1]], onlineReceivables);
  console.log('Online with receivables (BEFORE offline):', onlineWithReceivables);
  
  // Now offline, getReceivables() catches and returns []!
  const offlineState = computeDashboard(accountsFromDb, txsFromDb, []); // receivables = []
  console.log('Offline state (AFTER offline transaction created):', offlineState);
}

runTest().catch(console.error);
