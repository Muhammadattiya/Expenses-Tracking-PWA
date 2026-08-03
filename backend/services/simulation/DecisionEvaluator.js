class DecisionEvaluator {
  static evaluate(before, after) {
    const decision = {};
    const insights = [];

    // 1. Cash Impact %
    const cashBefore = before.cashRemaining || 0;
    const cashAfter = after.cashRemaining || 0;
    const cashDiff = cashAfter - cashBefore;
    decision.cashImpact = cashBefore > 0 ? Math.round((cashDiff / cashBefore) * 100) : (cashDiff > 0 ? 100 : (cashDiff < 0 ? -100 : 0));

    // 2. Budget Impact %
    const budgetBefore = before.totalBudgetSpent || 0;
    const budgetAfter = after.totalBudgetSpent || 0;
    const budgetDiff = budgetAfter - budgetBefore;
    decision.budgetImpact = budgetBefore > 0 ? Math.round((budgetDiff / budgetBefore) * 100) : (budgetDiff > 0 ? 100 : (budgetDiff < 0 ? -100 : 0));

    // 3. Debt Impact %
    const debtBefore = before.totalDebtRemaining || 0;
    const debtAfter = after.totalDebtRemaining || 0;
    const debtDiff = debtAfter - debtBefore;
    decision.debtImpact = debtBefore > 0 ? Math.round((debtDiff / debtBefore) * 100) : (debtDiff > 0 ? 100 : (debtDiff < 0 ? -100 : 0));

    // 4. Bills Safety
    decision.billsSafe = cashAfter >= 0; 
    if (!decision.billsSafe) {
      insights.push({ type: 'critical', title: 'Bills Coverage Alert', message: 'You will not have enough cash to cover pending bills.' });
    }

    // 5. Emergency Fund Coverage (Months)
    // Using true monthly fixed expenses calculated from active bills and recurring transactions
    const fixedExpensesProxy = (before.monthlyFixedExpenses > 0 ? before.monthlyFixedExpenses : 1000); 
    const coverage = cashAfter / fixedExpensesProxy;
    decision.emergencyCoverageMonths = Math.max(0, parseFloat(coverage.toFixed(1)));

    // 6. Liquidity Score (0 - 100)
    let liquidity = 100;
    if (cashAfter < 0) {
      liquidity = 0;
    } else {
      if (decision.emergencyCoverageMonths < 1) liquidity = 20;
      else if (decision.emergencyCoverageMonths < 3) liquidity = 50;
      else if (decision.emergencyCoverageMonths < 6) liquidity = 80;
    }
    decision.liquidityScore = liquidity;

    // 7. Spending Flexibility
    if (liquidity >= 80) decision.spendingFlexibility = 'High';
    else if (liquidity >= 50) decision.spendingFlexibility = 'Medium';
    else decision.spendingFlexibility = 'Low';

    // 8. Budget Stability
    if (decision.budgetImpact > 20) decision.budgetStability = 'Critical';
    else if (decision.budgetImpact > 5) decision.budgetStability = 'Warning';
    else decision.budgetStability = 'Stable';

    // 9. Financial Stress
    let stressScore = 0;
    if (!decision.billsSafe) stressScore += 50;
    if (decision.debtImpact > 10) stressScore += 20;
    if (decision.budgetStability === 'Critical') stressScore += 20;
    if (decision.emergencyCoverageMonths < 1) stressScore += 10;

    if (stressScore >= 80) decision.financialStress = 'Critical';
    else if (stressScore >= 50) decision.financialStress = 'High';
    else if (stressScore >= 30) decision.financialStress = 'Medium';
    else if (stressScore >= 10) decision.financialStress = 'Low';
    else decision.financialStress = 'Very Low';

    // 10. Decision Score (0 - 100)
    let score = 100;
    score -= (stressScore * 0.8);
    // Positive impact factors
    if (decision.cashImpact > 0) score += Math.min(decision.cashImpact, 20);
    if (decision.debtImpact < 0) score += Math.min(Math.abs(decision.debtImpact), 20);
    
    score = Math.max(0, Math.min(100, Math.round(score)));
    decision.score = score;

    // 11. Overall Risk
    if (cashAfter < 0 || decision.budgetStability === 'Critical') {
      decision.risk = 'Critical';
    } else if (stressScore >= 80 || score < 40) {
      decision.risk = 'High';
    } else if (stressScore >= 50 || score < 60) {
      decision.risk = 'Medium';
    } else if (stressScore >= 30 || score < 80) {
      decision.risk = 'Low';
    } else {
      decision.risk = 'Very Low';
    }

    // Insights
    if (after.currentBalance < 0) {
      insights.push({ type: 'critical', title: 'Account Overdraft', message: 'This simulation forces your overall balance below zero.' });
    }
    
    if (decision.cashImpact > 0) {
       insights.push({ type: 'good', title: 'Increased Cash', message: `Available cash increased by ${decision.cashImpact}%.` });
    } else if (decision.cashImpact < 0) {
       insights.push({ type: 'warning', title: 'Decreased Cash', message: `Available cash decreased by ${Math.abs(decision.cashImpact)}%.` });
    }

    return { decision, insights };
  }
}

module.exports = DecisionEvaluator;
