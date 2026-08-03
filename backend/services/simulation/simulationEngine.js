const StateBuilder = require('./stateBuilder');
const FinancialCalculator = require('./financialCalculator');
const DecisionEvaluator = require('./DecisionEvaluator');

const scenarios = {
  purchase: require('./scenarios/purchaseScenario'),
  salary: require('./scenarios/salaryScenario'),
  budget: require('./scenarios/budgetScenario'),
  debt: require('./scenarios/debtScenario'),
  bill: require('./scenarios/billScenario'),
  recurring: require('./scenarios/recurringScenario'),
  investment: require('./scenarios/investmentScenario')
};

class SimulationEngine {
  static async runSimulation(userId, actions) {
    // 1. Build Base State
    const baseState = await StateBuilder.buildState(userId);
    
    // 2. Clone State for Simulation
    let simulatedState = StateBuilder.cloneState(baseState);
    
    // 3. Apply Actions Sequentially
    for (const action of actions) {
      const scenarioHandler = scenarios[action.type];
      if (!scenarioHandler) {
        throw new Error(`Scenario type ${action.type} is not supported.`);
      }
      simulatedState = scenarioHandler(simulatedState, action.payload);
    }
    
    // 4. Calculate Metrics
    const beforeMetrics = FinancialCalculator.calculate(baseState);
    const afterMetrics = FinancialCalculator.calculate(simulatedState);
    
    // 5. Evaluate Decision
    const evaluation = DecisionEvaluator.evaluate(beforeMetrics, afterMetrics);
    
    // 6. Generate Difference Object
    const difference = {
      balance: afterMetrics.currentBalance - beforeMetrics.currentBalance,
      savings: afterMetrics.currentSavings - beforeMetrics.currentSavings,
      budgetUsage: afterMetrics.totalBudgetSpent - beforeMetrics.totalBudgetSpent,
      debt: afterMetrics.totalDebtRemaining - beforeMetrics.totalDebtRemaining,
      netWorth: afterMetrics.netWorth - beforeMetrics.netWorth,
      investments: afterMetrics.totalInvestments - beforeMetrics.totalInvestments,
      billsCoverage: afterMetrics.unpaidBillsTotal - beforeMetrics.unpaidBillsTotal,
      cashRemaining: afterMetrics.cashRemaining - beforeMetrics.cashRemaining
    };
    
    return {
      before: beforeMetrics,
      after: afterMetrics,
      difference,
      decision: evaluation.decision,
      insights: evaluation.insights
    };
  }
}

module.exports = SimulationEngine;
