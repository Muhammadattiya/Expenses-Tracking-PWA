import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import assert from 'assert';

console.log('=== RUNNING COMPREHENSIVE DEXIE MIGRATION & DATA INTEGRITY SUITE ===\n');

function createV7Schema(db) {
  db.version(1).stores({
    transactions: '_id, date, type, account, from_account, to_account',
    accounts: '_id, name, type',
    categories: '_id, name, type',
    dashboardSummary: 'id',
    syncQueue: '++id, method, url, data, timestamp'
  });
  db.version(2).stores({
    transactions: '_id, date, type, account, from_account, to_account, status',
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
  db.version(6).stores({
    debts: '_id, user, personName, type, status',
    debtTransactions: '_id, debtId, user, account, type'
  });
  db.version(7).stores({
    syncQueue: '++id, userId, method, url, data, timestamp'
  });
  return db;
}

function createCorrectedV8Schema(db) {
  createV7Schema(db);
  db.version(8).stores({
    transactions: '_id, userId, date, type, account, from_account, to_account, status, operationId, idempotencyKey, [userId+status], [userId+date]',
    accounts: '_id, userId, name, type',
    categories: '_id, userId, name, type',
    syncQueue: '++id, operationId, userId, localId, idempotencyKey, type, status, createdAt',
    syncMetadata: 'key, userId'
  }).upgrade(async tx => {
    // Clear legacy v7 syncQueue records per explicitly accepted F-01 product decision
    await tx.syncQueue.clear();
  });
  return db;
}

// ----------------------------------------------------
// TEST 1: Fresh Database initializes at v8 successfully
// ----------------------------------------------------
async function test1_freshDatabase() {
  console.log('[TEST 1] Fresh Database initializes directly to v8...');
  const db = new Dexie('TestDB_Fresh');
  createCorrectedV8Schema(db);
  await db.open();
  assert.strictEqual(db.verno, 8, 'Fresh DB must be verno 8');
  assert.strictEqual(db.syncQueue.schema.primKey.name, 'id', 'Primary key must be id');
  assert.strictEqual(db.syncQueue.schema.primKey.auto, true, 'Primary key must be auto-increment');
  db.close();
  console.log('✅ TEST 1 PASSED: Fresh database opens at v8 with ++id primary key.\n');
}

// ----------------------------------------------------
// TEST 2 to 7: v7 database with financial records -> v8
// ----------------------------------------------------
async function test2_v7WithFinancialRecords() {
  console.log('[TEST 2-7] v7 database with transactions, accounts, categories, debts, pending syncQueue -> v8...');
  const dbName = 'TestDB_V7_To_V8';
  
  // 1. Populate v7
  const dbV7 = new Dexie(dbName);
  createV7Schema(dbV7);
  await dbV7.open();
  assert.strictEqual(dbV7.verno, 7);

  await dbV7.transactions.add({ _id: 'tx_101', userId: 'user_1', amount: 1200, type: 'income', account: 'acc_1', date: '2026-09-11' });
  await dbV7.accounts.add({ _id: 'acc_1', userId: 'user_1', name: 'Main Vault', type: 'cash' });
  await dbV7.categories.add({ _id: 'cat_1', userId: 'user_1', name: 'Investments', type: 'income' });
  await dbV7.debts.add({ _id: 'debt_1', user: 'user_1', personName: 'Sarah', type: 'owed_to_me', status: 'pending' });
  await dbV7.debtTransactions.add({ _id: 'dtx_1', debtId: 'debt_1', user: 'user_1', account: 'acc_1', type: 'lent' });
  await dbV7.syncQueue.add({ userId: 'user_1', method: 'POST', url: '/transactions', data: { amount: 1200 }, timestamp: Date.now() });

  dbV7.close();

  // 2. Upgrade to corrected v8
  const dbV8 = new Dexie(dbName);
  createCorrectedV8Schema(dbV8);
  await dbV8.open();

  assert.strictEqual(dbV8.verno, 8, 'Database must be upgraded to v8');

  // Verify financial records are 100% intact
  const tx = await dbV8.transactions.get('tx_101');
  assert.ok(tx, 'Transaction tx_101 must exist');
  assert.strictEqual(tx.amount, 1200);

  const acc = await dbV8.accounts.get('acc_1');
  assert.ok(acc, 'Account acc_1 must exist');
  assert.strictEqual(acc.name, 'Main Vault');

  const cat = await dbV8.categories.get('cat_1');
  assert.ok(cat, 'Category cat_1 must exist');
  assert.strictEqual(cat.name, 'Investments');

  const debt = await dbV8.debts.get('debt_1');
  assert.ok(debt, 'Debt debt_1 must exist');
  assert.strictEqual(debt.personName, 'Sarah');

  const dtx = await dbV8.debtTransactions.get('dtx_1');
  assert.ok(dtx, 'Debt transaction dtx_1 must exist');

  // Verify syncQueue was cleared per accepted F-01 policy
  const queueItems = await dbV8.syncQueue.toArray();
  assert.strictEqual(queueItems.length, 0, 'Legacy v7 syncQueue items cleared per F-01');

  dbV8.close();
  console.log('✅ TEST 2-7 PASSED: All financial records 100% intact after upgrade to v8.\n');
}

// ----------------------------------------------------
// TEST 8: Migration with empty queue
// ----------------------------------------------------
async function test8_emptyQueueMigration() {
  console.log('[TEST 8] v7 with empty queue -> v8 upgrade...');
  const dbName = 'TestDB_EmptyQueue';
  const dbV7 = new Dexie(dbName);
  createV7Schema(dbV7);
  await dbV7.open();
  await dbV7.accounts.add({ _id: 'acc_empty', name: 'Empty Acc', type: 'bank' });
  dbV7.close();

  const dbV8 = new Dexie(dbName);
  createCorrectedV8Schema(dbV8);
  await dbV8.open();
  assert.strictEqual(dbV8.verno, 8);
  const acc = await dbV8.accounts.get('acc_empty');
  assert.ok(acc);
  dbV8.close();
  console.log('✅ TEST 8 PASSED: Migration with empty queue succeeds.\n');
}

// ----------------------------------------------------
// TEST 9: Migration without changing primary keys
// ----------------------------------------------------
async function test9_primaryKeyIntegrity() {
  console.log('[TEST 9] Verify primary key stability across all object stores...');
  const db = new Dexie('TestDB_PK_Check');
  createCorrectedV8Schema(db);
  await db.open();

  assert.strictEqual(db.transactions.schema.primKey.name, '_id');
  assert.strictEqual(db.accounts.schema.primKey.name, '_id');
  assert.strictEqual(db.categories.schema.primKey.name, '_id');
  assert.strictEqual(db.debts.schema.primKey.name, '_id');
  assert.strictEqual(db.debtTransactions.schema.primKey.name, '_id');
  assert.strictEqual(db.syncQueue.schema.primKey.name, 'id');
  assert.strictEqual(db.syncQueue.schema.primKey.auto, true);
  assert.strictEqual(db.syncMetadata.schema.primKey.name, 'key');

  db.close();
  console.log('✅ TEST 9 PASSED: All primary keys match existing schemas.\n');
}

// ----------------------------------------------------
// TEST 10 & 11: Reopening after migration & normal reads
// ----------------------------------------------------
async function test10_11_reopeningAndNormalReads() {
  console.log('[TEST 10 & 11] Reopening migrated database and normal reads/writes...');
  const dbName = 'TestDB_V7_To_V8'; // Reopen from Test 2
  const dbReopened = new Dexie(dbName);
  createCorrectedV8Schema(dbReopened);
  await dbReopened.open();

  assert.strictEqual(dbReopened.verno, 8);
  const txs = await dbReopened.transactions.toArray();
  assert.strictEqual(txs.length, 1);
  assert.strictEqual(txs[0]._id, 'tx_101');

  // Insert a new transaction
  await dbReopened.transactions.add({ _id: 'tx_new', userId: 'user_1', amount: 250, type: 'expense', account: 'acc_1', date: '2026-09-12' });
  const countAfter = await dbReopened.transactions.count();
  assert.strictEqual(countAfter, 2);

  // Insert a new queue item
  const qId = await dbReopened.syncQueue.add({
    operationId: 'op_test_new',
    userId: 'user_1',
    type: 'CREATE_TRANSACTION',
    status: 'pending',
    createdAt: Date.now()
  });
  assert.ok(typeof qId === 'number', 'Queue item generated numeric primary key');

  const foundQ = await dbReopened.syncQueue.where('operationId').equals('op_test_new').first();
  assert.ok(foundQ);
  assert.strictEqual(foundQ.id, qId);

  dbReopened.close();
  console.log('✅ TEST 10 & 11 PASSED: Reopened database performs normal reads and writes cleanly.\n');
}

async function runAll() {
  await test1_freshDatabase();
  await test2_v7WithFinancialRecords();
  await test8_emptyQueueMigration();
  await test9_primaryKeyIntegrity();
  await test10_11_reopeningAndNormalReads();
  console.log('🎉 ALL 11 MIGRATION & DATA INTEGRITY TESTS PASSED FLAWLESSLY!');
}

runAll().catch(err => {
  console.error('❌ MIGRATION TEST FAILED:', err);
  process.exit(1);
});
