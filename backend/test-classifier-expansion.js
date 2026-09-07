const { classifyCategoryIntent } = require('./services/categoryIntentClassifier');

const tests = [
  // English
  { input: "My Family", expected: "family" },
  { input: "My Family Expenses", expected: "family" },
  { input: "My Groceries", expected: "groceries" },
  { input: "Coffee Money", expected: "coffee" },
  { input: "My Transport", expected: "transportation" },
  { input: "Kids Expenses", expected: "children" },
  { input: "My Stuff", expected: null },

  // Arabic
  { input: "العيلة", expected: "family" },
  { input: "عيلتي", expected: "family" },
  { input: "الأسرة", expected: "family" },
  { input: "مصاريف العيلة", expected: "family" },
  { input: "قهوة", expected: "coffee" },
  { input: "مواصلات", expected: "transportation" },
  { input: "مقاضي البيت", expected: "groceries" },
  { input: "ولادي", expected: "children" },

  // Franco-Arabic
  { input: "3eila", expected: "family" },
  { input: "3eilty", expected: "family" },
  { input: "3aylty", expected: "family" },
  { input: "masareef el 3eila", expected: "family" },
  { input: "akl", expected: "food_and_drink" },
  { input: "ahwa", expected: "coffee" },
  { input: "2ahwa", expected: "coffee" },
  { input: "mwaslat", expected: "transportation" },
  { input: "m2adey", expected: "groceries" },
  { input: "3yal", expected: "children" },
  { input: "ta7weesh", expected: "savings" },
  { input: "sada2a", expected: "charity" },
  { input: "egar", expected: "rent" },

  // Mixed
  { input: "My Akl", expected: "food_and_drink" },
  { input: "My Family", expected: "family" },
  { input: "Coffee Masareef", expected: "coffee" },
  { input: "My Mwaslat", expected: "transportation" },
  { input: "Groceries el Beet", expected: "groceries" },
  { input: "Masareef el 3eila", expected: "family" },

  // Ambiguous
  { input: "My Stuff", expected: null },
  { input: "Stuff", expected: null },
  { input: "Personal", expected: null },
  { input: "Money", expected: null },
  { input: "Expenses", expected: null },
  { input: "Misc", expected: null }
];

let failed = 0;
let passed = 0;

tests.forEach(t => {
  const result = classifyCategoryIntent(t.input);
  if (result !== t.expected) {
    console.error(`❌ FAILED: "${t.input}" -> Expected: ${t.expected}, Got: ${result}`);
    failed++;
  } else {
    console.log(`✅ PASSED: "${t.input}" -> ${result}`);
    passed++;
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed successfully!');
}
