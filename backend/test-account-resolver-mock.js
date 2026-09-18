/**
 * Pure In-Memory Unit Test for Multi-Tenant Account Resolver Isolation
 * 
 * STRICT CONSTRAINT: ZERO DATABASE DELETIONS / MUTATIONS.
 * Uses mock stubs for Account.find to verify 100% tenant isolation.
 */

const assert = require('assert');
const Account = require('./models/Account');
const { resolveUserAccount } = require('./services/accountResolver');

async function runTests() {
  console.log('Running Multi-Tenant Account Resolver Isolation Tests...\n');

  // Simulated Database Accounts across 2 distinct users
  const userAId = '66000000000000000000000a';
  const userBId = '66000000000000000000000b';

  const mockDbAccounts = [
    {
      _id: 'acc_a_1984',
      user: userAId,
      name: 'User A Banque Misr',
      cardLast4: '1984',
      isArchived: false
    },
    {
      _id: 'acc_b_1984',
      user: userBId,
      name: 'User B CIB Card',
      cardLast4: '1984',
      isArchived: false
    },
    {
      _id: 'acc_a_0694',
      user: userAId,
      name: 'User A ADIB Account',
      cardLast4: '0694',
      isArchived: false
    },
    {
      _id: 'acc_a_4113',
      user: userAId,
      name: 'User A QNB Account',
      cardLast4: '4113',
      isArchived: false
    },
    {
      _id: 'acc_a_dup1',
      user: userAId,
      name: 'User A Debit Card 9999',
      cardLast4: '9999',
      isArchived: false
    },
    {
      _id: 'acc_a_dup2',
      user: userAId,
      name: 'User A Credit Card 9999',
      cardLast4: '9999',
      isArchived: false
    }
  ];

  // Mock Account.find without touching MongoDB
  const originalFind = Account.find;
  Account.find = function(query) {
    return {
      session: function() { return this; },
      lean: async function() {
        return mockDbAccounts.filter(acc => {
          if (query.user && String(acc.user) !== String(query.user)) return false;
          if (query.cardLast4 && acc.cardLast4 !== query.cardLast4) return false;
          if (query.isArchived && query.isArchived.$ne === true && acc.isArchived === true) return false;
          return true;
        });
      }
    };
  };

  try {
    // Test 1: User A resolving 1984 gets User A's account, NEVER User B's
    const resA = await resolveUserAccount(userAId, '1984');
    assert(resA !== null, 'Expected User A account to be found');
    assert.strictEqual(resA._id, 'acc_a_1984', 'Must resolve exclusively to User A account');
    assert.strictEqual(resA.name, 'User A Banque Misr');
    console.log('✅ Test 1 Passed: User A resolves exclusively to User A account for 1984');

    // Test 2: User B resolving 1984 gets User B's account, NEVER User A's
    const resB = await resolveUserAccount(userBId, '1984');
    assert(resB !== null, 'Expected User B account to be found');
    assert.strictEqual(resB._id, 'acc_b_1984', 'Must resolve exclusively to User B account');
    assert.strictEqual(resB.name, 'User B CIB Card');
    console.log('✅ Test 2 Passed: User B resolves exclusively to User B account for 1984');

    // Test 3: Cross-user isolation - User B cannot access User A's 0694 account
    const resB0694 = await resolveUserAccount(userBId, '0694');
    assert.strictEqual(resB0694, null, 'User B must not resolve User A 0694 account');
    console.log('✅ Test 3 Passed: User B cannot resolve User A accounts');

    // Test 4: Ambiguous last-4 (User A owns two accounts ending in 9999) returns null (zero-guessing)
    const resDup = await resolveUserAccount(userAId, '9999');
    assert.strictEqual(resDup, null, 'Ambiguous accounts with same last4 must return null (zero-guessing)');
    console.log('✅ Test 4 Passed: Multiple accounts for same user return null to prevent guessing');

    // Test 5: Non-existent last-4 returns null
    const resNone = await resolveUserAccount(userAId, '5555');
    assert.strictEqual(resNone, null, 'Non-existent account must return null');
    console.log('✅ Test 5 Passed: Unknown account returns null');

    console.log('\n🎉 ALL MULTI-TENANT ACCOUNT RESOLVER TESTS PASSED!');
  } finally {
    Account.find = originalFind;
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
