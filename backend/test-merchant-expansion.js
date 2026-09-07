const { classifyMerchant } = require('./services/merchantIntelligence/globalMerchantDictionary');

const tests = [
  { input: "STARBUCKS", expected: "coffee" },
  { input: "PAYMOB*STARBUCKS MAADI", expected: "coffee" },
  { input: "UBER RIDES", expected: "transportation" },
  { input: "KFC EGYPT", expected: "fast_food" },
  { input: "FAWRY", expected: "bills" },
  { input: "AMAZON EG", expected: "shopping" },
  { input: "AMAZONXYZ", expected: null },
  { input: "PAYMOB", expected: null },
  { input: "PAYTABS", expected: null },
  { input: "CARREFOUR", expected: "groceries" },
  { input: "SPINNEYS 123", expected: "groceries" }
];

let failed = 0;
tests.forEach(t => {
  const res = classifyMerchant(t.input);
  if (res.intentId !== t.expected) {
    console.error(`❌ FAILED: "${t.input}" -> Expected: ${t.expected}, Got: ${res.intentId}`);
    failed++;
  } else {
    console.log(`✅ PASSED: "${t.input}" -> ${res.intentId}`);
  }
});

if (failed > 0) process.exit(1);
console.log('All merchant tests passed.');
