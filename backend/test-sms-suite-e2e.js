/**
 * End-to-End Test Suite for SMS Auto-Logging Enhancements
 * 
 * Verifies:
 * 1. Bank SMS Parsing & Feature Extraction (test-sms-parser-full.js)
 * 2. Multi-Card Account Resolver (test-multi-card-resolver.js)
 * 3. Promotional SMS Filtering (test-sms-promo-filter.js)
 * 4. Local Merchant Knowledge API (test-merchant-knowledge-api.js)
 * 5. Smart Bill Auto-Reconciliation (test-bill-sms-reconciliation.js)
 * 6. Non-Destructive Transfer Queue Reconciliation (test-transfer-holding-mock.js)
 */

const { execSync } = require('child_process');
const path = require('path');

const testSuites = [
  { name: 'Full Bank SMS Parser Suite (28 cases)', file: 'test-sms-parser-full.js' },
  { name: 'Multi-Card Account Resolver', file: 'test-multi-card-resolver.js' },
  { name: 'Promotional / Marketing SMS Filter', file: 'test-sms-promo-filter.js' },
  { name: 'Merchant Knowledge API Endpoints', file: 'test-merchant-knowledge-api.js' },
  { name: 'Smart Bill Auto-Reconciliation Engine', file: 'test-bill-sms-reconciliation.js' },
  { name: 'Transfer Candidate Holding Queue & Reconciliation', file: 'test-transfer-holding-mock.js' }
];

console.log('================================================================');
console.log('🚀 Running Finova SMS Engine End-to-End Regression Test Suite');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

for (const suite of testSuites) {
  process.stdout.write(`▶ Running: ${suite.name}... `);
  const suitePath = path.join(__dirname, suite.file);
  try {
    const output = execSync(`node "${suitePath}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log('✅ PASS');
    passed++;
  } catch (err) {
    console.log('❌ FAIL');
    console.error(`\nError in ${suite.file}:`);
    console.error(err.stdout || err.stderr || err.message);
    failed++;
  }
}

console.log('\n================================================================');
console.log(`Results: ${passed} passed, ${failed} failed out of ${testSuites.length} test suites.`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Finova SMS enhancements verified with zero regressions!');
  process.exit(0);
}
