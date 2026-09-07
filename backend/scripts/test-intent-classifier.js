const { extractIntent } = require('../services/quickAdd/nlpParser');
const { classifyCategoryIntent } = require('../services/categoryIntentClassifier');
const { classifyMerchant } = require('../services/merchantIntelligence/globalMerchantDictionary');

let total = 0;
let passed = 0;
let failed = 0;

function assertEqual(name, actual, expected) {
  total++;
  if (actual === expected) {
    passed++;
    console.log(`[PASS] ${name} | Input -> Actual: ${actual} === Expected: ${expected}`);
  } else {
    failed++;
    console.error(`[FAIL] ${name} | Input -> Actual: ${actual} !== Expected: ${expected}`);
  }
}

function runTests() {
  console.log('--- RUNNING INTENT CLASSIFIER TESTS ---\n');

  // 1. KNOWN SPECIFIC
  assertEqual('KNOWN: Gym', extractIntent('Gym'), 'sports');
  assertEqual('KNOWN: Football', extractIntent('Football'), 'sports');
  assertEqual('KNOWN: Groceries', extractIntent('Groceries'), 'groceries');
  assertEqual('KNOWN: Transportation', extractIntent('Transportation'), 'transportation');

  // 2. EXPLICIT OTHER
  assertEqual('EXPLICIT OTHER: Other', extractIntent('Other'), 'other');
  assertEqual('EXPLICIT OTHER: Other Expenses', extractIntent('Other Expenses'), 'other');
  assertEqual('EXPLICIT OTHER: Misc', extractIntent('Misc'), 'other');
  assertEqual('EXPLICIT OTHER: Miscellaneous', extractIntent('Miscellaneous'), 'other');
  assertEqual('EXPLICIT OTHER: مصاريف أخرى', extractIntent('مصاريف أخرى'), 'other');
  assertEqual('EXPLICIT OTHER: متفرقات', extractIntent('متفرقات'), 'other');
  assertEqual('EXPLICIT OTHER: masareef okhra', extractIntent('masareef okhra'), 'other');

  // 3. UNKNOWN (MUST BE NULL)
  assertEqual('UNKNOWN: Stuff', extractIntent('Stuff'), null);
  assertEqual('UNKNOWN: My Stuff', extractIntent('My Stuff'), null);
  assertEqual('UNKNOWN: Something', extractIntent('Something'), null);
  assertEqual('UNKNOWN: Random', extractIntent('Random'), null);
  assertEqual('UNKNOWN: X', extractIntent('X'), null);
  assertEqual('UNKNOWN: Game', extractIntent('Game'), null);
  assertEqual('UNKNOWN: Online Game', extractIntent('Online Game'), null);
  assertEqual('UNKNOWN: Club', extractIntent('Club'), null);
  assertEqual('UNKNOWN: Activity', extractIntent('Activity'), null);
  assertEqual('UNKNOWN: Training', extractIntent('Training'), null);
  assertEqual('UNKNOWN: Coach', extractIntent('Coach'), null);
  assertEqual('UNKNOWN: Match', extractIntent('Match'), null);

  // 4. CRITICAL REGRESSION TEST (Unknown merchant string)
  assertEqual('CRITICAL REGRESSION: Unknown Merchant', classifyMerchant('Unknown Merchant').intentId, null);
  assertEqual('CRITICAL REGRESSION: Unknown Merchant', classifyMerchant('Unknown Merchant').source, 'UNKNOWN');

  // 5. Merchant Intelligence (Sports)
  assertEqual("MERCHANT: GOLD'S GYM", classifyMerchant("GOLD'S GYM").intentId, 'sports');
  assertEqual('MERCHANT: NIKE', classifyMerchant('NIKE').intentId, 'sports');

  console.log(`\n--- RESULTS ---`);
  console.log(`Total: ${total}, Passed: ${passed}, Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
