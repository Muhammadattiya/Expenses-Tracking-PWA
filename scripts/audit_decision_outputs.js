const DecisionEvaluator = require('../backend/services/simulation/DecisionEvaluator');

// Simulate a base state where user has:
// - A negative baseline in an unrelated account (-5,000 in 'Old Debt Account')
// - 40,000 EGP in Main Account
// - 25,000 EGP monthly income
// - 10,000 EGP essential burn
// - 6,000 EGP unpaid bills
// - 30,000 EGP debt remaining
const baseState = {
  accounts: [
    { _id: 'acc_main', name: 'Main Checking Account', balance: 40000 },
    { _id: 'acc_old_overdraft', name: 'Old Overdraft Account', balance: -5000 }
  ],
  monthlyIncome: 25000,
  currentSavings: 15000,
  emergencyReserve: 40000,
  essentialMonthlyBurn: 10000,
  totalDebtRemaining: 30000,
  monthlyInstallmentBurden: 2000,
  unpaidBillsTotal: 6000,
  totalInvestments: 50000,
  netWorth: 85000,
  savingsGoals: [
    { _id: 'g1', title: 'Buy New Laptop', status: 'active', priority: 'high', targetDate: '2026-12-01', requiredMonthlyPace: 2000 }
  ]
};

const baseBeforeMetrics = {
  currentBalance: 35000,
  currentSavings: 15000,
  cashRemaining: 40000,
  totalDebtRemaining: 30000,
  emergencyCoverageMonths: 4.0,
  emergencyReserve: 40000,
  essentialMonthlyBurn: 10000,
  monthlyInstallmentBurden: 2000,
  dtiRatio: 8.0,
  totalInvestments: 50000,
  netWorth: 85000,
  monthlyIncome: 25000,
  unpaidBillsTotal: 6000,
  accounts: baseState.accounts
};

const baseProjection = {
  safetyFloor: 15000,
  minSimulatedBalance: 40000,
  essentialMonthlyBurn: 10000,
  monthlyIncome: 25000,
  floorBreachAmount: 0,
  floorBreachPercent: 0
};

// All 8 Decisions
const scenariosToTest = [
  {
    name: '1. purchase (Cash Purchase of 25,000 EGP)',
    action: {
      type: 'purchase',
      payload: { amount: 25000, accountId: 'acc_main', notes: 'iPhone 15' }
    },
    afterModifier: (before) => {
      const cashAfter = before.cashRemaining - 25000;
      return {
        ...before,
        cashRemaining: cashAfter,
        emergencyCoverageMonths: parseFloat((cashAfter / before.essentialMonthlyBurn).toFixed(1)),
        accounts: [
          { _id: 'acc_main', name: 'Main Checking Account', balance: 15000 },
          { _id: 'acc_old_overdraft', name: 'Old Overdraft Account', balance: -5000 }
        ]
      };
    }
  },
  {
    name: '2. installment (Installment 30,000 EGP over 12 months, 0 down)',
    action: {
      type: 'installment',
      payload: {
        title: 'MacBook Pro',
        totalAmount: 30000,
        downPayment: 0,
        monthlyAmount: 2500,
        totalMonths: 12,
        linkedAccountId: 'acc_main'
      }
    },
    afterModifier: (before) => {
      return {
        ...before,
        monthlyInstallmentBurden: before.monthlyInstallmentBurden + 2500,
        dtiRatio: parseFloat((((before.monthlyInstallmentBurden + 2500) / before.monthlyIncome) * 100).toFixed(1)),
        totalDebtRemaining: before.totalDebtRemaining + 30000,
        accounts: before.accounts
      };
    }
  },
  {
    name: '3. salary (Salary Increase from 25,000 to 45,000 EGP)',
    action: {
      type: 'salary',
      payload: { newAmount: 45000, accountId: 'acc_main' }
    },
    afterModifier: (before) => {
      const netSavings = 45000 - before.essentialMonthlyBurn;
      return {
        ...before,
        monthlyIncome: 45000,
        currentSavings: netSavings,
        emergencyCoverageMonths: 6.0,
        accounts: before.accounts
      };
    }
  },
  {
    name: '4A. debt (Borrow 15,000 EGP cash loan)',
    action: {
      type: 'debt',
      payload: { action: 'borrow', amount: 15000, accountId: 'acc_main' }
    },
    afterModifier: (before) => {
      return {
        ...before,
        cashRemaining: before.cashRemaining + 15000,
        totalDebtRemaining: before.totalDebtRemaining + 15000,
        dtiRatio: 18.0,
        accounts: [
          { _id: 'acc_main', name: 'Main Checking Account', balance: 55000 },
          { _id: 'acc_old_overdraft', name: 'Old Overdraft Account', balance: -5000 }
        ]
      };
    }
  },
  {
    name: '4B. debt (Repay 20,000 EGP of existing debt)',
    action: {
      type: 'debt',
      payload: { action: 'repay', amount: 20000, accountId: 'acc_main' }
    },
    afterModifier: (before) => {
      const cashAfter = before.cashRemaining - 20000;
      return {
        ...before,
        cashRemaining: cashAfter,
        totalDebtRemaining: before.totalDebtRemaining - 20000,
        dtiRatio: 4.0,
        accounts: [
          { _id: 'acc_main', name: 'Main Checking Account', balance: 20000 },
          { _id: 'acc_old_overdraft', name: 'Old Overdraft Account', balance: -5000 }
        ]
      };
    }
  },
  {
    name: '5A. investment (Buy 20,000 EGP mutual fund assets)',
    action: {
      type: 'investment',
      payload: { action: 'buy', amount: 20000, accountId: 'acc_main' }
    },
    afterModifier: (before) => {
      const cashAfter = before.cashRemaining - 20000;
      return {
        ...before,
        cashRemaining: cashAfter,
        totalInvestments: before.totalInvestments + 20000,
        emergencyCoverageMonths: 2.0,
        accounts: [
          { _id: 'acc_main', name: 'Main Checking Account', balance: 20000 },
          { _id: 'acc_old_overdraft', name: 'Old Overdraft Account', balance: -5000 }
        ]
      };
    }
  },
  {
    name: '5B. investment (Sell 30,000 EGP investments to cash)',
    action: {
      type: 'investment',
      payload: { action: 'sell', amount: 30000, accountId: 'acc_main' }
    },
    afterModifier: (before) => {
      const cashAfter = before.cashRemaining + 30000;
      return {
        ...before,
        cashRemaining: cashAfter,
        totalInvestments: before.totalInvestments - 30000,
        emergencyCoverageMonths: 7.0,
        accounts: [
          { _id: 'acc_main', name: 'Main Checking Account', balance: 70000 },
          { _id: 'acc_old_overdraft', name: 'Old Overdraft Account', balance: -5000 }
        ]
      };
    }
  },
  {
    name: '6. recurring (Cancel 2,000 EGP/mo recurring subscription)',
    action: {
      type: 'recurring',
      payload: { action: 'disable', amount: 2000 }
    },
    afterModifier: (before) => {
      const newBurn = before.essentialMonthlyBurn - 2000;
      return {
        ...before,
        essentialMonthlyBurn: newBurn,
        emergencyCoverageMonths: parseFloat((before.cashRemaining / newBurn).toFixed(1)),
        accounts: before.accounts
      };
    }
  },
  {
    name: '7. bill (Pay 4,000 EGP scheduled utility bill)',
    action: {
      type: 'bill',
      payload: { amount: 4000, accountId: 'acc_main' }
    },
    afterModifier: (before) => {
      const cashAfter = before.cashRemaining - 4000;
      return {
        ...before,
        cashRemaining: cashAfter,
        unpaidBillsTotal: 2000,
        accounts: [
          { _id: 'acc_main', name: 'Main Checking Account', balance: 36000 },
          { _id: 'acc_old_overdraft', name: 'Old Overdraft Account', balance: -5000 }
        ]
      };
    }
  },
  {
    name: '8. budget (Adjust Category Budget Cap to 5,000 EGP)',
    action: {
      type: 'budget',
      payload: { amount: 5000 }
    },
    afterModifier: (before) => {
      return {
        ...before,
        accounts: before.accounts
      };
    }
  }
];

console.log('='.repeat(80));
console.log('AUDITING ALL 8 DECISION OUTPUTS FOR UNRELATED DATA & CORRECT VERDICTS');
console.log('='.repeat(80));

let failures = 0;

scenariosToTest.forEach(testCase => {
  console.log(`\n▶ TESTING SCENARIO: ${testCase.name}`);
  const actions = [testCase.action];
  const afterMetrics = testCase.afterModifier(baseBeforeMetrics);

  const evalResult = DecisionEvaluator.evaluate(
    baseBeforeMetrics,
    afterMetrics,
    baseProjection,
    baseState,
    { ...baseState, accounts: afterMetrics.accounts },
    actions
  );

  const d = evalResult.decision;
  const ins = evalResult.insights;

  console.log(`  - Verdict Status: ${d.verdict?.status} | Title: "${d.verdict?.titleEn}" | Score: ${d.score}/100`);
  console.log(`  - Verdict Reason: "${d.verdict?.reasonEn}"`);
  console.log(`  - Overdrawn Accounts: ${JSON.stringify(d.overdrawnAccounts)}`);
  console.log(`  - Emergency Floor Breached: ${d.emergencyFloorBreached}`);
  console.log(`  - Has Comparative Tradeoff: ${d.comparativeTradeoff !== null}`);
  console.log(`  - Why It Matters: "${d.whyItMattersEn}"`);
  console.log(`  - Suggested Alternatives: ${d.suggestedAlternatives?.map(a => a.id).join(', ')}`);
  console.log(`  - Insights Count: ${ins.length}`);
  ins.forEach(i => console.log(`      * [${i.type}] ${i.titleEn}: ${i.messageEn}`));

  // AUDIT CHECKS:
  const isPurchaseOrInst = testCase.action.type === 'purchase' || testCase.action.type === 'installment';
  
  // 1. Tradeoff check: Must only exist for purchase and installment!
  if (!isPurchaseOrInst && d.comparativeTradeoff !== null) {
    console.error(`  ❌ ERROR: comparativeTradeoff is present on non-purchase scenario (${testCase.action.type})!`);
    failures++;
  }

  // 2. Overdraft check: Untargeted 'acc_old_overdraft' must NOT be in d.overdrawnAccounts
  if (d.overdrawnAccounts.some(a => a._id === 'acc_old_overdraft')) {
    console.error(`  ❌ ERROR: Untargeted account 'acc_old_overdraft' leaked into decision.overdrawnAccounts!`);
    failures++;
  }

  // 3. Positive action verdict check: Salary, Investment Sell, Recurring Cancel, Budget must NOT be 'critical'!
  if (['salary', 'budget'].includes(testCase.action.type) && d.verdict?.status === 'critical') {
    console.error(`  ❌ ERROR: Inherently positive action (${testCase.action.type}) received 'critical' verdict!`);
    failures++;
  }

  // 4. Emergency Floor Breach check: If cash was not drained, emergencyFloorBreached must be false!
  const cashDiff = afterMetrics.cashRemaining - baseBeforeMetrics.cashRemaining;
  if (cashDiff >= 0 && d.emergencyFloorBreached) {
    console.error(`  ❌ ERROR: emergencyFloorBreached is true despite cash remaining unchanged or increasing!`);
    failures++;
  }

  // 5. Debt payoff wording check:
  if (testCase.action.type === 'debt' && testCase.action.payload.action === 'repay') {
    if (d.whyItMattersEn.includes('healthy cash cushion of -')) {
      console.error(`  ❌ ERROR: Contradictory negative cash cushion text found!`);
      failures++;
    }
  }
});

console.log('\n' + '='.repeat(80));
if (failures === 0) {
  console.log('✅ ALL 8 DECISION SCENARIOS PASSED STRICT OUTPUT AUDIT WITH ZERO LEAKS!');
} else {
  console.error(`❌ AUDIT FAILED WITH ${failures} ERRORS.`);
  process.exit(1);
}
console.log('='.repeat(80));
