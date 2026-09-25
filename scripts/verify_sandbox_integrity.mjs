import FinancialCalculator from '../backend/services/simulation/financialCalculator.js';
import ProjectionEngine from '../backend/services/simulation/projectionEngine.js';
import DecisionEvaluator from '../backend/services/simulation/DecisionEvaluator.js';

console.log('--- 1. Testing Zero Phantom Income Integrity ---');
const baseStateZeroIncome = {
  accounts: [
    { _id: 'acc_1', name: 'Main Account', balance_adjustment: 20000, excludeFromTotal: false }
  ],
  transactions: [],
  budgets: [],
  debts: [],
  bills: [],
  recurring: [],
  investments: [],
  userMonthlyIncome: 0,
  emergencyFund: { targetAmount: 15000, currentReserveAmount: 20000 }
};

const metricsBefore = FinancialCalculator.calculate(baseStateZeroIncome);
console.log('metricsBefore.monthlyIncome:', metricsBefore.monthlyIncome);
console.log('metricsBefore.dtiRatio:', metricsBefore.dtiRatio);
if (metricsBefore.monthlyIncome !== 0) throw new Error('Expected monthlyIncome to be 0');
if (metricsBefore.dtiRatio !== null) throw new Error('Expected dtiRatio to be null when income is 0');

console.log('--- 2. Testing Trajectory Projection & minPoint Tracking ---');
const simulatedState = {
  ...baseStateZeroIncome,
  accounts: [
    { _id: 'acc_1', name: 'Main Account', calculatedBalance: 5000, excludeFromTotal: false }
  ],
  installments: [
    {
      _id: 'inst_1',
      title: 'Phone',
      totalAmount: 30000,
      downPayment: 6000,
      monthlyAmount: 2500,
      totalMonths: 12,
      paidMonths: 0,
      dueDayOfMonth: 15,
      status: 'active'
    }
  ]
};

const projection = ProjectionEngine.projectTrajectory(baseStateZeroIncome, simulatedState, 6);
console.log('Projection minSimulatedBalance:', projection.minSimulatedBalance);
console.log('Projection minPoint:', projection.minPoint);
if (!projection.minPoint || projection.minPoint.balance === undefined || !projection.minPoint.date) {
  throw new Error('Expected minPoint to contain date and balance');
}

console.log('--- 3. Testing Per-Account Overdraft Detection & Decision Verdict ---');
const simulatedOverdraftState = {
  ...baseStateZeroIncome,
  transactions: [
    { type: 'expense', amount: 25000, account: 'acc_1' }
  ]
};
const metricsAfterOverdraft = FinancialCalculator.calculate(simulatedOverdraftState);

const evalResult = DecisionEvaluator.evaluate(
  metricsBefore,
  metricsAfterOverdraft,
  projection,
  baseStateZeroIncome,
  simulatedOverdraftState,
  [{ type: 'purchase', payload: { amount: 25000, accountId: 'acc_1' } }]
);

console.log('Decision Verdict Status:', evalResult.decision.verdict.status);
console.log('Decision Verdict TitleAr:', evalResult.decision.verdict.titleAr);
console.log('Overdrawn Accounts:', evalResult.decision.overdrawnAccounts);

if (evalResult.decision.verdict.status !== 'critical') {
  throw new Error('Expected status to be critical due to overdraft');
}
if (!evalResult.decision.overdrawnAccounts || evalResult.decision.overdrawnAccounts.length === 0) {
  throw new Error('Expected overdrawnAccounts to be detected');
}

console.log('--- 4. Testing Financing Markup Calculation ---');
const evalInstallment = DecisionEvaluator.evaluate(
  metricsBefore,
  metricsBefore,
  projection,
  baseStateZeroIncome,
  simulatedState,
  [{
    type: 'installment',
    payload: {
      totalAmount: 30000,
      downPayment: 6000,
      monthlyAmount: 2500,
      totalMonths: 12
    }
  }]
);
// Down payment: 6000 + (2500 * 12 = 30000) = 36000 total. Markup = 36000 - 30000 = 6000
console.log('Financing Markup:', evalInstallment.decision.financingMarkup);
if (evalInstallment.decision.financingMarkup !== 6000) {
  throw new Error(`Expected financingMarkup to be 6000, got ${evalInstallment.decision.financingMarkup}`);
}

console.log('\n>>> ALL FINANCIAL INTEGRITY TESTS PASSED SUCCESSFULLY! <<<');
