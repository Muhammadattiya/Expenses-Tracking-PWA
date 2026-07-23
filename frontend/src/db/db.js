import Dexie from 'dexie';

export const db = new Dexie('FinovaOfflineDB');

db.version(1).stores({
  transactions: '_id, date, type, account, from_account, to_account',
  accounts: '_id, name, type',
  categories: '_id, name, type',
  dashboardSummary: 'id', // just store the summary payload under id: 'main'
  syncQueue: '++id, method, url, data, timestamp' // queue for offline mutations
});

export async function clearOfflineData() {
  await db.transactions.clear();
  await db.accounts.clear();
  await db.categories.clear();
  await db.dashboardSummary.clear();
  await db.syncQueue.clear();
}
