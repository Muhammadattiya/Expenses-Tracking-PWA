require('dotenv').config();
const mongoose = require('mongoose');
const { extractIntent } = require('./services/quickAdd/nlpParser');
const { resolveCategory } = require('./services/quickAdd/intentResolver');
const { parseSms } = require('./services/smsParser');
const User = require('./models/User');
const Category = require('./models/Category');

const runTests = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finova');
    console.log('Connected to DB for Intent Audit.');

    // 1. Create a dummy user for testing scoped category resolution
    let user1 = await User.findOne({ email: 'intent_test1@example.com' });
    if (!user1) {
      user1 = await User.create({ name: 'Intent Test 1', email: 'intent_test1@example.com', passwordHash: 'dummy' });
    }
    let user2 = await User.findOne({ email: 'intent_test2@example.com' });
    if (!user2) {
      user2 = await User.create({ name: 'Intent Test 2', email: 'intent_test2@example.com', passwordHash: 'dummy' });
    }

    // Clear existing test categories
    await Category.deleteMany({ user: { $in: [user1._id, user2._id] } });

    // Seed User 1 Categories
    const u1Categories = await Category.insertMany([
      { user: user1._id, name: 'Food & Dining', type: 'expense', intentId: 'food_and_drink', intentConfidence: 0.9, icon: 'Utensils', color: '#ff0000' },
      { user: user1._id, name: 'Coffee', type: 'expense', intentId: 'coffee', intentConfidence: 0.6, icon: 'Coffee', color: '#00ff00' },
      { user: user1._id, name: 'My Transport', type: 'expense', intentId: 'transportation', intentConfidence: 0.9, icon: 'Car', color: '#0000ff' },
      { user: user1._id, name: 'Salary', type: 'income', intentId: 'salary', intentConfidence: 0.9, icon: 'DollarSign', color: '#000000' },
      { user: user1._id, name: 'Legacy Bills', type: 'expense', icon: 'FileText', color: '#ffffff' } // Unmigrated category, rely on synonym 'فواتير'
    ]);

    // Seed User 2 Categories
    const u2Categories = await Category.insertMany([
      { user: user2._id, name: 'User 2 Coffee', type: 'expense', intentId: 'coffee', intentConfidence: 0.9, icon: 'Coffee', color: '#00ff00' }
    ]);

    const metrics = { passed: 0, failed: 0 };
    const ambiguities = [];
    const issues = [];

    const check = (desc, actual, expected) => {
      if (actual === expected) {
        console.log(`[PASS] ${desc}`);
        metrics.passed++;
      } else {
        console.error(`[FAIL] ${desc} | Expected: ${expected} | Actual: ${actual}`);
        metrics.failed++;
        issues.push({ desc, expected, actual });
      }
    };

    // PHASE 2 - COMPREHENSIVE INTENT MATRIX
    console.log('\n--- PHASE 2: INTENT MATRIX ---');
    const matrix = [
      { i: 'قهوة بـ50', exp: 'coffee' },
      { i: 'دفعت في كافيه', exp: 'coffee' },
      { i: 'coffee', exp: 'coffee' },
      { i: 'coffee shop', exp: 'coffee' },
      { i: 'starbucks', exp: 'coffee' },
      { i: 'starbucks cairo', exp: 'coffee' },
      { i: 'كوفي', exp: 'coffee' },
      { i: 'cafe xyz', exp: 'coffee' },
      { i: 'مطعم', exp: 'restaurant' },
      { i: 'دفعت في مطعم', exp: 'restaurant' },
      { i: 'restaurant', exp: 'restaurant' },
      { i: 'dine out', exp: 'restaurant' },
      { i: 'mat3am', exp: 'restaurant' },
      { i: 'بيتزا', exp: 'fast_food' },
      { i: 'pizza', exp: 'fast_food' },
      { i: 'برجر', exp: 'fast_food' },
      { i: 'burger', exp: 'fast_food' },
      { i: 'كشري', exp: 'fast_food' },
      { i: 'شاورما', exp: 'fast_food' },
      { i: 'kfc', exp: 'fast_food' },
      { i: 'mcdonalds', exp: 'fast_food' },
      { i: 'اوبر', exp: 'ride_hailing' },
      { i: 'uber', exp: 'ride_hailing' },
      { i: 'تاكسي', exp: 'taxi' },
      { i: 'taxi', exp: 'taxi' },
      { i: 'careem', exp: 'ride_hailing' },
      { i: 'مترو', exp: 'public_transport' },
    ];
    matrix.forEach(t => check(`Intent for "${t.i}"`, extractIntent(t.i), t.exp));

    // PHASE 3 - OVERLAP / AMBIGUITY
    console.log('\n--- PHASE 3: AMBIGUITY ---');
    const ambiguitiesList = [
      'مطعم و قهوة',
      'قهوة في مطعم',
      'pizza restaurant',
      'coffee shop',
      'shopping mall',
      'Talabat',
      'Carrefour',
      'Netflix',
      'gym',
      'club',
      'internet',
      'mobile recharge',
      'water',
      'restaurant cafe'
    ];
    ambiguitiesList.forEach(text => {
      const intent = extractIntent(text);
      console.log(`[AMBIGUITY] "${text}" -> ${intent}`);
      ambiguities.push({ input: text, intent });
    });

    const { classifyMerchant } = require('./services/merchantIntelligence/globalMerchantDictionary');

    // PHASE 4 - MERCHANT ONLY
    console.log('\n--- PHASE 4: MERCHANT ONLY ---');
    const merchants = [
      { i: 'STARBUCKS', exp: 'coffee' },
      { i: 'STARBUCKS CAIRO', exp: 'coffee' },
      { i: 'KFC', exp: 'fast_food' },
      { i: 'MCDONALDS', exp: 'fast_food' },
      { i: 'UBER', exp: 'ride_hailing' },
      { i: 'CAREEM', exp: 'ride_hailing' },
      { i: 'SWVL', exp: 'public_transport' }, // Added to global dictionary
      { i: 'NETFLIX', exp: 'subscriptions' },
      { i: 'SPOTIFY', exp: 'subscriptions' },
      { i: 'CARREFOUR', exp: 'groceries' }, // كارفور is in Arabic, but Carrefour English is not! Let's see what happens.
      { i: 'AMAZON', exp: 'shopping' },
      { i: 'NOON', exp: 'shopping' },
      { i: 'FAWRY', exp: null }, 
      { i: 'PAYMOB', exp: null },
      { i: 'PAYMOB*LIMBO CAFE', exp: 'coffee' },
      { i: 'TOP UP ETISALAT EGYPT', exp: null }, // 'اتصالات' is in Arabic, 'recharge' is 'شحن' 
      { i: 'MOBILE RECHARGE', exp: 'mobile' }, // recharge is in mobile
      { i: 'FAWRYPF*HANA MARKETSQAL', exp: 'groceries' } // market is in groceries
    ];
    merchants.forEach(t => check(`Merchant "${t.i}"`, classifyMerchant(t.i).intentId, t.exp));

    // PHASE 5 - FALSE POSITIVE / ADVERSARIAL
    console.log('\n--- PHASE 5: FALSE POSITIVE ---');
    const adversarial = [
      '01012345678',
      '022431701746',
      '9596',
      '100001269596',
      'EGP 95.50',
      'REF# 226f1cc5',
      'Transaction ID 123',
      'Transfer to Ahmed'
    ];
    adversarial.forEach(t => check(`False Positive "${t}"`, extractIntent(t), t === 'Transfer to Ahmed' ? 'transfers' : null));

    // PHASE 6 - RESOLVER TESTS
    console.log('\n--- PHASE 6: RESOLVER TESTS ---');
    const res1 = await resolveCategory(user1._id, 'food_and_drink', 'expense');
    check('Resolve exact intent >= 0.8', res1?.name, 'Food & Dining');

    const res2 = await resolveCategory(user1._id, 'coffee', 'expense');
    check('Resolve exact intent = 0.6', res2?.name, 'Coffee');

    const res3 = await resolveCategory(user1._id, 'entertainment', 'expense');
    check('Resolve missing intent', res3, null);

    const res4 = await resolveCategory(user1._id, 'bills', 'expense');
    // Synonym matching for 'Legacy Bills' because INTENT_SYNONYMS['bills'] = ['فواتير', ...]
    // 'Legacy Bills' doesn't contain Arabic synonyms. But let's see.
    check('Resolve synonym fallback (English)', res4?.name, 'Legacy Bills'); // Expect Legacy Bills because of new English synonyms

    const res5 = await resolveCategory(user1._id, 'coffee', 'income');
    check('Wrong transaction type (income coffee)', res5, null);

    const res6 = await resolveCategory(user2._id, 'transportation', 'expense');
    check('User isolation (User 2 has no transport)', res6, null);

    // PHASE 8 - SMS SPECIFIC TESTS
    console.log('\n--- PHASE 8: SMS SPECIFIC ---');
    const smsSamples = [
      {
        sms: 'Your Debit Card **1984 had a Successful transaction of EGP 257.14 @Top Up ETISALAT Egypt,your available bal.EGP32.56 for lost/stolen card call 19700',
        expMerchant: 'Top Up ETISALAT Egypt',
        expIntent: null
      },
      {
        sms: 'تم خصم 404.7 EGP من بطاقة المدفوعة مقدما رقم 2513 باستخدام Mobile Payment عند PAYMOB*LIMBO CAFE C يوم 20/07/26 الساعه 10:42 المتاح 1593.2EGP للمزيد إتصل ب ١٩٦٢٣',
        expMerchant: 'PAYMOB*LIMBO CAFE C',
        expIntent: 'coffee'
      },
      {
        sms: 'Purchase of EGP 140.00 with Debit Card **1984 at SWVL, CAIRO, EG. Avl Bal is EGP 8704.94.',
        expMerchant: 'SWVL',
        expIntent: null
      }
    ];

    for (let i=0; i<smsSamples.length; i++) {
      const parsed = parseSms(smsSamples[i].sms);
      check(`SMS ${i+1} Merchant`, parsed.merchant, smsSamples[i].expMerchant);
      if (parsed.merchant) {
         const intent = extractIntent(parsed.merchant);
         check(`SMS ${i+1} Intent`, intent, smsSamples[i].expIntent);
      }
    }

    console.log(`\n=== RESULTS: Passed: ${metrics.passed} | Failed: ${metrics.failed} ===`);
    console.log('ISSUES:', JSON.stringify(issues, null, 2));
    
    await mongoose.disconnect();
    process.exit(metrics.failed > 0 ? 1 : 0);

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

runTests();
