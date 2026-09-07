require('dotenv').config();
const mongoose = require('mongoose');
const { classifyCategoryIntent } = require('./services/categoryIntentClassifier');
const { learnFromUser } = require('./services/merchantLearningService');
const { resolveMerchantIntent } = require('./services/merchantIntelligence/merchantClassificationResolver');
const UserMerchantKnowledge = require('./models/UserMerchantKnowledge');
const GlobalMerchantKnowledge = require('./models/GlobalMerchantKnowledge');
const Category = require('./models/Category');

const MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/finova_test_phase3';

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, testName) {
  if (actual === expected) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName} | Expected: ${expected} | Actual: ${actual}`);
    failed++;
  }
}

async function runTests() {
  console.log('--- STARTING PHASE 3 ARCHITECTURE TESTS ---\n');
  
  await mongoose.connect(MONGODB_URI);
  await mongoose.connection.db.dropDatabase();

  const userId1 = new mongoose.Types.ObjectId();
  const userId2 = new mongoose.Types.ObjectId();
  const userId3 = new mongoose.Types.ObjectId();
  const userId4 = new mongoose.Types.ObjectId();

  // ==========================================
  // 1. Category Intent Classifier Tests
  // ==========================================
  console.log('\n--- 1. Category Intent Classifier ---');
  assertEqual(classifyCategoryIntent('وجبات سريعة'), 'fast_food', 'Classify Franco/Synonym: وجبات سريعة -> fast_food');
  assertEqual(classifyCategoryIntent('مصاريف مدرسة'), 'education', 'Classify Substring: مصاريف مدرسة -> education');
  assertEqual(classifyCategoryIntent('Pizza'), 'fast_food', 'Classify English: Pizza -> fast_food');
  assertEqual(classifyCategoryIntent('Coffee'), 'coffee', 'Classify English: Coffee -> coffee');
  assertEqual(classifyCategoryIntent('Gifts'), 'gifts', 'Classify English: Gifts -> gifts');
  assertEqual(classifyCategoryIntent('UnknownCategory123'), null, 'Classify Unknown: UnknownCategory123 -> null');

  // ==========================================
  // 2. Learning Core Tests (Single Confirmation)
  // ==========================================
  console.log('\n--- 2. Merchant Learning & Precedence ---');
  
  // Setup Categories for user 1
  const catCoffee = await Category.create({ user: userId1, name: 'قهوة', type: 'expense', intentId: 'coffee' });
  const catFood = await Category.create({ user: userId1, name: 'اكل', type: 'expense', intentId: 'food' });
  
  // Learn coffee for an unknown merchant (DummyCilantro) for user 1
  await learnFromUser(userId1, 'DummyCilantro', catCoffee._id);
  
  // User 1 should resolve DummyCilantro to coffee (via User Knowledge)
  const u1Cilantro = await resolveMerchantIntent('DummyCilantro', userId1);
  assertEqual(u1Cilantro, 'coffee', 'User 1 resolves DummyCilantro to coffee');

  // User 2 SHOULD resolve DummyCilantro to coffee instantly (1 confirmation is enough globally)
  const u2Cilantro = await resolveMerchantIntent('DummyCilantro', userId2);
  assertEqual(u2Cilantro, 'coffee', 'User 2 immediately resolves DummyCilantro to coffee (Single confirmation global)');

  // ==========================================
  // 3. Conflict Handling (First Wins)
  // ==========================================
  console.log('\n--- 3. Conflict Resolution (Ignored Globally) ---');

  // User 2 learns DummyCilantro as food (Conflict!)
  const catFood2 = await Category.create({ user: userId2, name: 'Food', type: 'expense', intentId: 'food' });
  await learnFromUser(userId2, 'DummyCilantro', catFood2._id);
  
  // The global entry should remain 'coffee' (First wins globally)
  const globalInfo = await GlobalMerchantKnowledge.findOne({ normalizedMerchant: 'DUMMYCILANTRO' });
  assertEqual(globalInfo.intentId, 'coffee', 'Global knowledge for DummyCilantro remains coffee after conflict');
  
  // But User 2 gets their personal override
  const u2CilantroAfterOverride = await resolveMerchantIntent('DummyCilantro', userId2);
  assertEqual(u2CilantroAfterOverride, 'food', 'User 2 resolves DummyCilantro to their personal override (food)');
  
  // User 3 still gets the global 'coffee'
  const u3Cilantro = await resolveMerchantIntent('DummyCilantro', userId3);
  assertEqual(u3Cilantro, 'coffee', 'User 3 gets the original global intent (coffee) despite User 2 conflict');

  // ==========================================
  // Summary
  // ==========================================
  console.log(`\n================================`);
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log(`================================`);

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
