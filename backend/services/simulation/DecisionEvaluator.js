/**
 * DecisionEvaluator: Synthesizes simulation outcomes into actionable human verdicts,
 * exact recovery days, emergency floor breach analyses, and goal delay trade-offs.
 */

class DecisionEvaluator {
  /**
   * Evaluates baseline metrics, simulated metrics, and forward trajectory projections.
   * @param {Object} before - Metrics before simulation
   * @param {Object} after - Metrics after simulation
   * @param {Object} projection - Trajectory projection from ProjectionEngine
   * @param {Object} baseState - Raw state before simulation
   * @param {Object} simulatedState - Raw state after simulation
   */
  static evaluate(before, after, projection = null, baseState = null, simulatedState = null) {
    const decision = {};
    const insights = [];

    // 1. Cash, Budget & Debt Impacts
    const cashBefore = before.cashRemaining || 0;
    const cashAfter = after.cashRemaining || 0;
    const cashDiff = cashAfter - cashBefore;
    decision.cashImpact = cashBefore > 0 
      ? Math.round((cashDiff / cashBefore) * 100) 
      : (cashDiff > 0 ? 100 : (cashDiff < 0 ? -100 : 0));

    const budgetBefore = before.totalBudgetSpent || 0;
    const budgetAfter = after.totalBudgetSpent || 0;
    const budgetDiff = budgetAfter - budgetBefore;
    decision.budgetImpact = budgetBefore > 0 
      ? Math.round((budgetDiff / budgetBefore) * 100) 
      : (budgetDiff > 0 ? 100 : (budgetDiff < 0 ? -100 : 0));

    const debtBefore = before.totalDebtRemaining || 0;
    const debtAfter = after.totalDebtRemaining || 0;
    const debtDiff = debtAfter - debtBefore;
    decision.debtImpact = debtBefore > 0 
      ? Math.round((debtDiff / debtBefore) * 100) 
      : (debtDiff > 0 ? 100 : (debtDiff < 0 ? -100 : 0));

    // 2. Bills Safety
    decision.billsSafe = cashAfter >= 0;

    // 3. Emergency Coverage & Burn Rate
    const essentialBurn = after.essentialMonthlyBurn || projection?.essentialMonthlyBurn || 6000;
    const coverage = after.emergencyCoverageMonths !== undefined 
      ? after.emergencyCoverageMonths 
      : (essentialBurn > 0 ? parseFloat((cashAfter / essentialBurn).toFixed(1)) : 0);
    decision.emergencyCoverageMonths = coverage;
    decision.emergencyCoverageMonthsBefore = before.emergencyCoverageMonths || 0;
    decision.emergencyCoverageMonthsAfter = after.emergencyCoverageMonths !== undefined ? after.emergencyCoverageMonths : coverage;
    decision.emergencyReserveBefore = before.emergencyReserve || 0;
    decision.emergencyReserveAfter = after.emergencyReserve || 0;
    decision.essentialBurnBefore = before.essentialMonthlyBurn || 0;
    decision.essentialBurnAfter = after.essentialMonthlyBurn || essentialBurn;

    // 4. Debt-to-Income (DTI) Ratio Computation
    const monthlyIncome = before.monthlyIncome || projection?.monthlyIncome || 10000;
    const dtiBefore = before.dtiRatio || 0;
    const dtiAfter = after.dtiRatio !== undefined 
      ? after.dtiRatio 
      : (monthlyIncome > 0 ? Number(((after.monthlyInstallmentBurden / monthlyIncome) * 100).toFixed(1)) : 0);
    const dtiRatio = dtiAfter;

    decision.debtToIncomeRatio = dtiAfter;
    decision.dtiBefore = dtiBefore;
    decision.dtiAfter = dtiAfter;
    decision.dtiWarning = dtiAfter > 40;
    decision.installmentBurdenBefore = before.monthlyInstallmentBurden || 0;
    decision.installmentBurdenAfter = after.monthlyInstallmentBurden || 0;

    // 5. Recovery Runway in Days
    // Formula: Daily Savings Rate = (Monthly Net Income - Essential Monthly Burn - Variable Spend) / 30
    // Recovery Days = ceil(Cash Outflow / Daily Savings Rate) if Daily Savings Rate > 0, else null (unrecoverable)
    const monthlyNetSavings = monthlyIncome - essentialBurn;
    const dailySavingsRate = monthlyNetSavings / 30;
    const cashOutflow = Math.max(0, -cashDiff);

    let recoveryDays = null;
    let recoveryDaysTextAr = 'لا يوجد تعافي تلقائي (عجز في التدفق النقدي الشهري)';
    let recoveryDaysTextEn = 'No automatic recovery (Monthly cash flow deficit)';

    if (cashOutflow === 0) {
      recoveryDays = 0;
      recoveryDaysTextAr = 'لا يوجد استنزاف نقدي في هذا القرار';
      recoveryDaysTextEn = 'No cash drain in this decision';
    } else if (dailySavingsRate > 0) {
      recoveryDays = Math.ceil(cashOutflow / dailySavingsRate);
      recoveryDaysTextAr = `ستحتاج إلى ${recoveryDays} يوماً لتعويض هذا المبلغ واستعادة رصيدك السابق بناءً على معدل توفيرك الشهري.`;
      recoveryDaysTextEn = `You will need ${recoveryDays} days to recover this amount and restore your balance based on your monthly savings rate.`;
    }

    decision.recoveryDays = recoveryDays;
    decision.recoveryDaysTextAr = recoveryDaysTextAr;
    decision.recoveryDaysTextEn = recoveryDaysTextEn;
    decision.dailySavingsRate = Math.round(dailySavingsRate);
    decision.monthlyNetSavings = Math.round(monthlyNetSavings);
    decision.monthlyIncome = monthlyIncome;
    decision.cashOutflow = cashOutflow;

    // 6. Savings Goals Delay Calculation
    const goalDelays = [];
    let highPriorityDelayedOver30Days = false;
    const activeGoals = (simulatedState?.savingsGoals || baseState?.savingsGoals || [])
      .filter(g => g.status === 'active');

    if (cashOutflow > 0 && activeGoals.length > 0) {
      const availableMonthlySurplus = Math.max(0, monthlyNetSavings);
      activeGoals.forEach(g => {
        const goalPace = Number(g.requiredMonthlyPace) || 1000;
        let delayMonths = 0;
        if (availableMonthlySurplus > 0) {
          delayMonths = Math.ceil(cashOutflow / Math.max(500, availableMonthlySurplus));
        } else {
          delayMonths = Math.ceil(cashOutflow / Math.max(500, goalPace));
        }
        const delayDays = delayMonths * 30;
        if (delayDays > 30 && g.priority === 'high') {
          highPriorityDelayedOver30Days = true;
        }

        const origDate = new Date(g.targetDate || Date.now());
        const newEstimatedDate = new Date(origDate.getTime() + delayDays * 24 * 60 * 60 * 1000);

        const origMonthAr = origDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
        const origMonthEn = origDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const newMonthAr = newEstimatedDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
        const newMonthEn = newEstimatedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const delayMonthsTextAr = delayMonths === 1 ? 'شهر واحد' : (delayMonths === 2 ? 'شهران' : `${delayMonths} أشهر`);
        const delayMonthsTextEn = delayMonths === 1 ? '1 month' : `${delayMonths} months`;

        goalDelays.push({
          goalId: g._id,
          title: g.title,
          priority: g.priority || 'medium',
          delayDays,
          delayMonths,
          originalTargetDate: origDate.toISOString(),
          newEstimatedDate: newEstimatedDate.toISOString(),
          originalTargetDateFormatted: origMonthAr,
          originalTargetDateFormattedEn: origMonthEn,
          newEstimatedDateFormatted: newMonthAr,
          newEstimatedDateFormattedEn: newMonthEn,
          impactTextAr: `هذا القرار سيؤخر تحقيق هدف '${g.title}' بمقدار ${delayMonthsTextAr} (من ${origMonthAr} إلى ${newMonthAr}).`,
          impactTextEn: `This decision will delay your goal '${g.title}' by ${delayMonthsTextEn} (from ${origMonthEn} to ${newMonthEn}).`
        });
      });
    }
    decision.goalDelays = goalDelays;

    // 7. Safety Floor Breach Check
    const minSimulatedBalance = projection?.minSimulatedBalance !== undefined 
      ? projection.minSimulatedBalance 
      : cashAfter;
    const safetyFloor = projection?.safetyFloor || 15000;
    const floorBreachAmount = projection?.floorBreachAmount || Math.max(0, safetyFloor - minSimulatedBalance);
    const floorBreachPercent = projection?.floorBreachPercent || (safetyFloor > 0 ? Math.round((floorBreachAmount / safetyFloor) * 100) : 0);
    const breachedFloor = floorBreachAmount > 0;

    decision.emergencyFloorBreached = breachedFloor;
    decision.floorBreachPercent = floorBreachPercent;
    decision.floorBreachAmount = floorBreachAmount;

    // 8. 3-Tier Mutually Exclusive Verdict Matrix (Spec §FR-015)
    let verdictStatus = 'safe';
    let verdictTitleAr = 'آمن وموصى به';
    let verdictTitleEn = 'Safe & Recommended';
    let verdictBadgeAr = 'آمن وموصى به ✓';
    let verdictBadgeEn = 'Safe & Recommended ✓';
    let verdictReasonAr = 'الخطة المالية مستقرة تماماً، الرصيد يحافظ على درع الأمان المالي ومعدل الدين صحي.';
    let verdictReasonEn = 'Financial plan is completely stable. Balances remain above emergency reserves and debt ratio is healthy.';

    // Tier 1: Critical Risk (خطر مالي حرج) - Evaluated first
    if (
      minSimulatedBalance < 0 ||
      floorBreachPercent > 25 ||
      dtiRatio > 40 ||
      (dailySavingsRate <= 0 && cashOutflow > 0)
    ) {
      verdictStatus = 'critical';
      verdictTitleAr = 'خطر مالي حرج';
      verdictTitleEn = 'Critical Financial Risk';
      verdictBadgeAr = 'خطر حرج ⚠️';
      verdictBadgeEn = 'Critical Risk ⚠️';

      if (minSimulatedBalance < 0) {
        verdictReasonAr = 'الخطة ستؤدي إلى رصيد مكشوف أو عجز نقدي سالب خلال فترة التوقع.';
        verdictReasonEn = 'The plan will lead to a cash overdraft or negative balance during the projection horizon.';
      } else if (floorBreachPercent > 25) {
        verdictReasonAr = `استنزاف خطير لدرع الأمان المالي يتجاوز 25% من الاحتياطي الوقائي (اختراق بنسبة ${floorBreachPercent}%).`;
        verdictReasonEn = `Severe emergency fund breach exceeding 25% of protected reserve (${floorBreachPercent}% breach).`;
      } else if (dtiRatio > 40) {
        verdictReasonAr = `نسبة عبء الديون إلى الدخل تتجاوز الخط الأحمر (${dtiRatio}% > 40%).`;
        verdictReasonEn = `Debt-to-Income (DTI) ratio exceeds the red line (${dtiRatio}% > 40%).`;
      } else {
        verdictReasonAr = 'عجز نقدي شهري مستمر يمنع التعافي التلقائي بدون تمويل خارجي.';
        verdictReasonEn = 'Persistent monthly cash deficit preventing automatic recovery without external funds.';
      }
    }
    // Tier 2: Viable with Caution (قابل للتطبيق مع الحذر) - Evaluated second
    else if (
      (floorBreachPercent > 0 && floorBreachPercent <= 25) ||
      (dtiRatio > 30 && dtiRatio <= 40) ||
      (recoveryDays !== null && recoveryDays > 90 && recoveryDays <= 180) ||
      highPriorityDelayedOver30Days
    ) {
      verdictStatus = 'caution';
      verdictTitleAr = 'قابل للتطبيق مع الحذر';
      verdictTitleEn = 'Viable with Caution';
      verdictBadgeAr = 'قابل للتطبيق بحذر !';
      verdictBadgeEn = 'Viable with Caution !';

      if (floorBreachPercent > 0) {
        verdictReasonAr = `يحدث اقتراب أو مساس خفيف بدرع الأمان المالي بنسبة ${floorBreachPercent}%، مع فترة تعافي مقبولة.`;
        verdictReasonEn = `Mild emergency buffer dip of ${floorBreachPercent}%, with acceptable recovery runway.`;
      } else if (dtiRatio > 30) {
        verdictReasonAr = `عبء الأقساط الشهرية مرتفع نسبياً (${dtiRatio}%) ويقترب من الحد الأقصى الموصى به.`;
        verdictReasonEn = `Monthly installment burden is relatively elevated (${dtiRatio}%) approaching the recommended cap.`;
      } else if (highPriorityDelayedOver30Days) {
        verdictReasonAr = 'الخطة قابلة للتنفيذ لكنها ستؤخر تحقيق أحد أهداف الادخار ذات الأولوية العالية لأكثر من شهر.';
        verdictReasonEn = 'Plan is feasible but delays a high-priority savings goal deadline by over 30 days.';
      } else {
        verdictReasonAr = `فترة التعافي النقدي تمتد إلى ${recoveryDays} يوماً (أكثر من 3 أشهر).`;
        verdictReasonEn = `Cash recovery runway extends to ${recoveryDays} days (over 3 months).`;
      }
    }

    decision.verdict = {
      status: verdictStatus,
      badgeAr: verdictBadgeAr,
      badgeEn: verdictBadgeEn,
      titleAr: verdictTitleAr,
      titleEn: verdictTitleEn,
      reasonAr: verdictReasonAr,
      reasonEn: verdictReasonEn,
      recoveryDays,
      emergencyFloorBreached: breachedFloor,
      floorBreachPercent,
      floorBreachAmount,
      debtToIncomeRatio: dtiAfter,
      dtiBefore,
      dtiAfter,
      emergencyCoverageMonthsBefore: decision.emergencyCoverageMonthsBefore,
      emergencyCoverageMonthsAfter: decision.emergencyCoverageMonthsAfter,
      essentialBurnBefore: decision.essentialBurnBefore,
      essentialBurnAfter: decision.essentialBurnAfter,
      dailySavingsRate: decision.dailySavingsRate,
      monthlyNetSavings: decision.monthlyNetSavings
    };

    // 9. Trade-off Suggestions
    const tradeOffSuggestions = [];
    if (verdictStatus === 'critical' && cashOutflow > 0) {
      tradeOffSuggestions.push({
        type: 'installment',
        textAr: 'بدلاً من الشراء النقدي الكامل، قارن هذا الخيار مع تقسيط المبلغ عبر 6 أو 12 شهراً لحماية درع الأمان.',
        textEn: 'Instead of full upfront payment, compare with a 6 or 12-month installment plan to protect your shield.'
      });
    }
    if (dtiRatio > 35) {
      tradeOffSuggestions.push({
        type: 'tenure',
        textAr: 'زيادة مدة التقسيط (مثلاً من 6 إلى 12 شهر) تقلل القسط الشهري وتخفض عبء الديون إلى نطاق آمن.',
        textEn: 'Extending installment duration (e.g. from 6 to 12 months) lowers monthly burden into safe territory.'
      });
    }
    if (recoveryDays && recoveryDays > 90) {
      tradeOffSuggestions.push({
        type: 'budget',
        textAr: 'ترشيد المصاريف المتغيرة بنسبة 15% يسرع فترة التعافي المالي بمقدار 25 يوماً.',
        textEn: 'Trimming variable discretionary spending by 15% accelerates financial recovery by 25 days.'
      });
    }
    decision.tradeOffSuggestions = tradeOffSuggestions;

    // 10. Backward-compatible Legacy fields
    decision.risk = verdictStatus === 'critical' ? 'Critical' : (verdictStatus === 'caution' ? 'Medium' : 'Low');
    decision.score = verdictStatus === 'critical' ? 30 : (verdictStatus === 'caution' ? 65 : 95);

    // Insights
    if (breachedFloor) {
      insights.push({
        type: 'warning',
        title: 'Emergency Shield Breach',
        message: `Simulated balance drops below your emergency fund safety floor (${floorBreachPercent}% breach).`
      });
    }
    if (dtiRatio > 40) {
      insights.push({
        type: 'critical',
        title: 'High Debt-to-Income Ratio',
        message: `Monthly debt obligations equal ${dtiRatio}% of your monthly income (recommended max: 40%).`
      });
    }

    return { decision, insights };
  }
}

module.exports = DecisionEvaluator;
