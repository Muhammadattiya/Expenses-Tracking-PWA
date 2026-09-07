const { classifyMerchant, normalizeMerchantToken } = require('./services/merchantIntelligence/globalMerchantDictionary');

let metrics = { passed: 0, failed: 0 };
const issues = [];

function check(desc, actual, expected) {
  if (actual === expected) {
    console.log(`[PASS] ${desc}`);
    metrics.passed++;
  } else {
    console.error(`[FAIL] ${desc} | Expected: ${expected} | Actual: ${actual}`);
    metrics.failed++;
    issues.push({ desc, expected, actual });
  }
}

function checkObject(desc, actual, expected) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    console.log(`[PASS] ${desc}`);
    metrics.passed++;
  } else {
    console.error(`[FAIL] ${desc} | Expected: ${expectedStr} | Actual: ${actualStr}`);
    metrics.failed++;
    issues.push({ desc, expected, actual });
  }
}

// EXACT GLOBAL MERCHANTS
console.log('\\n--- EXACT GLOBAL MERCHANTS ---');
check('STARBUCKS', classifyMerchant('STARBUCKS').intentId, 'coffee');
check('KFC', classifyMerchant('KFC').intentId, 'fast_food');
check('MCDONALDS', classifyMerchant('MCDONALDS').intentId, 'fast_food');
check('UBER', classifyMerchant('UBER').intentId, 'ride_hailing');
check('CAREEM', classifyMerchant('CAREEM').intentId, 'ride_hailing');
check('SWVL', classifyMerchant('SWVL').intentId, 'public_transport');
check('NETFLIX', classifyMerchant('NETFLIX').intentId, 'subscriptions');
check('SPOTIFY', classifyMerchant('SPOTIFY').intentId, 'subscriptions');
check('CARREFOUR', classifyMerchant('CARREFOUR').intentId, 'groceries');
check('TALABAT', classifyMerchant('TALABAT').intentId, 'groceries');
check('AMAZON', classifyMerchant('AMAZON').intentId, 'shopping');
check('NOON', classifyMerchant('NOON').intentId, 'shopping');

// NORMALIZATION
console.log('\\n--- NORMALIZATION ---');
console.log('\n--- NORMALIZATION ---');
check('starbucks -> STARBUCKS', normalizeMerchantToken('starbucks'), 'STARBUCKS');
check('STARBUCKS CAIRO -> STARBUCKS', normalizeMerchantToken('STARBUCKS CAIRO'), 'STARBUCKS');
check('STARBUCKS*CAIRO -> STARBUCKS', normalizeMerchantToken('STARBUCKS*CAIRO'), 'STARBUCKS');
check('STARBUCKS #123 -> STARBUCKS', normalizeMerchantToken('STARBUCKS #123'), 'STARBUCKS');
check('MCDONALDS', normalizeMerchantToken('MCDONALDS'), 'MCDONALDS');
check('MC DONALDS', normalizeMerchantToken('MC DONALDS'), 'MC DONALDS');
check("McDonald's", normalizeMerchantToken("McDonald's"), "MCDONALD'S");

// GATEWAY
console.log('\n--- GATEWAY ---');
const tcGateway1 = classifyMerchant('PAYMOB*LIMBO CAFE');
check('PAYMOB*LIMBO CAFE intent', tcGateway1.intentId, 'coffee');
check('PAYMOB*LIMBO CAFE norm', tcGateway1.normalizedMerchant, 'LIMBO CAFE');

const tcGateway2 = classifyMerchant('FAWRYPF*HANA MARKETSQAL');
check('FAWRYPF*HANA MARKETSQAL intent', tcGateway2.intentId, 'groceries');
check('FAWRYPF*HANA MARKETSQAL norm', tcGateway2.normalizedMerchant, 'HANA MARKETSQAL');
check('FAWRYPF*HANA MARKETSQAL source', tcGateway2.source, 'SEMANTIC_KEYWORD');

const tcGateway3 = classifyMerchant('PAYMOB');
check('PAYMOB intent', tcGateway3.intentId, null);
check('PAYMOB norm', tcGateway3.normalizedMerchant, 'PAYMOB');
check('PAYMOB source', tcGateway3.source, 'UNKNOWN');

const tcGateway4 = classifyMerchant('FAWRY');
check('FAWRY intent', tcGateway4.intentId, null);
check('FAWRY source', tcGateway4.source, 'UNKNOWN');

// SEMANTIC FALLBACK
console.log('\\n--- SEMANTIC FALLBACK ---');
check('COFFEE SHOP', classifyMerchant('COFFEE SHOP').intentId, 'coffee');
check('RESTAURANT', classifyMerchant('RESTAURANT').intentId, 'restaurant');
check('SUPERMARKET', classifyMerchant('SUPERMARKET').intentId, 'groceries');
check('PHARMACY', classifyMerchant('PHARMACY').intentId, 'pharmacy');
check('CAFE', classifyMerchant('CAFE').intentId, 'coffee');

// UNKNOWN
console.log('\\n--- UNKNOWN ---');
check('WAFFARHA', classifyMerchant('WAFFARHA').intentId, null);
check('XYZ8392', classifyMerchant('XYZ8392').intentId, null);
check('ABC TRADING', classifyMerchant('ABC TRADING').intentId, null);
check('UNKNOWN MERCHANT', classifyMerchant('UNKNOWN MERCHANT').intentId, null);

// FALSE POSITIVES
console.log('\\n--- FALSE POSITIVES ---');
const falsePositives = ['CURRENT', 'CAREFUL', 'BUSINESS', 'MARKETPLACE', 'MARKETING', 'RENTAL', '01012345678', '022431701746', 'REF# 226f1cc5'];
for (const fp of falsePositives) {
  check(`FP: ${fp}`, classifyMerchant(fp).intentId, null);
}

// PRECEDENCE
console.log('\\n--- PRECEDENCE ---');
// Verify global exact merchant beats semantic keyword.
// If AMAZON is a global merchant mapping, it shouldn't fall into semantic matching.
const amazonTc = classifyMerchant('AMAZON');
check('AMAZON source', amazonTc.source, 'GLOBAL_MERCHANT');

console.log(`\\n=== RESULTS: Passed: ${metrics.passed} | Failed: ${metrics.failed} ===`);
if (metrics.failed > 0) {
  console.error(issues);
  process.exit(1);
}
process.exit(0);
