require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const assert = require('assert');
const User = require('../models/User');
const Account = require('../models/Account');
const Bill = require('../models/Bill');
const RecurringTransaction = require('../models/RecurringTransaction');
const Installment = require('../models/Installment');
const UserAnalyticsMonthly = require('../models/UserAnalyticsMonthly');
const EmergencyFund = require('../models/EmergencyFund');
const emergencyFundService = require('../services/emergencyFundService');

const MONGO_URI = process.env.MONGO_URI;

async function runTests() {
  console.log('--- STARTING EMERGENCY FUND OPTION 2 PRE-AGGREGATION TESTS ---');
  await mongoose.connect(MONGO_URI);

  let testUser = null;
  try {
    const testEmail = `test_ef_burn_${Date.now()}@finova.local`;
    testUser = await User.create({
      name: 'Emergency Fund Tester',
      email: testEmail,
      password: 'hashed_password'
    });

    const account = await Account.create({
      user: testUser._id,
      name: 'Emergency Reserve Account',
      type: 'bank',
      balance_adjustment: 30000,
      isEmergencyFund: true
    });

    const Category = require('../models/Category');
    const category = await Category.create({
      user: testUser._id,
      name: 'General Living',
      type: 'expense'
    });

    // 1. Create Active Bill: 1,000 EGP / month
    await Bill.create({
      user: testUser._id,
      name: 'Internet & Electricity',
      expectedAmount: 1000,
      account: account._id,
      category: category._id,
      dueDate: new Date(),
      repeat: 'monthly',
      isActive: true
    });

    // 2. Create Active Recurring: 500 EGP / month
    await RecurringTransaction.create({
      user: testUser._id,
      name: 'Cloud Subscriptions',
      amount: 500,
      account: account._id,
      category: category._id,
      frequency: 'monthly',
      repeatType: 'monthly',
      nextExecutionDate: new Date(),
      type: 'expense',
      isActive: true
    });

    // 3. Create Active Installment: 1,500 EGP / month
    await Installment.create({
      user: testUser._id,
      title: 'Laptop Installment',
      monthlyAmount: 1500,
      totalAmount: 18000,
      totalMonths: 12,
      dueDayOfMonth: 15,
      nextDueDate: new Date(),
      linkedAccountId: account._id,
      status: 'active'
    });

    // Fixed monthly commitments = 1000 + 500 + 1500 = 3,000 EGP

    // 4. Create Pre-Aggregated UserAnalyticsMonthly documents (simulating analyticsEngine incremental aggregates)
    // Month 1 (completed): Total expense = 12,000 EGP
    await UserAnalyticsMonthly.create({
      user: testUser._id,
      month: '2026-07',
      year: 2026,
      monthNum: 7,
      summary: { expense: 12000, income: 20000, balance: 8000 }
    });
    // Month 2 (completed): Total expense = 10,000 EGP
    await UserAnalyticsMonthly.create({
      user: testUser._id,
      month: '2026-08',
      year: 2026,
      monthNum: 8,
      summary: { expense: 10000, income: 20000, balance: 10000 }
    });

    // Average completed month expense = (12000 + 10000) / 2 = 11,000 EGP
    // Expected variable discretionary spend = 11,000 - 3,000 (fixed) = 8,000 EGP
    // Expected total burn rate = 3,000 + 8,000 = 11,000 EGP

    console.log('\n[TEST 1] calculateBurnBreakdown uses pre-aggregated UserAnalyticsMonthly (Option 2):');
    const breakdown = await emergencyFundService.calculateBurnBreakdown(testUser._id);
    console.log('Result Breakdown:', breakdown);

    assert.strictEqual(breakdown.billsMonthly, 1000, 'Bills monthly should be 1000');
    assert.strictEqual(breakdown.recurringMonthly, 500, 'Recurring monthly should be 500');
    assert.strictEqual(breakdown.installmentsMonthly, 1500, 'Installments monthly should be 1500');
    assert.strictEqual(breakdown.discretionaryBaseline, 8000, 'Discretionary baseline should be 8000 (11,000 avg - 3000 fixed)');
    console.log('✓ PASS: Option 2 correctly derived 8,000 variable living expense from UserAnalyticsMonthly');

    console.log('\n[TEST 2] getEmergencyFundShield materializes and caches aggregated metrics in EmergencyFund document:');
    const shield1 = await emergencyFundService.getEmergencyFundShield(testUser._id);
    console.log('Shield essentialMonthlyBurn:', shield1.essentialMonthlyBurn);
    console.log('Shield targetAmount (6 months):', shield1.targetAmount);

    assert.strictEqual(shield1.essentialMonthlyBurn, 11000, 'Essential monthly burn should be 11000');
    assert.strictEqual(shield1.targetAmount, 66000, 'Target amount should be 66000 (11000 * 6)');

    const efDoc = await EmergencyFund.findOne({ user: testUser._id });
    assert.ok(efDoc, 'EmergencyFund document should exist');
    assert.strictEqual(efDoc.essentialMonthlyBurn, 11000, 'Persisted essentialMonthlyBurn must match');
    assert.strictEqual(efDoc.targetAmount, 66000, 'Persisted targetAmount must match');
    assert.strictEqual(efDoc.burnBreakdown.billsMonthly, 1000, 'Persisted billsMonthly must match');
    assert.strictEqual(efDoc.burnBreakdown.discretionaryBaseline, 8000, 'Persisted discretionaryBaseline must match');
    assert.ok(efDoc.lastReconciledAt, 'lastReconciledAt timestamp must be recorded');
    console.log('✓ PASS: EmergencyFund model successfully stored pre-aggregated burn breakdown and targets');

    console.log('\n[TEST 3] High-performance cache retrieval:');
    const t0 = performance.now();
    const shield2 = await emergencyFundService.getEmergencyFundShield(testUser._id);
    const duration = performance.now() - t0;
    console.log(`Cache read completed in ${duration.toFixed(2)}ms (over remote Atlas cluster)`);
    assert.strictEqual(shield2.essentialMonthlyBurn, 11000);
    assert.ok(duration < 2000, 'Pre-aggregated cache read must succeed promptly');
    console.log('✓ PASS: Cache retrieval is instant and avoids recalculating from db');

    console.log('\n[TEST 4] Fallback for new user with 0 transactions:');
    const newUser = await User.create({
      name: 'Brand New User',
      email: `test_new_${Date.now()}@finova.local`,
      password: 'hashed_password'
    });
    const newBreakdown = await emergencyFundService.calculateBurnBreakdown(newUser._id);
    console.log('New user breakdown:', newBreakdown);
    assert.strictEqual(newBreakdown.billsMonthly, 0);
    assert.strictEqual(newBreakdown.discretionaryBaseline, 3000, 'Fallback to 3000 baseline for new user');
    console.log('✓ PASS: Clean fallback for new users with no historical analytics');

    console.log('\n[TEST 5] User-selected survival categories calculation:');
    const luxuryCat = await Category.create({
      user: testUser._id,
      name: 'Luxury Entertainment',
      type: 'expense'
    });

    // Populate categoryTotals in UserAnalyticsMonthly docs
    await UserAnalyticsMonthly.updateOne(
      { user: testUser._id, month: '2026-07' },
      {
        $set: {
          [`categoryTotals.${category._id.toString()}`]: { amount: 4000, count: 10, type: 'expense' },
          [`categoryTotals.${luxuryCat._id.toString()}`]: { amount: 8000, count: 5, type: 'expense' }
        }
      }
    );
    await UserAnalyticsMonthly.updateOne(
      { user: testUser._id, month: '2026-08' },
      {
        $set: {
          [`categoryTotals.${category._id.toString()}`]: { amount: 4000, count: 8, type: 'expense' },
          [`categoryTotals.${luxuryCat._id.toString()}`]: { amount: 6000, count: 4, type: 'expense' }
        }
      }
    );

    // Update EmergencyFund to only count the essential food/living category
    const updatedConfig = await emergencyFundService.updateEmergencyFund(testUser._id, {
      essentialCategoryIds: [category._id.toString()]
    });

    console.log('Updated shield with survival categories:', {
      burnBreakdown: updatedConfig.burnBreakdown,
      essentialMonthlyBurn: updatedConfig.essentialMonthlyBurn,
      essentialCategoryIds: updatedConfig.essentialCategoryIds
    });

    assert.strictEqual(updatedConfig.burnBreakdown.discretionaryBaseline, 4000, 'Baseline living should strictly reflect survival categories (4,000)');
    assert.strictEqual(updatedConfig.essentialMonthlyBurn, 7000, 'Total burn should be fixed (3,000) + survival categories (4,000) = 7,000');
    assert.strictEqual(updatedConfig.essentialCategoryIds.length, 1);
    assert.strictEqual(updatedConfig.essentialCategoryIds[0], category._id.toString());
    console.log('✓ PASS: Custom survival categories correctly isolate essential burn to 7,000 EGP');

    // Clean up
    await Category.deleteMany({ user: testUser._id });
    await User.deleteMany({ _id: { $in: [testUser._id, newUser._id] } });
    await Account.deleteMany({ user: { $in: [testUser._id, newUser._id] } });
    await Bill.deleteMany({ user: { $in: [testUser._id, newUser._id] } });
    await RecurringTransaction.deleteMany({ user: { $in: [testUser._id, newUser._id] } });
    await Installment.deleteMany({ user: { $in: [testUser._id, newUser._id] } });
    await UserAnalyticsMonthly.deleteMany({ user: { $in: [testUser._id, newUser._id] } });
    await EmergencyFund.deleteMany({ user: { $in: [testUser._id, newUser._id] } });

    console.log('\nALL EMERGENCY FUND PRE-AGGREGATION & CUSTOM CATEGORIES TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
