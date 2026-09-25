const StateBuilder = require('./stateBuilder');
const FinancialCalculator = require('./financialCalculator');
const DecisionEvaluator = require('./DecisionEvaluator');
const ProjectionEngine = require('./projectionEngine');

const scenarios = {
  purchase: require('./scenarios/purchaseScenario'),
  salary: require('./scenarios/salaryScenario'),
  budget: require('./scenarios/budgetScenario'),
  debt: require('./scenarios/debtScenario'),
  bill: require('./scenarios/billScenario'),
  recurring: require('./scenarios/recurringScenario'),
  investment: require('./scenarios/investmentScenario'),
  installment: require('./scenarios/installmentScenario')
};

class SimulationEngine {
  static async runSimulation(userId, actions, options = {}) {
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
    
    // 4. Calculate Current Snapshot Metrics
    const beforeMetrics = FinancialCalculator.calculate(baseState);
    const afterMetrics = FinancialCalculator.calculate(simulatedState);
    
    // 5. Compute Forward Trajectory Projection (3, 6, or 12 months)
    const horizonMonths = options.horizonMonths || 6;
    const projection = ProjectionEngine.projectTrajectory(baseState, simulatedState, horizonMonths);

    // 6. Evaluate Decision with Verdict Matrix & Trade-offs
    const evaluation = DecisionEvaluator.evaluate(beforeMetrics, afterMetrics, projection, baseState, simulatedState, actions);
    
    // 7. Generate Difference Object
    const difference = {
      balance: afterMetrics.currentBalance - beforeMetrics.currentBalance,
      savings: afterMetrics.currentSavings - beforeMetrics.currentSavings,
      budgetUsage: afterMetrics.totalBudgetSpent - beforeMetrics.totalBudgetSpent,
      debt: afterMetrics.totalDebtRemaining - beforeMetrics.totalDebtRemaining,
      installmentsBurden: afterMetrics.monthlyInstallmentBurden - beforeMetrics.monthlyInstallmentBurden,
      installmentObligations: afterMetrics.totalInstallmentObligations - beforeMetrics.totalInstallmentObligations,
      emergencyReserve: afterMetrics.emergencyReserve - beforeMetrics.emergencyReserve,
      emergencyCoverage: Number((afterMetrics.emergencyCoverageMonths - beforeMetrics.emergencyCoverageMonths).toFixed(1)),
      dtiRatio: (afterMetrics.dtiRatio !== null && beforeMetrics.dtiRatio !== null) ? Number((afterMetrics.dtiRatio - beforeMetrics.dtiRatio).toFixed(1)) : null,
      essentialBurn: afterMetrics.essentialMonthlyBurn - beforeMetrics.essentialMonthlyBurn,
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
      insights: evaluation.insights,
      projection,
      actions
    };
  }
}

module.exports = SimulationEngine;
