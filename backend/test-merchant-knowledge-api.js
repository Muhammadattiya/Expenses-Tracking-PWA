const assert = require('assert');
const controller = require('./controllers/merchantKnowledgeController');
const UserMerchantKnowledge = require('./models/UserMerchantKnowledge');
const Category = require('./models/Category');

async function testApi() {
  console.log('Testing Merchant Knowledge API...');

  const userId = '660000000000000000000001';
  let sentData = null;
  let statusSent = 200;

  const req = {
    user: { id: userId },
    params: { id: 'rule_1' },
    body: { intentId: 'supermarket' }
  };

  const res = {
    status: (code) => {
      statusSent = code;
      return res;
    },
    json: (data) => {
      sentData = data;
      return res;
    }
  };

  // Mock UserMerchantKnowledge and Category
  const originalFind = UserMerchantKnowledge.find;
  const originalFindOneAndUpdate = UserMerchantKnowledge.findOneAndUpdate;
  const originalFindOneAndDelete = UserMerchantKnowledge.findOneAndDelete;
  const originalCategoryFind = Category.find;

  UserMerchantKnowledge.find = () => ({
    sort: () => ({
      lean: async () => [
        { _id: 'rule_1', user: userId, normalizedMerchant: 'ETISALAT', intentId: 'bills' }
      ]
    })
  });

  Category.find = () => ({
    lean: async () => [
      { _id: 'cat_bills', intentId: 'bills', name: 'Bills', color: '#007AFF', icon: 'Receipt' }
    ]
  });

  UserMerchantKnowledge.findOneAndUpdate = async (query, update) => {
    return { _id: query._id, user: query.user, normalizedMerchant: 'ETISALAT', intentId: update.intentId };
  };

  UserMerchantKnowledge.findOneAndDelete = async (query) => {
    return { _id: query._id, user: query.user };
  };

  try {
    // 1. Test GET
    await controller.getLearnedMerchants(req, res, (e) => { throw e; });
    assert.strictEqual(statusSent, 200);
    assert.ok(Array.isArray(sentData), 'Should return array');
    assert.strictEqual(sentData[0].normalizedMerchant, 'ETISALAT');
    assert.ok(sentData[0].category, 'Should enrich with Category');
    assert.strictEqual(sentData[0].category.name, 'Bills');

    // 2. Test PUT
    await controller.updateLearnedMerchant(req, res, (e) => { throw e; });
    assert.strictEqual(statusSent, 200);
    assert.strictEqual(sentData.intentId, 'supermarket');

    // 3. Test DELETE
    await controller.deleteLearnedMerchant(req, res, (e) => { throw e; });
    assert.strictEqual(statusSent, 200);
    assert.strictEqual(sentData.message, 'Rule deleted successfully');

    console.log('✅ Merchant Knowledge API unit tests passed successfully!');
  } finally {
    UserMerchantKnowledge.find = originalFind;
    UserMerchantKnowledge.findOneAndUpdate = originalFindOneAndUpdate;
    UserMerchantKnowledge.findOneAndDelete = originalFindOneAndDelete;
    Category.find = originalCategoryFind;
  }
}

testApi().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
