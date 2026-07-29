import Dexie from 'dexie';

export const db = new Dexie('FinovaOfflineDB');

db.version(1).stores({
  transactions: '_id, date, type, account, from_account, to_account',
  accounts: '_id, name, type',
  categories: '_id, name, type',
  dashboardSummary: 'id',
  syncQueue: '++id, method, url, data, timestamp'
});

db.version(2).stores({
  transactions: '_id, date, type, account, from_account, to_account, status',
}).upgrade(tx => {
  return tx.transactions.toCollection().modify(transaction => {
    transaction.status = transaction.status || 'completed';
  });
});

db.version(3).stores({
  bills: '_id, dueDate, status, repeat, isActive',
  recurringTransactions: '_id, nextExecutionDate, isActive'
});

db.version(4).stores({
  budgets: '_id, category, period, isActive'
});

db.version(5).stores({
  budgets: '_id, category, period, account, isActive, carryOver'
});

export async function clearOfflineData() {
  await db.transactions.clear();
  await db.accounts.clear();
  await db.categories.clear();
  await db.dashboardSummary.clear();
  await db.syncQueue.clear();
  await db.bills.clear();
  await db.recurringTransactions.clear();
  await db.budgets.clear();
}
