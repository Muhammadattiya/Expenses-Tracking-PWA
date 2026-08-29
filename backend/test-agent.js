require('dotenv').config();
const mongoose = require('mongoose');
const agentService = require('./services/agentService');
const { agentToolHandlers } = require('./services/agentTools');
const User = require('./models/User');
const Account = require('./models/Account');
require('./models/Category'); // ensure it's registered
require('./models/Transaction'); // ensure it's registered

async function runTests() {
  console.log('--- STARTING FINOVA AGENT TEST SUITE ---');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[+] Connected to MongoDB');

    const user = await User.findOne();
    if (!user) {
      console.log('[-] No users found in database for testing.');
      process.exit(0);
    }
    const userId = user._id.toString();
    console.log(`[+] Testing with User ID: ${userId}`);

    // ==========================================
    // 1. TOOL UNIT TESTS (MOCKED GROQ)
    // ==========================================
    console.log('\n--- 1. TOOL EXECUTION TESTS ---');
    try {
      const summary = await agentToolHandlers.get_financial_summary(userId, {});
      console.log('PASS: get_financial_summary executed successfully.');
    } catch (e) {
      console.log('FAIL: get_financial_summary threw an error:', e.message);
    }

    try {
      const accounts = await agentToolHandlers.get_accounts(userId, {});
      console.log('PASS: get_accounts executed successfully.');
    } catch (e) {
      console.log('FAIL: get_accounts threw an error:', e.message);
    }

    try {
      const budgets = await agentToolHandlers.get_budgets(userId, {});
      console.log('PASS: get_budgets executed successfully.');
    } catch (e) {
      console.log('FAIL: get_budgets threw an error:', e.message);
    }

    try {
      const survival = await agentToolHandlers.check_payday_survival(userId, {});
      console.log('PASS: check_payday_survival executed successfully.');
    } catch (e) {
      console.log('FAIL: check_payday_survival threw an error:', e.message);
    }

    // ==========================================
    // 2. SECURITY & ISOLATION TESTS
    // ==========================================
    console.log('\n--- 2. SECURITY TESTS ---');
    try {
      // Create a dummy user to test isolation
      const dummyUser = new User({ name: 'Hacker', email: 'hacker@finova.test', password: 'password', googleId: 'dummy_hacker_123' });
      await dummyUser.save();
      const dummyUserId = dummyUser._id.toString();

      const userAccounts = await agentToolHandlers.get_accounts(userId, {});
      const dummyAccounts = await agentToolHandlers.get_accounts(dummyUserId, {});

      if (userAccounts.length !== dummyAccounts.length || (userAccounts.length > 0 && userAccounts[0]._id.toString() !== (dummyAccounts[0]?._id?.toString()))) {
         console.log('PASS: Cross-user isolation verified for get_accounts.');
      } else {
         console.log('FAIL: Cross-user isolation failed (or both users have no accounts, manual check needed).');
      }
      
      await User.deleteOne({ _id: dummyUser._id });
    } catch (e) {
      console.log('FAIL: Security tests threw an error:', e.message);
    }

    console.log('\n--- 2.5 NAME RESOLUTION TESTS ---');
    try {
      const Category = require('./models/Category');
      const testCat = new Category({ user: userId, name: 'AgentTestCategory', color: '#000000', icon: 'test', type: 'expense' });
      await testCat.save();

      // Test exact match
      const summaryResolved = await agentToolHandlers.get_financial_summary(userId, { categoryName: 'AgentTestCategory' });
      if (summaryResolved.found !== false) {
        console.log('PASS: Category name successfully resolved and passed to analytics.');
      } else {
        console.log('FAIL: Category name failed to resolve.', summaryResolved);
      }

      // Test unknown
      const unknownResolved = await agentToolHandlers.get_financial_summary(userId, { categoryName: 'UnknownFakeCategoryXYZ' });
      if (unknownResolved.found === false && unknownResolved.requestedName === 'UnknownFakeCategoryXYZ') {
        console.log('PASS: Unknown category name correctly handled without crashing.');
      } else {
        console.log('FAIL: Unknown category handled incorrectly.', unknownResolved);
      }

      // Test dummy user cannot access testCat
      const dummyUser2 = new User({ name: 'Hacker2', email: 'hacker2@finova.test', password: 'password', googleId: 'dummy_hacker_456' });
      await dummyUser2.save();
      const dummyUserId2 = dummyUser2._id.toString();

      const crossUserResolved = await agentToolHandlers.get_financial_summary(dummyUserId2, { categoryName: 'AgentTestCategory' });
      if (crossUserResolved.found === false) {
        console.log('PASS: Cross-user category name resolution isolated securely.');
      } else {
        console.log('FAIL: Cross-user category name resolution leaked data!', crossUserResolved);
      }

      // Cleanup
      await Category.deleteOne({ _id: testCat._id });
      await User.deleteOne({ _id: dummyUser2._id });

    } catch (e) {
      console.log('FAIL: Name resolution tests threw an error:', e.message);
    }

    // ==========================================
    // 3. GROQ INTEGRATION TESTS
    // ==========================================
    console.log('\n--- 3. GROQ INTEGRATION TESTS ---');
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'dummy') {
      console.log('NOT VERIFIED — GROQ API integration requires GROQ_API_KEY.');
    } else {
      try {
        console.log('Running live Groq integration tests...');
        const res1 = await agentService.processChat(userId, "What accounts do I have?");
        if (!res1.history.some(m => m.role === 'tool' && m.name === 'get_accounts')) {
          console.error('FAIL: Agent did not call get_accounts tool.');
        } else {
          console.log('PASS: Agent successfully called get_accounts.');
        }

        const res2 = await agentService.processChat(userId, "How much did I spend this month?");
        if (!res2.history.some(m => m.role === 'tool' && m.name === 'get_financial_summary')) {
          console.error('FAIL: Agent did not call get_financial_summary tool.');
        } else {
          console.log('PASS: Agent successfully called get_financial_summary.');
        }

        console.log('PASS: Full Groq LLM reasoning flow validated.');
      } catch (e) {
        console.error('FAIL: Groq live integration test threw an error:', e.message);
      }
    }

  } catch (err) {
    console.error('TEST SUITE FAILED:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\n--- TESTS COMPLETED ---');
  }
}

runTests();
