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
  const originalCategoryFindOne = Category.findOne;

  UserMerchantKnowledge.find = () => ({
    sort: () => ({
      lean: async () => [
        { _id: 'rule_1', user: userId, normalizedMerchant: 'ETISALAT', intentId: 'bills', category: 'cat_bills' },
        { _id: 'rule_2', user: userId, normalizedMerchant: 'NOLA', intentId: 'coffee' } // legacy rule without category
      ]
    })
  });

  const mockCategories = [
    { _id: 'cat_bills', intentId: 'bills', name: 'Bills', color: '#007AFF', icon: 'Receipt' },
    { _id: 'cat_coffee', intentId: 'coffee', name: 'Coffee', color: '#8D6346', icon: 'Coffee' }
  ];

  Category.find = () => ({
    lean: async () => mockCategories
  });

  Category.findOne = async (query) => {
    if (query._id) return mockCategories.find(c => c._id === query._id) || null;
    if (query.intentId) return mockCategories.find(c => c.intentId === query.intentId) || null;
    return null;
  };

  UserMerchantKnowledge.findOneAndUpdate = async (query, update) => {
    return { _id: query._id, user: query.user, normalizedMerchant: 'ETISALAT', ...update };
  };

  UserMerchantKnowledge.findOneAndDelete = async (query) => {
    return { _id: query._id, user: query.user };
  };

  try {
    // 1. Test GET (both direct category and fallback intentId)
    await controller.getLearnedMerchants(req, res, (e) => { throw e; });
    assert.strictEqual(statusSent, 200);
    assert.ok(Array.isArray(sentData), 'Should return array');
    assert.strictEqual(sentData[0].normalizedMerchant, 'ETISALAT');
    assert.ok(sentData[0].category, 'Should enrich with Category via rule.category');
    assert.strictEqual(sentData[0].category.name, 'Bills');
    assert.strictEqual(sentData[1].normalizedMerchant, 'NOLA');
    assert.ok(sentData[1].category, 'Should enrich with Category via fallback intentId');
    assert.strictEqual(sentData[1].category.name, 'Coffee');

    // 2. Test PUT with categoryId
    const reqWithCat = {
      user: { id: userId },
      params: { id: 'rule_1' },
      body: { categoryId: 'cat_coffee', intentId: 'coffee' }
    };
    await controller.updateLearnedMerchant(reqWithCat, res, (e) => { throw e; });
    assert.strictEqual(statusSent, 200);
    assert.strictEqual(sentData.category, 'cat_coffee');
    assert.strictEqual(sentData.intentId, 'coffee');

    // 2b. Test PUT with legacy intentId
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
    Category.findOne = originalCategoryFindOne;
  }
}

testApi().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
