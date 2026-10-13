const assert = require('assert');
const mongoose = require('mongoose');
const Account = require('./models/Account');
const { resolveUserAccount } = require('./services/accountResolver');

async function runTest() {
  console.log('Testing Multi-Card Account Resolver...');
  const userId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();

  // Mock Account.find
  const mockAccounts = [
    {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      name: 'CIB Account',
      cardLast4: '0694',
      linkedCards: ['0694', '4113', '9988'],
      isArchived: false
    },
    {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      name: 'NBE Account',
      cardLast4: '1234',
      linkedCards: ['1234'],
      isArchived: false
    },
    {
      _id: new mongoose.Types.ObjectId(),
      user: otherUserId,
      name: 'Other User Account',
      cardLast4: '4113',
      linkedCards: ['4113'],
      isArchived: false
    }
  ];

  const originalAccountFind = Account.find;
  Account.find = function(query) {
    return {
      lean: async function() {
        return mockAccounts.filter(acc => {
          if (String(acc.user) !== String(query.user)) return false;
          if (acc.isArchived) return false;
          
          if (query.$or) {
            return query.$or.some(clause => {
              if (clause.linkedCards) {
                return acc.linkedCards && acc.linkedCards.includes(clause.linkedCards);
              }
              if (clause.cardLast4) {
                return acc.cardLast4 === clause.cardLast4;
              }
              return false;
            });
          }
          if (query.cardLast4) {
            return acc.cardLast4 === query.cardLast4;
          }
          if (query.linkedCards) {
            return acc.linkedCards && acc.linkedCards.includes(query.linkedCards);
          }
          return false;
        });
      }
    };
  };

  try {
    // Test 1: Match primary card
    const acc1 = await resolveUserAccount(userId, '0694');
    assert.ok(acc1, 'acc1 should be found');
    assert.strictEqual(acc1.name, 'CIB Account', 'Should match primary card 0694');

    // Test 2: Match secondary linked card
    const acc2 = await resolveUserAccount(userId, '4113');
    assert.ok(acc2, 'acc2 should be found');
    assert.strictEqual(acc2.name, 'CIB Account', 'Should match linked card 4113');

    // Test 3: Match tertiary linked card
    const acc3 = await resolveUserAccount(userId, '9988');
    assert.ok(acc3, 'acc3 should be found');
    assert.strictEqual(acc3.name, 'CIB Account', 'Should match linked card 9988');

    // Test 4: Tenant isolation - should not find other user's card or unknown card
    const accOther = await resolveUserAccount(userId, '9999');
    assert.strictEqual(accOther, null, 'Unlinked card should return null');

    console.log('✅ Multi-Card Account Resolver unit tests passed successfully!');
  } finally {
    Account.find = originalAccountFind;
  }
}

runTest().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
