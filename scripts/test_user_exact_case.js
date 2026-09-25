import DecisionEvaluator from '../backend/services/simulation/DecisionEvaluator.js';

console.log('='.repeat(70));
console.log('VERIFYING APPROVED RESILIENCE EQUATIONS & BILINGUAL HINTS');
console.log('='.repeat(70));

// Test Case 1: The user's exact case (Simple 500 EGP cash purchase)
// Available cash: 12,000 EGP, Burn: 4,000 EGP/mo.
const before1 = {
  accounts: [{ _id: 'acc1', name: 'الحساب الجاري', balance: 12000, excludeFromTotal: false }],
  cashRemaining: 12000,
  emergencyReserve: 12000,
  emergencyCoverageMonths: 3.0,
  essentialMonthlyBurn: 4000,
  currentSavings: 2000,
  monthlyIncome: 6000,
  totalDebtRemaining: 0,
  monthlyInstallmentBurden: 0,
  unpaidBillsTotal: 0
};

const after1 = {
  accounts: [{ _id: 'acc1', name: 'الحساب الجاري', balance: 11500, excludeFromTotal: false }],
  cashRemaining: 11500,
  emergencyReserve: 11500,
  emergencyCoverageMonths: 2.87,
  essentialMonthlyBurn: 4000,
  currentSavings: 2000,
  monthlyIncome: 6000,
  totalDebtRemaining: 0,
  monthlyInstallmentBurden: 0,
  unpaidBillsTotal: 0
};

const action1 = {
  type: 'purchase',
  payload: {
    notes: 'مشتريات بسيطة',
    amount: 500,
    accountId: 'acc1'
  }
};

const result1 = DecisionEvaluator.evaluate(
  before1,
  after1,
  null,
  { profile: { monthlyIncome: 6000, essentialExpenses: 4000, savingsTarget: 1000 } },
  null,
  [action1]
);

console.log('\n▶ Case 1: Simple 500 EGP purchase:');
console.log('  Verdict Status:', result1.decision.verdict.status);
console.log('  Verdict Title:', result1.decision.verdict.titleAr, '/', result1.decision.verdict.titleEn);
console.log('  Resilience Score:', result1.decision.score + '/100');
console.log('  Score Breakdown Factors Count:', result1.decision.scoreBreakdown.factors.length);
console.log('  Metric Hints Keys:', Object.keys(result1.decision.metricHints));
console.log('  Card 1 Hint (AR):', result1.decision.metricHints.card1.hintAr);
console.log('  Card 1 Hint (EN):', result1.decision.metricHints.card1.hintEn);

if (result1.decision.score >= 80 && result1.decision.verdict.status === 'safe') {
  console.log('  ✅ Case 1 Passed! Simple purchase is SAFE with high score.');
} else {
  console.error('  ❌ Case 1 Failed!', result1.decision.score, result1.decision.verdict.status);
  process.exit(1);
}

// Test Case 2: Catastrophic 30,000 EGP overdraft on a 5,000 EGP account
const before2 = {
  accounts: [{ _id: 'acc1', name: 'الحساب الجاري', balance: 5000, excludeFromTotal: false }],
  cashRemaining: 5000,
  emergencyReserve: 5000,
  emergencyCoverageMonths: 1.0,
  essentialMonthlyBurn: 5000,
  currentSavings: 0,
  monthlyIncome: 5000,
  totalDebtRemaining: 0,
  monthlyInstallmentBurden: 0,
  unpaidBillsTotal: 0
};

const after2 = {
  accounts: [{ _id: 'acc1', name: 'الحساب الجاري', balance: -25000, excludeFromTotal: false }],
  cashRemaining: -25000,
  emergencyReserve: 0,
  emergencyCoverageMonths: 0,
  essentialMonthlyBurn: 5000,
  currentSavings: -25000,
  monthlyIncome: 5000,
  totalDebtRemaining: 0,
  monthlyInstallmentBurden: 0,
  unpaidBillsTotal: 0
};

const action2 = {
  type: 'purchase',
  payload: {
    notes: 'شراء ضخم يفوق الرصيد',
    amount: 30000,
    accountId: 'acc1'
  }
};

const result2 = DecisionEvaluator.evaluate(
  before2,
  after2,
  null,
  { profile: { monthlyIncome: 5000, essentialExpenses: 5000 } },
  null,
  [action2]
);

console.log('\n▶ Case 2: Severe 30,000 EGP Overdraft Purchase:');
console.log('  Verdict Status:', result2.decision.verdict.status);
console.log('  Verdict Title:', result2.decision.verdict.titleAr);
console.log('  Resilience Score:', result2.decision.score + '/100');
console.log('  Score Breakdown Factors:', result2.decision.scoreBreakdown.factors.map(f => `${f.titleAr}: ${f.points} pts`));

if (result2.decision.score <= 30 && result2.decision.verdict.status === 'critical') {
  console.log('  ✅ Case 2 Passed! Severe overdraft accurately penalized as CRITICAL.');
} else {
  console.error('  ❌ Case 2 Failed!', result2.decision.score, result2.decision.verdict.status);
  process.exit(1);
}

console.log('\n' + '='.repeat(70));
console.log('🎉 ALL EQUATION TESTS PASSED PERFECTLY!');
console.log('='.repeat(70));
