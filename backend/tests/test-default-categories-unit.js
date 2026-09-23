const { classifyCategoryIntent } = require('../services/categoryIntentClassifier');

const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'income', expectedIntent: 'salary' },
  { name: 'Bonus', type: 'income', expectedIntent: 'salary' },
  { name: 'Investment', type: 'income', expectedIntent: 'investment_income' },
  { name: 'Food', type: 'expense', expectedIntent: 'food_and_drink' },
  { name: 'Transport', type: 'expense', expectedIntent: 'transportation' },
  { name: 'Bills', type: 'expense', expectedIntent: 'bills' },
  { name: 'Entertainment', type: 'expense', expectedIntent: 'entertainment' },
  { name: 'Health', type: 'expense', expectedIntent: 'healthcare' },
  { name: 'Shopping', type: 'expense', expectedIntent: 'shopping' },
  { name: 'Education', type: 'expense', expectedIntent: 'education' },
  { name: 'Other', type: 'expense', expectedIntent: 'other' }
];

console.log('--- Testing Default Categories Intent Resolution (PURE IN-MEMORY, ZERO DB) ---');
let allPassed = true;

for (const cat of DEFAULT_CATEGORIES) {
  const resolved = classifyCategoryIntent(cat.name);
  const ok = resolved === cat.expectedIntent;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] "${cat.name}" -> ${resolved} (Expected: ${cat.expectedIntent})`);
  if (!ok) allPassed = false;
}

if (allPassed) {
  console.log('\n🎉 ALL DEFAULT CATEGORIES RESOLVE PERFECTLY!');
  process.exit(0);
} else {
  console.error('\n❌ SOME FAILED!');
  process.exit(1);
}
