require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Investment = require('../models/Investment');
const Transaction = require('../models/Transaction');
const UserAnalytics = require('../models/UserAnalytics');
const UserAnalyticsMonthly = require('../models/UserAnalyticsMonthly');

const transactionService = require('../services/transactionService');
const analyticsService = require('../services/analyticsService');
const analyticsEngine = require('../services/analyticsEngine');

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failedCount++;
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passedCount++;
  }
}

const waitFor = async (predicateFn, timeoutMs = 5000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await predicateFn();
      if (res) return res;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 50));
  }
  return await predicateFn();
};

async function runSuite() {
  console.log('====================================================');
  console.log('🧪 FINOVA PRECOMPUTED ANALYTICS ARCHITECTURE TEST SUITE');
  console.log('====================================================\n');

  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI missing.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas.\n');

  const timestamp = Date.now();
  let testUserA = null;
  let testUserB = null;
  let catFood = null;
  let catSalary = null;
  let catGifts = null;
  let accCash = null;
  let accBank = null;
  let invUserB = null;
  let accUserB = null;
  let catUserB = null;

  try {
    // ─── SETUP ISOLATED TEST USERS & RESOURCES ─────────────────────────
    console.log('--- SETUP: Isolated Test Data ---');
    testUserA = await User.create({
      email: `test-analytics-a-${timestamp}@finova.internal`,
      name: 'Test Analytics User A',
      password: 'hashed-password-123'
    });
    testUserB = await User.create({
      email: `test-analytics-b-${timestamp}@finova.internal`,
      name: 'Test Analytics User B',
      password: 'hashed-password-123'
    });

    accCash = await Account.create({
      user: testUserA._id,
      name: 'Cash A',
      type: 'cash',
      color: '#10b981'
    });
    accBank = await Account.create({
      user: testUserA._id,
      name: 'Bank A',
      type: 'bank',
      color: '#3b82f6'
    });

    catFood = await Category.create({
      user: testUserA._id,
      name: 'Food & Dining',
      type: 'expense',
      icon: 'Utensils',
      color: '#f59e0b'
    });
    catSalary = await Category.create({
      user: testUserA._id,
      name: 'Salary',
      type: 'income',
      icon: 'Briefcase',
      color: '#10b981'
    });
    catGifts = await Category.create({
      user: testUserA._id,
      name: 'Gifts',
      type: 'expense',
      icon: 'Gift',
      color: '#ec4899'
    });

    invUserB = await Investment.create({
      user: testUserB._id,
      type: 'gold',
      name: 'Gold Ingot User B',
      quantity: 10,
      purchasePrice: 3000,
      currentPrice: 3200
    });

    accUserB = await Account.create({
      user: testUserB._id,
      name: 'Cash B',
      type: 'cash',
      color: '#10b981'
    });
    catUserB = await Category.create({
      user: testUserB._id,
      name: 'Other B',
      type: 'expense',
      icon: 'Tag',
      color: '#f59e0b'
    });

    assert(testUserA && testUserB, 'Isolated test users initialized.');

    // ─── TEST 1: SAFE INITIALIZATION (ZERO TRANSACTIONS) ───────────────
    console.log('\n--- TEST 1: Safe Initialization with Zero Transactions ---');
    const emptyAnalytics = await analyticsService.getAnalytics(testUserA._id);
    assert(emptyAnalytics.summary.income === 0, 'Initial income is 0');
    assert(emptyAnalytics.summary.expense === 0, 'Initial expense is 0');
    assert(emptyAnalytics.summary.balance === 0, 'Initial balance is 0');
    assert(Array.isArray(emptyAnalytics.monthly) && emptyAnalytics.monthly.length === 0, 'Initial monthly is empty array');
    assert(emptyAnalytics.transactions.length === 0, 'transactions array is empty (no OOM hazard)');

    // ─── TEST 2: FIRST TRANSACTION INCREMENT ───────────────────────────
    console.log('\n--- TEST 2: First Transaction Creates Analytics Materialized State ---');
    const tx1 = await transactionService.createTransaction(testUserA._id, {
      title: 'Lunch at Cafe',
      amount: 250,
      type: 'expense',
      category: catFood._id,
      account: accCash._id,
      date: new Date('2026-09-05T12:00:00Z')
    });

    // Wait 100ms for async fire-and-forget incremental update to commit
    await new Promise(r => setTimeout(r, 150));

    const analyticsAfterTx1 = await analyticsService.getAnalytics(testUserA._id);
    assert(analyticsAfterTx1.summary.expense === 250, `Summary expense incremented to 250 (got ${analyticsAfterTx1.summary.expense})`);
    assert(analyticsAfterTx1.summary.balance === -250, `Summary balance decremented to -250 (got ${analyticsAfterTx1.summary.balance})`);

    const mDoc1 = await UserAnalyticsMonthly.findOne({ user: testUserA._id, month: '2026-09' });
    assert(mDoc1 && mDoc1.summary.expense === 250, 'UserAnalyticsMonthly created with expense 250 for 2026-09');
    assert(mDoc1.categoryTotals.get(catFood._id.toString())?.amount === 250, 'Category total for Food is 250');

    // ─── TEST 3: INCOME & SETTLEMENT INCREMENTS ────────────────────────
    console.log('\n--- TEST 3: Income and Settlement Increments ---');
    const tx2 = await transactionService.createTransaction(testUserA._id, {
      title: 'Consulting Income',
      amount: 5000,
      type: 'income',
      category: catSalary._id,
      account: accBank._id,
      date: new Date('2026-09-08T10:00:00Z')
    });

    const tx3 = await transactionService.createTransaction(testUserA._id, {
      title: 'Debt Settlement Received',
      amount: 500,
      type: 'settlement',
      account: accCash._id,
      date: new Date('2026-09-10T15:00:00Z')
    });

    await new Promise(r => setTimeout(r, 150));

    const analyticsAfterIncome = await analyticsService.getAnalytics(testUserA._id);
    assert(analyticsAfterIncome.summary.income === 5000, `Income equals 5000 (got ${analyticsAfterIncome.summary.income})`);
    assert(analyticsAfterIncome.summary.settlements === 500, `Settlement equals 500 (got ${analyticsAfterIncome.summary.settlements})`);
    assert(analyticsAfterIncome.summary.expense === 250, `Expense remains 250`);
    // Balance: 5000 (income) - 250 (expense) + 500 (settlement) = 5250
    assert(analyticsAfterIncome.summary.balance === 5250, `Balance is exactly 5,250 (got ${analyticsAfterIncome.summary.balance})`);

    // ─── TEST 4: TRANSFERS BETWEEN ACCOUNTS ────────────────────────────
    console.log('\n--- TEST 4: Transfer Semantics (Does not alter net income/expense) ---');
    const txTransfer = await transactionService.createTransaction(testUserA._id, {
      title: 'Atm Withdrawal',
      amount: 1000,
      type: 'transfer',
      from_account: accBank._id,
      to_account: accCash._id,
      date: new Date('2026-09-12T14:00:00Z')
    });

    await new Promise(r => setTimeout(r, 150));

    const analyticsAfterTransfer = await analyticsService.getAnalytics(testUserA._id);
    assert(analyticsAfterTransfer.summary.income === 5000, 'Transfer did not alter income');
    assert(analyticsAfterTransfer.summary.expense === 250, 'Transfer did not alter expense');
    assert(analyticsAfterTransfer.summary.balance === 5250, 'Transfer did not alter net balance');

    // ─── TEST 5: UPDATE AMOUNT & CATEGORY ──────────────────────────────
    console.log('\n--- TEST 5: Transaction Update (Amount, Category, Account) ---');
    // Change tx1 from 250 (Food, Cash) to 400 (Gifts, Bank)
    const tx1Updated = await transactionService.updateTransaction(testUserA._id, tx1._id, {
      title: 'Gift for Birthday',
      amount: 400,
      type: 'expense',
      category: catGifts._id,
      account: accBank._id,
      date: new Date('2026-09-05T12:00:00Z')
    });

    await new Promise(r => setTimeout(r, 200));

    const analyticsAfterUpdate = await analyticsService.getAnalytics(testUserA._id);
    assert(analyticsAfterUpdate.summary.expense === 400, `Updated expense is 400 (was 250, got ${analyticsAfterUpdate.summary.expense})`);
    assert(analyticsAfterUpdate.summary.balance === (5000 - 400 + 500), `Updated balance equals 5,100 (got ${analyticsAfterUpdate.summary.balance})`);

    const mDocAfterUpdate = await UserAnalyticsMonthly.findOne({ user: testUserA._id, month: '2026-09' });
    assert(mDocAfterUpdate.categoryTotals.get(catGifts._id.toString())?.amount === 400, 'Category Gifts is now 400');
    // Old Food category entry should be 0 or pruned
    const oldFoodAmount = mDocAfterUpdate.categoryTotals.get(catFood._id.toString())?.amount || 0;
    assert(oldFoodAmount === 0, `Old Food category is 0 (got ${oldFoodAmount})`);

    // ─── TEST 6: CROSS-MONTH DATE UPDATE ───────────────────────────────
    console.log('\n--- TEST 6: Cross-Month Date Shift (August to September) ---');
    // Shift tx1Updated from 2026-09-05 to 2026-08-20
    await transactionService.updateTransaction(testUserA._id, tx1._id, {
      title: 'Gift for Birthday (Late Aug)',
      amount: 400,
      type: 'expense',
      category: catGifts._id,
      account: accBank._id,
      date: new Date('2026-08-20T12:00:00Z')
    });

    const mAug = await waitFor(async () => {
      const doc = await UserAnalyticsMonthly.findOne({ user: testUserA._id, month: '2026-08' });
      return doc?.summary?.expense === 400 ? doc : null;
    });
    const mSep = await waitFor(async () => {
      const doc = await UserAnalyticsMonthly.findOne({ user: testUserA._id, month: '2026-09' });
      return doc?.summary?.expense === 0 ? doc : null;
    });

    assert(mAug && mAug.summary.expense === 400, `August monthly expense is 400 (got ${mAug?.summary?.expense})`);
    assert(mSep && mSep.summary.expense === 0, `September monthly expense dropped to 0 (got ${mSep?.summary?.expense})`);

    // Lifetime balance must still remain 5,100
    const analyticsAfterMonthShift = await analyticsService.getAnalytics(testUserA._id);
    assert(analyticsAfterMonthShift.summary.balance === 5100, `Lifetime balance is still 5,100 across cross-month shift`);

    // ─── TEST 7: TRANSACTION DELETION ──────────────────────────────────
    console.log('\n--- TEST 7: Transaction Deletion (Subtracts contribution cleanly) ---');
    await transactionService.deleteTransaction(testUserA._id, tx1._id);

    const analyticsAfterDelete = await waitFor(async () => {
      const res = await analyticsService.getAnalytics(testUserA._id);
      return res.summary.expense === 0 ? res : null;
    });
    assert(analyticsAfterDelete.summary.expense === 0, `Total expense dropped back to 0 (got ${analyticsAfterDelete.summary.expense})`);
    assert(analyticsAfterDelete.summary.balance === 5500, `Balance is 5500 (5000 income + 500 settlement) (got ${analyticsAfterDelete.summary.balance})`);

    // ─── TEST 8: BULK IMPORT DELTAS ────────────────────────────────────
    console.log('\n--- TEST 8: Bulk Import (Efficient delta aggregation) ---');
    const importBatch = [
      { title: 'Supermarket', amount: 300, type: 'expense', date: '2026-09-01T10:00:00Z', category: 'Food & Dining', account: 'Cash A' },
      { title: 'Pharmacy', amount: 150, type: 'expense', date: '2026-09-02T10:00:00Z', category: 'Food & Dining', account: 'Cash A' },
      { title: 'Side Gig', amount: 2000, type: 'income', date: '2026-09-03T10:00:00Z', category: 'Salary', account: 'Bank A' },
      { title: 'Past Expense July', amount: 500, type: 'expense', date: '2026-07-15T10:00:00Z', category: 'Food & Dining', account: 'Cash A' }
    ];

    const importRes = await transactionService.importTransactions(testUserA._id, importBatch);
    assert(importRes.success && importRes.insertedTransactions === 4, 'Bulk import executed successfully.');

    const analyticsAfterImport = await waitFor(async () => {
      const res = await analyticsService.getAnalytics(testUserA._id);
      return res.summary.expense === 950 ? res : null;
    });
    // Income: 5000 + 2000 = 7000. Expense: 0 + 300 + 150 + 500 = 950. Settlement: 500. Balance: 7000 - 950 + 500 = 6550
    assert(analyticsAfterImport.summary.income === 7000, `Imported income is 7,000 (got ${analyticsAfterImport.summary.income})`);
    assert(analyticsAfterImport.summary.expense === 950, `Imported expense is 950 (got ${analyticsAfterImport.summary.expense})`);
    assert(analyticsAfterImport.summary.balance === 6550, `Imported balance is 6,550 (got ${analyticsAfterImport.summary.balance})`);

    // ─── TEST 9: RECONCILIATION EQUALITY (CANONICAL == PRECOMPUTED) ───
    console.log('\n--- TEST 9: Strict Mathematical Reconciliation (Canonical == Precomputed) ---');
    const canonical = await analyticsService.getCanonicalAnalytics(testUserA._id);
    const precomputed = await analyticsService.getAnalytics(testUserA._id);

    assert(canonical.summary.income === precomputed.summary.income, `Canonical income (${canonical.summary.income}) === Precomputed (${precomputed.summary.income})`);
    assert(canonical.summary.expense === precomputed.summary.expense, `Canonical expense (${canonical.summary.expense}) === Precomputed (${precomputed.summary.expense})`);
    assert(canonical.summary.settlements === precomputed.summary.settlements, `Canonical settlements (${canonical.summary.settlements}) === Precomputed (${precomputed.summary.settlements})`);
    assert(canonical.summary.balance === precomputed.summary.balance, `Canonical balance (${canonical.summary.balance}) === Precomputed (${precomputed.summary.balance})`);

    // Compare heatmap
    for (let d = 0; d < 7; d++) {
      assert(canonical.heatmap[d].amount === precomputed.heatmap[d].amount, `Heatmap day ${d} matches: ${canonical.heatmap[d].amount}`);
    }

    // ─── TEST 10: IDEMPOTENT REBUILD PRODUCES IDENTICAL STATE ──────────
    console.log('\n--- TEST 10: Rebuild Twice Produces Exact Identical State ---');
    const rebuild1 = (await analyticsEngine.rebuildUserAnalytics(testUserA._id)).toObject();
    const rebuild2 = (await analyticsEngine.rebuildUserAnalytics(testUserA._id)).toObject();

    assert(rebuild1.summary.income === rebuild2.summary.income, 'Rebuild 1 income === Rebuild 2 income');
    assert(rebuild1.summary.expense === rebuild2.summary.expense, 'Rebuild 1 expense === Rebuild 2 expense');
    assert(rebuild1.summary.balance === rebuild2.summary.balance, 'Rebuild 1 balance === Rebuild 2 balance');
    assert(JSON.stringify(rebuild1.heatmap) === JSON.stringify(rebuild2.heatmap), 'Heatmaps match identically');

    // ─── TEST 11: CONCURRENCY TEST (RACE CONDITIONS) ───────────────────
    console.log('\n--- TEST 11: Concurrent Mutation Safety ---');
    // Launch 10 concurrent transaction creates simultaneously
    const concurrentPromises = [];
    for (let i = 1; i <= 10; i++) {
      concurrentPromises.push(
        transactionService.createTransaction(testUserA._id, {
          title: `Concurrent Tx ${i}`,
          amount: 50,
          type: 'expense',
          category: catFood._id,
          account: accCash._id,
          date: new Date('2026-09-15T12:00:00Z')
        })
      );
    }
    await Promise.all(concurrentPromises);
    await new Promise(r => setTimeout(r, 400));

    const analyticsAfterConcurrent = await analyticsService.getAnalytics(testUserA._id);
    const canonicalAfterConcurrent = await analyticsService.getCanonicalAnalytics(testUserA._id);
    assert(analyticsAfterConcurrent.summary.expense === canonicalAfterConcurrent.summary.expense,
      `Concurrent expense matches canonical exactly: ${analyticsAfterConcurrent.summary.expense}`);

    // ─── TEST 12: TENANT ISOLATION (USER A CANNOT READ USER B) ─────────
    console.log('\n--- TEST 12: Multi-Tenant Isolation ---');
    // Create transaction for User B
    await transactionService.createTransaction(testUserB._id, {
      title: 'User B Expense',
      amount: 99999,
      type: 'expense',
      category: catUserB._id,
      account: accUserB._id,
      date: new Date('2026-09-15T12:00:00Z')
    });
    await new Promise(r => setTimeout(r, 150));

    const userAAnalytics = await analyticsService.getAnalytics(testUserA._id);
    const userBAnalytics = await analyticsService.getAnalytics(testUserB._id);

    assert(userAAnalytics.summary.expense !== userBAnalytics.summary.expense, 'User A analytics completely separate from User B');
    assert(userBAnalytics.summary.expense === 99999, 'User B has its own independent precomputed state (99,999)');

    // ─── TEST 13: IDEMPOTENCY SAFETY (NO DOUBLE COUNTING ON RETRY) ────
    console.log('\n--- TEST 13: Idempotency Retry Protection ---');
    const idemKey = `idem-${Date.now()}`;
    const txIdem1 = await transactionService.createTransaction(testUserA._id, {
      title: 'Idempotent Payment',
      amount: 350,
      type: 'expense',
      category: catFood._id,
      account: accCash._id,
      idempotencyKey: idemKey
    });

    await new Promise(r => setTimeout(r, 150));
    const expenseBeforeRetry = (await analyticsService.getAnalytics(testUserA._id)).summary.expense;

    // Simulate network timeout retry with same idempotencyKey
    const txIdem2 = await transactionService.createTransaction(testUserA._id, {
      title: 'Idempotent Payment',
      amount: 350,
      type: 'expense',
      category: catFood._id,
      account: accCash._id,
      idempotencyKey: idemKey
    });

    await new Promise(r => setTimeout(r, 150));
    const expenseAfterRetry = (await analyticsService.getAnalytics(testUserA._id)).summary.expense;

    assert(txIdem1._id.toString() === txIdem2._id.toString(), 'Idempotent request returned identical transaction ID');
    assert(expenseBeforeRetry === expenseAfterRetry, `Idempotency retry DID NOT double count analytics (remained ${expenseAfterRetry})`);

    // ─── TEST 14: INVESTMENT TRANSFER AUTHORIZATION SECURITY ───────────
    console.log('\n--- TEST 14: Investment Authorization Vulnerability Patch ---');
    // User A attempts to create a transfer referencing User B's investment
    let caughtUnauthorized = false;
    try {
      await transactionService.createTransaction(testUserA._id, {
        title: 'Malicious Transfer to User B Investment',
        amount: 500,
        type: 'transfer',
        from_account: accBank._id,
        investment: invUserB._id,
        date: new Date()
      });
    } catch (err) {
      caughtUnauthorized = true;
      console.log(`Intercepted unauthorized investment access: "${err.message}"`);
    }
    assert(caughtUnauthorized, 'Cross-user investment transfer correctly blocked with unauthorized error!');

    // ─── TEST 15: 10,000 TRANSACTION PERFORMANCE BENCHMARK ────────────
    console.log('\n--- TEST 15: 10,000 Transaction Benchmark (Old vs New) ---');
    // Generate synthetic user with 10,000 transactions
    const benchUser = await User.create({
      email: `benchmark-${timestamp}@finova.internal`,
      name: 'Benchmark User',
      password: 'hashed-password-123'
    });

    const benchAcc = await Account.create({
      user: benchUser._id,
      name: 'Bench Account',
      type: 'bank'
    });
    const benchCatInc = await Category.create({
      user: benchUser._id,
      name: 'Bench Income',
      type: 'income',
      icon: 'Briefcase'
    });
    const benchCatExp = await Category.create({
      user: benchUser._id,
      name: 'Bench Expense',
      type: 'expense',
      icon: 'Tag'
    });

    console.log('Generating 10,000 synthetic transactions in batches...');
    const bulkTxDocs = [];
    const baseDate = new Date('2025-01-01T00:00:00Z');

    for (let i = 0; i < 10000; i++) {
      const d = new Date(baseDate.getTime() + (i * 3600000 * 2)); // spaced every 2 hours
      const isInc = i % 10 === 0;
      bulkTxDocs.push({
        user: benchUser._id,
        title: `Tx #${i}`,
        amount: (i % 500) + 10,
        type: isInc ? 'income' : 'expense',
        account: benchAcc._id,
        category: isInc ? benchCatInc._id : benchCatExp._id,
        status: 'completed',
        date: d,
        createdAt: d,
        updatedAt: d
      });
    }

    // Insert 10k transactions in chunks of 2,000
    for (let c = 0; c < 10000; c += 2000) {
      await Transaction.insertMany(bulkTxDocs.slice(c, c + 2000));
    }
    console.log('10,000 transactions committed to MongoDB.');

    // Build the precomputed analytics state for benchmark user
    console.log('Materializing persistent analytics for benchmark user...');
    const buildStart = Date.now();
    await analyticsEngine.rebuildUserAnalytics(benchUser._id);
    console.log(`Persistent analytics materialized in ${Date.now() - buildStart}ms.`);

    // BENCHMARK 1: OLD Dynamic Canonical Aggregation (Scans all 10,000 documents)
    const memBeforeOld = process.memoryUsage().heapUsed;
    const t0Old = Date.now();
    const oldResult = await analyticsService.getCanonicalAnalytics(benchUser._id);
    const tOldElapsed = Date.now() - t0Old;
    const memAfterOld = process.memoryUsage().heapUsed;
    const oldHeapDiff = Math.max(0, memAfterOld - memBeforeOld) / (1024 * 1024);

    // BENCHMARK 2: NEW Precomputed Materialized Read (O(1) document read)
    const memBeforeNew = process.memoryUsage().heapUsed;
    const t0New = Date.now();
    const newResult = await analyticsService.getAnalytics(benchUser._id);
    const tNewElapsed = Date.now() - t0New;
    const memAfterNew = process.memoryUsage().heapUsed;
    const newHeapDiff = Math.max(0, memAfterNew - memBeforeNew) / (1024 * 1024);

    console.log('\n📊 BENCHMARK COMPARISON (10,000 TRANSACTIONS):');
    console.log(`  OLD Canonical Aggregation: ${tOldElapsed} ms | Heap delta: ~${oldHeapDiff.toFixed(2)} MB`);
    console.log(`  NEW Precomputed Read:       ${tNewElapsed} ms | Heap delta: ~${newHeapDiff.toFixed(2)} MB`);
    const speedup = (tOldElapsed / Math.max(1, tNewElapsed)).toFixed(1);
    console.log(`  ⚡ Speedup Factor: ${speedup}x faster!`);

    assert(oldResult.summary.income === newResult.summary.income, `10k benchmark income matches: ${newResult.summary.income}`);
    assert(oldResult.summary.expense === newResult.summary.expense, `10k benchmark expense matches: ${newResult.summary.expense}`);
    assert(oldResult.summary.balance === newResult.summary.balance, `10k benchmark balance matches: ${newResult.summary.balance}`);
    assert(newHeapDiff < 10, `New precomputed analytics heap delta is tightly bounded (< 10MB vs ${newHeapDiff.toFixed(2)}MB)`);
    assert(newResult.summary !== undefined && newResult.monthly !== undefined, 'New result structure is fully populated');

    // ─── TEST 16: SIMULTANEOUS MULTI-FIELD UPDATE (TYPE, AMOUNT, CAT, ACC, DATE) ──
    console.log('\n--- TEST 16: Complex Multi-Field Update & Direction Inversion ---');
    // Old: expense 100, Food, Cash, 2026-08
    const complexTx = await transactionService.createTransaction(testUserA._id, {
      title: 'Groceries August',
      amount: 100,
      type: 'expense',
      category: catFood._id,
      account: accCash._id,
      date: new Date('2026-08-15T12:00:00Z')
    });
    await new Promise(r => setTimeout(r, 150));

    // New: income 250, Salary, Bank, 2026-09 (Reverses expense to income, changes category, account, and month simultaneously!)
    await transactionService.updateTransaction(testUserA._id, complexTx._id, {
      title: 'Consulting Bonus September',
      amount: 250,
      type: 'income',
      category: catSalary._id,
      account: accBank._id,
      date: new Date('2026-09-10T12:00:00Z')
    });
    await new Promise(r => setTimeout(r, 200));

    const canonical16 = await analyticsService.getCanonicalAnalytics(testUserA._id);
    const precomputed16 = await analyticsService.getAnalytics(testUserA._id);

    assert(canonical16.summary.income === precomputed16.summary.income, `Multi-field income matches canonical (${precomputed16.summary.income})`);
    assert(canonical16.summary.expense === precomputed16.summary.expense, `Multi-field expense matches canonical (${precomputed16.summary.expense})`);
    assert(canonical16.summary.balance === precomputed16.summary.balance, `Multi-field balance matches canonical (${precomputed16.summary.balance})`);

    // ─── TEST 17: TIMEZONE & UTC BOUNDARY ALIGNMENT ─────────────────────
    console.log('\n--- TEST 17: Timezone, Midnight & Month/Year Boundary Alignment ---');
    // Transaction right before midnight UTC on month boundary (August 31, 23:59:59Z)
    const txAugEnd = await transactionService.createTransaction(testUserA._id, {
      title: 'Midnight Aug 31',
      amount: 75,
      type: 'expense',
      category: catFood._id,
      account: accCash._id,
      date: new Date('2026-08-31T23:59:59.000Z')
    });
    // Transaction right after midnight UTC on month boundary (Sept 1, 00:00:01Z)
    const txSepStart = await transactionService.createTransaction(testUserA._id, {
      title: 'Midnight Sep 01',
      amount: 125,
      type: 'expense',
      category: catFood._id,
      account: accCash._id,
      date: new Date('2026-09-01T00:00:01.000Z')
    });
    // Transaction at year boundary (Dec 31, 2025 23:59:59Z)
    const txYearEnd = await transactionService.createTransaction(testUserA._id, {
      title: 'New Years Eve 2025',
      amount: 1000,
      type: 'income',
      category: catSalary._id,
      account: accBank._id,
      date: new Date('2025-12-31T23:59:59.000Z')
    });
    await new Promise(r => setTimeout(r, 200));

    const mDocAug = await UserAnalyticsMonthly.findOne({ user: testUserA._id, month: '2026-08' });
    const mDocSep = await UserAnalyticsMonthly.findOne({ user: testUserA._id, month: '2026-09' });
    const mDocDec25 = await UserAnalyticsMonthly.findOne({ user: testUserA._id, month: '2025-12' });

    assert(mDocAug && mDocAug.summary.expense >= 75, 'August 31 23:59:59Z correctly grouped in 2026-08 (not 2026-09)');
    assert(mDocSep && mDocSep.summary.expense >= 125, 'September 01 00:00:01Z correctly grouped in 2026-09 (not 2026-08)');
    assert(mDocDec25 && mDocDec25.summary.income === 1000, 'December 31 2025 23:59:59Z correctly grouped in 2025-12');

    // ─── TEST 18: DECIMAL MONEY PRECISION & DRIFT FREEDOM ───────────────
    console.log('\n--- TEST 18: Decimal Money Precision (Zero Rounding Drift) ---');
    const decimalBatch = [
      { title: 'Item .99', amount: 19.99, type: 'expense', category: catFood._id, account: accCash._id },
      { title: 'Item .33', amount: 33.33, type: 'expense', category: catFood._id, account: accCash._id },
      { title: 'Item .07', amount: 0.07, type: 'expense', category: catFood._id, account: accCash._id },
      { title: 'Income .55', amount: 1250.55, type: 'income', category: catSalary._id, account: accBank._id },
      { title: 'Item .18', amount: 12.18, type: 'expense', category: catFood._id, account: accCash._id }
    ];
    for (const dItem of decimalBatch) {
      await transactionService.createTransaction(testUserA._id, dItem);
    }
    await new Promise(r => setTimeout(r, 250));

    const canonical18 = await analyticsService.getCanonicalAnalytics(testUserA._id);
    const precomputed18 = await analyticsService.getAnalytics(testUserA._id);

    assert(Number(canonical18.summary.balance.toFixed(2)) === Number(precomputed18.summary.balance.toFixed(2)),
      `Decimal balance exact match: ${precomputed18.summary.balance}`);
    assert(Number(canonical18.summary.income.toFixed(2)) === Number(precomputed18.summary.income.toFixed(2)),
      `Decimal income exact match: ${precomputed18.summary.income}`);
    assert(Number(canonical18.summary.expense.toFixed(2)) === Number(precomputed18.summary.expense.toFixed(2)),
      `Decimal expense exact match: ${precomputed18.summary.expense}`);

    // ─── TEST 19: AD-HOC FILTER PRESERVATION (SEARCH, CATEGORY, ACCOUNT) ─
    console.log('\n--- TEST 19: Filter Preservation (Search, Category, Account, Date Range) ---');
    // 19A: Filter by Category
    const catFilterRes = await analyticsService.getAnalytics(testUserA._id, { category: catSalary._id.toString() });
    assert(catFilterRes.summary.expense === 0, 'Category filter for Salary has 0 expenses');
    assert(catFilterRes.summary.income > 0, `Category filter for Salary returned income: ${catFilterRes.summary.income}`);

    // 19B: Filter by Account
    const accFilterRes = await analyticsService.getAnalytics(testUserA._id, { account: accCash._id.toString() });
    assert(accFilterRes.summary.expense > 0, `Account filter for Cash returned expense: ${accFilterRes.summary.expense}`);

    // 19C: Filter by Search Keyword
    const searchFilterRes = await analyticsService.getAnalytics(testUserA._id, { search: 'Pharmacy' });
    assert(searchFilterRes.summary.expense === 150, `Search filter found exact "Pharmacy" (150 EGP, got ${searchFilterRes.summary.expense})`);

    // 19D: Custom sub-month date range
    const subRangeRes = await analyticsService.getAnalytics(testUserA._id, {
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-02T23:59:59.999Z'
    });
    assert(subRangeRes.summary.expense === (300 + 150 + 125), `Sub-month date range correctly bounded: ${subRangeRes.summary.expense}`);

    // ─── TEST 20: OBSERVABILITY & SELF-HEALING FAILURE RECOVERY ─────────
    console.log('\n--- TEST 20: Observability & Automated Self-Healing ---');
    // Simulate an analytics update failure by marking reconciliation needed
    await analyticsEngine.markReconciliationNeeded(testUserA._id, 'Simulated Atlas connection timeout');
    const docBeforeHealing = await UserAnalytics.findOne({ user: testUserA._id });
    assert(docBeforeHealing.needsReconciliation === true, 'needsReconciliation successfully marked on failure');
    assert(docBeforeHealing.reconciliationReason === 'Simulated Atlas connection timeout', 'Reconciliation reason logged');

    // Trigger rebuild reconciliation
    await analyticsEngine.rebuildUserAnalytics(testUserA._id);
    const docAfterHealing = await UserAnalytics.findOne({ user: testUserA._id });
    assert(docAfterHealing.needsReconciliation === false, 'needsReconciliation cleared after reconciliation');
    assert(docAfterHealing.reconciliationReason === null, 'reconciliationReason cleared after recovery');

    // ─── TEST 21: ADVERSARIAL CONCURRENCY DURING REBUILD (OCC RETRY) ────
    console.log('\n--- TEST 21: Adversarial Concurrency (Rebuild vs Live Mutations) ---');
    // Launch rebuild and live mutations concurrently to verify OCC version conflict detection
    const rebuildPromise = analyticsEngine.rebuildUserAnalytics(testUserA._id);
    const mutationPromise = transactionService.createTransaction(testUserA._id, {
      title: 'Concurrent Race Tx',
      amount: 777,
      type: 'expense',
      category: catFood._id,
      account: accCash._id,
      date: new Date('2026-09-20T12:00:00Z')
    });

    await Promise.all([rebuildPromise, mutationPromise]);
    await new Promise(r => setTimeout(r, 250));

    const canonical21 = await analyticsService.getCanonicalAnalytics(testUserA._id);
    const precomputed21 = await analyticsService.getAnalytics(testUserA._id);
    assert(canonical21.summary.expense === precomputed21.summary.expense,
      `Concurrent rebuild vs mutation reconciled with ZERO lost updates (got ${precomputed21.summary.expense})`);

    // Clean up benchmark user data
    console.log('\nCleaning up benchmark user data...');
    await Transaction.deleteMany({ user: benchUser._id });
    await UserAnalytics.deleteMany({ user: benchUser._id });
    await UserAnalyticsMonthly.deleteMany({ user: benchUser._id });
    await Category.deleteMany({ user: benchUser._id });
    await Account.deleteMany({ user: benchUser._id });
    await User.deleteOne({ _id: benchUser._id });

    console.log('Benchmark user cleaned up.');

  } finally {
    // ─── TEARDOWN TEST USERS ──────────────────────────────────────────
    console.log('\n--- TEARDOWN: Cleaning up test users and data ---');
    if (testUserA) {
      await Transaction.deleteMany({ user: testUserA._id });
      await UserAnalytics.deleteMany({ user: testUserA._id });
      await UserAnalyticsMonthly.deleteMany({ user: testUserA._id });
      await Category.deleteMany({ user: testUserA._id });
      await Account.deleteMany({ user: testUserA._id });
      await User.deleteOne({ _id: testUserA._id });
    }
    if (testUserB) {
      await Transaction.deleteMany({ user: testUserB._id });
      await UserAnalytics.deleteMany({ user: testUserB._id });
      await UserAnalyticsMonthly.deleteMany({ user: testUserB._id });
      await Category.deleteMany({ user: testUserB._id });
      await Account.deleteMany({ user: testUserB._id });
      await Investment.deleteMany({ user: testUserB._id });
      await User.deleteOne({ _id: testUserB._id });
    }

    await mongoose.disconnect();
    console.log('MongoDB disconnected cleanly.\n');
  }

  console.log('====================================================');
  console.log(`🎉 TEST RUN COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runSuite().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}
