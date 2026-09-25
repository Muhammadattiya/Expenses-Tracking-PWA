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
  static evaluate(before, after, projection = null, baseState = null, simulatedState = null, actions = []) {
    const decision = {};
    const insights = [];

    // Extract targeted account IDs from the simulated actions
    const targetedAccountIds = new Set();
    (actions || []).forEach(act => {
      const p = act.payload || {};
      const accId = p.accountId || p.linkedAccountId;
      if (accId) targetedAccountIds.add(accId.toString());
    });

    // Per-Account Overdraft Detection:
    // Only flag funding accounts that were actually targeted in the simulated actions
    // AND were debited by this decision (delta < 0) resulting in an overdraft!
    const overdrawnAccounts = [];
    if (targetedAccountIds.size > 0) {
      (after.accounts || []).forEach(a => {
        if (!targetedAccountIds.has(a._id.toString())) return;
        const beforeAcc = (before.accounts || []).find(b => b._id.toString() === a._id.toString());
        const beforeBal = beforeAcc ? (beforeAcc.balance || 0) : 0;
        const afterBal = a.balance || 0;
        const delta = afterBal - beforeBal;

        // Did this decision spend money from this account and leave/worsen a deficit?
        if (delta < 0 && afterBal < 0) {
          overdrawnAccounts.push({
            _id: a._id,
            name: a.name,
            deficit: Math.abs(afterBal),
            newDeficit: beforeBal >= 0 ? Math.abs(afterBal) : Math.abs(delta)
          });
        }
      });
    }
    decision.overdrawnAccounts = overdrawnAccounts;

    // Track any other pre-existing negative accounts not involved in this simulation
    const unrelatedOverdrawnAccounts = (after.accounts || [])
      .filter(a => {
        const isTargeted = targetedAccountIds.has(a._id.toString());
        return !isTargeted && (a.balance || 0) < 0;
      })
      .map(a => ({
        _id: a._id,
        name: a.name,
        deficit: Math.abs(a.balance)
      }));
    decision.unrelatedOverdrawnAccounts = unrelatedOverdrawnAccounts;

    // Financing Markup for Installments
    let financingMarkup = 0;
    (actions || []).forEach(act => {
      if (act.type === 'installment') {
        const p = act.payload || {};
        const down = Number(p.downPayment) || 0;
        const monthly = Number(p.monthlyAmount) || 0;
        const months = Number(p.totalMonths) || 12;
        const totalFinanced = down + (monthly * months);
        const totalAmount = Number(p.totalAmount) || 0;
        if (totalFinanced > totalAmount && totalAmount > 0) {
          financingMarkup += (totalFinanced - totalAmount);
        }
      }
    });
    decision.financingMarkup = financingMarkup;

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
    const monthlyIncome = (before.monthlyIncome !== undefined && before.monthlyIncome !== null)
      ? before.monthlyIncome 
      : (projection?.monthlyIncome || 0);

    const hasUnrecordedIncome = monthlyIncome <= 0;
    decision.hasUnrecordedIncome = hasUnrecordedIncome;
    decision.monthlyIncome = monthlyIncome;

    let dtiBefore = null;
    let dtiAfter = null;
    if (!hasUnrecordedIncome) {
      dtiBefore = before.dtiRatio !== undefined && before.dtiRatio !== null 
        ? before.dtiRatio 
        : Number(((before.monthlyInstallmentBurden / monthlyIncome) * 100).toFixed(1));
      dtiAfter = after.dtiRatio !== undefined && after.dtiRatio !== null 
        ? after.dtiRatio 
        : Number(((after.monthlyInstallmentBurden / monthlyIncome) * 100).toFixed(1));
    }

    const dtiRatio = dtiAfter;
    decision.debtToIncomeRatio = dtiAfter;
    decision.dtiBefore = dtiBefore;
    decision.dtiAfter = dtiAfter;
    decision.dtiWarning = dtiAfter !== null && dtiAfter > 40;
    decision.installmentBurdenBefore = before.monthlyInstallmentBurden || 0;
    decision.installmentBurdenAfter = after.monthlyInstallmentBurden || 0;

    // Living cash remaining after installments & fixed commitments
    const livingCashRemaining = !hasUnrecordedIncome
      ? Math.max(0, monthlyIncome - (after.monthlyInstallmentBurden || 0) - (after.monthlyFixedExpenses || 0))
      : null;
    decision.livingCashRemaining = livingCashRemaining;

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
    } else if (!hasUnrecordedIncome && dailySavingsRate > 0) {
      recoveryDays = Math.ceil(cashOutflow / dailySavingsRate);
      recoveryDaysTextAr = `ستحتاج إلى ${recoveryDays} يوماً لتعويض هذا المبلغ واستعادة رصيدك السابق بناءً على معدل توفيرك الشهري.`;
      recoveryDaysTextEn = `You will need ${recoveryDays} days to recover this amount and restore your balance based on your monthly savings rate.`;
    } else if (hasUnrecordedIncome) {
      recoveryDays = null;
      recoveryDaysTextAr = 'لا يمكن حساب فترة التعافي التلقائي لعدم تسجيل الدخل الشهري في ملفك.';
      recoveryDaysTextEn = 'Automatic recovery runway cannot be computed without a recorded monthly income.';
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
    
    // Only flag breach if this decision actually drains cash/runway and causes or deepens a breach!
    const floorBreachAmountBefore = Math.max(0, safetyFloor - cashBefore);
    const decisionCausedBreach = cashDiff < 0 && floorBreachAmount > 0 && (floorBreachAmount > floorBreachAmountBefore || cashBefore >= safetyFloor);

    decision.emergencyFloorBreached = decisionCausedBreach;
    decision.floorBreachPercent = floorBreachPercent;
    decision.floorBreachAmount = floorBreachAmount;

    // 8. Dynamic Resilience Score Engine (0 - 100) & Transparent Breakdown
    let dynamicScore = 100;
    const scoreBreakdown = {
      base: 100,
      factors: []
    };

    const hasOverdrawnAccount = overdrawnAccounts.length > 0;
    const totalOverdraftDeficit = hasOverdrawnAccount ? overdrawnAccounts.reduce((sum, a) => sum + (a.deficit || 0), 0) : 0;
    const primaryAction = actions[0] || {};
    const pAction = primaryAction.payload || {};
    const primaryType = primaryAction.type || 'composite';
    const isDebtBorrow = primaryType === 'debt' && (pAction?.action === 'borrow' || pAction?.action === 'take');
    const isDebtRepay = primaryType === 'debt' && (pAction?.action === 'repay' || pAction?.action === 'pay');
    const isSalaryIncrease = primaryType === 'salary' && (Number(pAction?.newAmount || pAction?.amount || 0) >= (before.monthlyIncome || 0));
    const isInvestmentSell = primaryType === 'investment' && pAction?.action === 'sell';
    const isRecurringCancel = primaryType === 'recurring' && pAction?.action === 'disable';
    const isBudgetDiscipline = primaryType === 'budget';

    // Factor A: Funding Account Overdraft
    if (hasOverdrawnAccount) {
      let penalty = 20;
      if (totalOverdraftDeficit > 5000) penalty = 45;
      else if (totalOverdraftDeficit > 1000) penalty = 30;
      else if (totalOverdraftDeficit <= 500) penalty = 15;

      dynamicScore -= penalty;
      scoreBreakdown.factors.push({
        type: 'negative',
        category: 'account',
        points: -penalty,
        titleAr: 'عجز في الحساب المنفذ منه',
        titleEn: 'Funding Account Overdraft',
        hintAr: `خصم ${penalty} نقطة بسبب عجز قدره ${totalOverdraftDeficit.toLocaleString()} ج.م في رصيد الحساب.`,
        hintEn: `-${penalty} pts due to a ${totalOverdraftDeficit.toLocaleString()} EGP deficit in funding account.`
      });
    }

    // Factor B: Immediate Cash Solvency
    if (cashAfter < 0 && cashDiff < 0) {
      const cashDeficit = Math.abs(cashAfter);
      let penalty = 30;
      if (cashDeficit > 5000) penalty = 50;
      else if (cashDeficit > 1000) penalty = 40;
      dynamicScore -= penalty;
      scoreBreakdown.factors.push({
        type: 'negative',
        category: 'cash',
        points: -penalty,
        titleAr: 'عجز في السيولة النقدية المتاحة',
        titleEn: 'Liquid Cash Shortfall',
        hintAr: `خصم ${penalty} نقطة لأن القرار يترك عجزاً نقدياً في رصيدك (${cashDeficit.toLocaleString()} ج.م).`,
        hintEn: `-${penalty} pts because decision leaves a cash deficit (${cashDeficit.toLocaleString()} EGP).`
      });
    }

    // Factor C: Emergency Shield Coverage & Runway (Lowered Impact per user instruction)
    const coverageAfter = decision.emergencyCoverageMonthsAfter || coverage || 0;
    if (coverageAfter >= 5) {
      dynamicScore += 5;
      scoreBreakdown.factors.push({
        type: 'positive',
        category: 'shield',
        points: +5,
        titleAr: 'درع طوارئ ممتاز',
        titleEn: 'Robust Emergency Shield',
        hintAr: 'إضافة 5 نقاط لامتلاك احتياطي طوارئ قوي يحمي مصاريفك لأكثر من 5 أشهر.',
        hintEn: '+5 pts for maintaining a robust emergency buffer protecting 5+ months.'
      });
    } else if (coverageAfter < 1.0 && cashOutflow > 0) {
      const penalty = 15;
      dynamicScore -= penalty;
      scoreBreakdown.factors.push({
        type: 'negative',
        category: 'shield',
        points: -penalty,
        titleAr: 'درع طوارئ منخفض',
        titleEn: 'Low Emergency Reserve',
        hintAr: `خصم طفيف (${penalty} نقطة) لأن السيولة المتبقية تغطي أقل من شهر واحد لمصاريفك الأساسية (${coverageAfter} شهر).`,
        hintEn: `-${penalty} pts because remaining liquidity covers less than 1 month of essential burn (${coverageAfter} mo).`
      });
    } else if (coverageAfter < 2.0 && cashOutflow > 0) {
      const penalty = 5;
      dynamicScore -= penalty;
      scoreBreakdown.factors.push({
        type: 'negative',
        category: 'shield',
        points: -penalty,
        titleAr: 'تنبيه درع الأمان',
        titleEn: 'Emergency Buffer Notice',
        hintAr: `خصم رمزي (${penalty} نقاط) لأن مدة درع الطوارئ هبطت إلى ${coverageAfter} شهر (المعدل المريح 2+ أشهر).`,
        hintEn: `-${penalty} pts minor notice as emergency runway is ${coverageAfter} months.`
      });
    }

    // Factor D: Safety Floor Breach (Lowered Impact per user instruction)
    if (decisionCausedBreach && floorBreachPercent > 20) {
      const breachPenalty = Math.min(10, Math.round(floorBreachPercent * 0.15));
      dynamicScore -= breachPenalty;
      scoreBreakdown.factors.push({
        type: 'negative',
        category: 'floor',
        points: -breachPenalty,
        titleAr: 'اختراق سقف الأمان الوقائي',
        titleEn: 'Safety Floor Breach',
        hintAr: `خصم ${breachPenalty} نقاط لاختراق الاحتياطي الوقائي بنسبة ${floorBreachPercent}%.`,
        hintEn: `-${breachPenalty} pts for penetrating protected safety reserve by ${floorBreachPercent}%.`
      });
    }

    // Factor E: Debt-to-Income (DTI) Burden
    if ((primaryType === 'installment' || isDebtBorrow) && dtiRatio !== null) {
      if (dtiRatio > 40) {
        const excess = Math.min(25, Math.round((dtiRatio - 40) * 1.5));
        const dtiPenalty = 25 + excess;
        dynamicScore -= dtiPenalty;
        scoreBreakdown.factors.push({
          type: 'negative',
          category: 'debt',
          points: -dtiPenalty,
          titleAr: 'تجاوز سقف الديون الآمن',
          titleEn: 'High Debt-to-Income (DTI)',
          hintAr: `خصم ${dtiPenalty} نقطة لأن نسبة الأقساط الشهرية (${dtiRatio}%) تتجاوز الحد الأقصى الآمن (40%).`,
          hintEn: `-${dtiPenalty} pts because monthly debt ratio (${dtiRatio}%) exceeds safe cap (40%).`
        });
      } else if (dtiRatio > 30) {
        const dtiPenalty = 12;
        dynamicScore -= dtiPenalty;
        scoreBreakdown.factors.push({
          type: 'negative',
          category: 'debt',
          points: -dtiPenalty,
          titleAr: 'عبء ديون مرتفع نسبياً',
          titleEn: 'Elevated Monthly Debt',
          hintAr: `خصم ${dtiPenalty} نقطة لأن الأقساط تستهلك ${dtiRatio}% من دخلك الشهري.`,
          hintEn: `-${dtiPenalty} pts because monthly installments consume ${dtiRatio}% of income.`
        });
      } else if (dtiRatio <= 20 && dtiRatio > 0) {
        dynamicScore += 3;
        scoreBreakdown.factors.push({
          type: 'positive',
          category: 'debt',
          points: +3,
          titleAr: 'نسبة التزامات منخفضة وصحية',
          titleEn: 'Healthy Debt Ratio',
          hintAr: `إضافة 3 نقاط لكون نسبة الأقساط خفيفة وصحية (${dtiRatio}% من الدخل).`,
          hintEn: `+3 pts for a light and healthy monthly debt burden (${dtiRatio}% of income).`
        });
      }
    }

    // Factor F: Upcoming Bills Safety
    const unpaidBills = after.unpaidBillsTotal || 0;
    if (unpaidBills > 0 && (primaryType === 'purchase' || primaryType === 'installment' || primaryType === 'bill')) {
      if (cashAfter < 0) {
        const billsPenalty = 20;
        dynamicScore -= billsPenalty;
        scoreBreakdown.factors.push({
          type: 'negative',
          category: 'bills',
          points: -billsPenalty,
          titleAr: 'عجز في تغطية الفواتير القادمة',
          titleEn: 'Bills Safety Shortfall',
          hintAr: `خصم ${billsPenalty} نقطة لأن الرصيد المتبقي لن يكفي لتغطية فواتيرك القادمة (${unpaidBills.toLocaleString()} ج.م).`,
          hintEn: `-${billsPenalty} pts because remaining balance cannot cover upcoming bills (${unpaidBills.toLocaleString()} EGP).`
        });
      }
    }

    // Factor G: Positive Momentum Bonuses
    if (isSalaryIncrease) {
      const surplusDelta = after.currentSavings - before.currentSavings;
      const boost = surplusDelta > 5000 ? 10 : 5;
      dynamicScore += boost;
      scoreBreakdown.factors.push({
        type: 'positive',
        category: 'momentum',
        points: +boost,
        titleAr: 'تعزيز الفائض المالي الشهري',
        titleEn: 'Monthly Cash Flow Boost',
        hintAr: `إضافة ${boost} نقاط لزيادة صافي التوفير الشهري بمقدار ${Math.max(0, surplusDelta).toLocaleString()} ج.م.`,
        hintEn: `+${boost} pts for expanding monthly net surplus by ${Math.max(0, surplusDelta).toLocaleString()} EGP.`
      });
    } else if (isRecurringCancel) {
      dynamicScore += 5;
      scoreBreakdown.factors.push({
        type: 'positive',
        category: 'momentum',
        points: +5,
        titleAr: 'خفض المصاريف الثابتة',
        titleEn: 'Lowering Fixed Burn',
        hintAr: 'إضافة 5 نقاط لإلغاء التزام شهري وتخفيف معدل حرق المصروفات اليومي.',
        hintEn: '+5 pts for cancelling a recurring expense and reducing daily burn rate.'
      });
    } else if (isDebtRepay && cashAfter >= 0) {
      dynamicScore += 5;
      scoreBreakdown.factors.push({
        type: 'positive',
        category: 'momentum',
        points: +5,
        titleAr: 'تسريع التحرر من الديون',
        titleEn: 'Accelerating Debt Payoff',
        hintAr: 'إضافة 5 نقاط لتقليص الالتزامات والفوائد مع الحفاظ على درع أمان نقدي كافٍ.',
        hintEn: '+5 pts for reducing debt liabilities while maintaining safe cash cushion.'
      });
    } else if (isBudgetDiscipline) {
      dynamicScore += 5;
      scoreBreakdown.factors.push({
        type: 'positive',
        category: 'momentum',
        points: +5,
        titleAr: 'انضباط الميزانية',
        titleEn: 'Spending Discipline',
        hintAr: 'إضافة 5 نقاط لتحديد سقف إنفاق يوفر سيولة للمستقبل ويحمي الادخار.',
        hintEn: '+5 pts for setting a disciplined spending cap.'
      });
    }

    // Clamp score cleanly between 10 and 100
    dynamicScore = Math.max(10, Math.min(100, Math.round(dynamicScore)));
    decision.score = dynamicScore;
    decision.scoreBreakdown = scoreBreakdown;

    // 9. Intelligent Verdict Assignment derived from Dynamic Score and Specific Triggers
    let verdictStatus = 'safe';
    let verdictTitleAr = 'آمن وموصى به';
    let verdictTitleEn = 'Safe & Recommended';
    let verdictBadgeAr = 'آمن وموصى به ✓';
    let verdictBadgeEn = 'Safe & Recommended ✓';
    let verdictReasonAr = 'الخطة المالية مستقرة تماماً، الرصيد يحافظ على درع الأمان المالي ومعدل الدين صحي.';
    let verdictReasonEn = 'Financial plan is completely stable. Balances remain above emergency reserves and debt ratio is healthy.';

    const isSevereOverdraft = totalOverdraftDeficit > 500;
    const isSevereCashDrain = (cashAfter < 0 && cashDiff < 0) || (cashBefore >= 0 && cashAfter < -500);
    const isSevereDti = (primaryType === 'installment' || isDebtBorrow) && dtiRatio !== null && dtiRatio > 45;

    // Tier 1: Truly Critical Risk
    if (
      dynamicScore < 50 ||
      isSevereOverdraft ||
      isSevereCashDrain ||
      isSevereDti ||
      (coverageAfter < 0.25 && cashOutflow > 5000) ||
      (cashAfter < 0 && cashOutflow > 0)
    ) {
      verdictStatus = 'critical';
      verdictTitleAr = 'خطر مالي حرج';
      verdictTitleEn = 'Critical Financial Risk';
      verdictBadgeAr = 'خطر حرج ⚠️';
      verdictBadgeEn = 'Critical Risk ⚠️';

      if (hasOverdrawnAccount) {
        const accNames = overdrawnAccounts.map(a => a.name).join(', ');
        verdictTitleAr = 'عجز في رصيد الحساب المنفذ منه';
        verdictTitleEn = 'Funding Account Overdraft';
        verdictBadgeAr = 'عجز حساب ⚠️';
        verdictBadgeEn = 'Account Overdraft ⚠️';
        verdictReasonAr = `الحساب المحدد للعملية (${accNames}) لا يملك رصيداً كافياً وسيسجل عجزاً بقيمة ${totalOverdraftDeficit.toLocaleString()} ج.م. يلزم تحويل سيولة مسبقاً.`;
        verdictReasonEn = `Funding account (${accNames}) lacks sufficient balance and will overdraft by ${totalOverdraftDeficit.toLocaleString()} EGP. Prior liquidity transfer is required.`;
      } else if (cashAfter < 0 && cashDiff < 0) {
        verdictReasonAr = `هذا القرار يسبب عجزاً نقدياً في رصيدك بقيمة ${Math.abs(cashAfter).toLocaleString()} ج.م ويستنزف درع الأمان.`;
        verdictReasonEn = `This decision results in a cash deficit of ${Math.abs(cashAfter).toLocaleString()} EGP and exhausts your safety shield.`;
      } else if (isSevereDti) {
        verdictReasonAr = `نسبة عبء الديون إلى الدخل تتجاوز الخط الأحمر الآمن (${dtiRatio}% > 40%).`;
        verdictReasonEn = `Debt-to-Income (DTI) ratio exceeds the safe red line (${dtiRatio}% > 40%).`;
      } else if (coverageAfter < 0.5) {
        verdictReasonAr = `استنزاف خطير لدرع الأمان المالي حيث لا تكفي السيولة المتبقية (${coverageAfter} شهر).`;
        verdictReasonEn = `Severe emergency fund depletion where remaining cash covers less than 0.5 month (${coverageAfter} mo).`;
      } else {
        verdictReasonAr = 'القرار يضع ضغوطاً متراكمة على التدفق المالي ويخفض مؤشر مرونة القرار.';
        verdictReasonEn = 'The decision introduces compounding pressure on cash flow and lowers resilience.';
      }
    }
    // Tier 2: Viable with Caution
    else if (
      dynamicScore < 80 ||
      (hasOverdrawnAccount && totalOverdraftDeficit <= 500) ||
      (coverageAfter < 1.0 && cashOutflow > 0) ||
      ((primaryType === 'installment' || isDebtBorrow) && dtiRatio !== null && dtiRatio > 30) ||
      (cashOutflow > 0 && recoveryDays !== null && recoveryDays > 90) ||
      (cashOutflow > 0 && highPriorityDelayedOver30Days)
    ) {
      verdictStatus = 'caution';
      verdictTitleAr = 'قابل للتطبيق مع الحذر';
      verdictTitleEn = 'Viable with Caution';
      verdictBadgeAr = 'قابل للتطبيق بحذر !';
      verdictBadgeEn = 'Viable with Caution !';

      if (hasOverdrawnAccount) {
        verdictReasonAr = `يحدث عجز طفيف بقيمة ${totalOverdraftDeficit.toLocaleString()} ج.م يمكن تغطيته بتحويل سيولة بسيط.`;
        verdictReasonEn = `Minor shortfall of ${totalOverdraftDeficit.toLocaleString()} EGP which can be covered with a simple transfer.`;
      } else if (coverageAfter < 1.0 && cashOutflow > 0) {
        verdictReasonAr = `القرار يقلص درع الطوارئ إلى ${coverageAfter} شهر، مع فترة تعافي مقبولة.`;
        verdictReasonEn = `Decision reduces emergency runway to ${coverageAfter} months, with acceptable recovery runway.`;
      } else if (dtiRatio !== null && dtiRatio > 30) {
        verdictReasonAr = `عبء الأقساط الشهرية مرتفع نسبياً (${dtiRatio}%) ويقترب من الحد الأقصى الموصى به.`;
        verdictReasonEn = `Monthly installment burden is relatively elevated (${dtiRatio}%) approaching the recommended cap.`;
      } else if (cashOutflow > 0 && highPriorityDelayedOver30Days) {
        verdictReasonAr = 'الخطة قابلة للتنفيذ لكنها ستؤخر تحقيق أحد أهداف الادخار ذات الأولوية العالية لأكثر من شهر.';
        verdictReasonEn = 'Plan is feasible but delays a high-priority savings goal deadline by over 30 days.';
      } else {
        verdictReasonAr = `فترة التعافي النقدي تمتد إلى ${recoveryDays} يوماً، يلزم متابعة المصاريف المتغيرة.`;
        verdictReasonEn = `Cash recovery runway extends to ${recoveryDays} days. Monitoring variable spend is advised.`;
      }
    }
    // Tier 3: Inherently Positive / Safe Actions
    else if (isSalaryIncrease) {
      verdictStatus = 'safe';
      verdictTitleAr = 'زيادة دخل ممتازة';
      verdictTitleEn = 'Excellent Income Boost';
      verdictBadgeAr = 'آمن وموصى به ✓';
      verdictBadgeEn = 'Safe & Recommended ✓';
      verdictReasonAr = 'تعديل الراتب يعزز تدفقك النقدي الشهري ويسرّع وتيرة الادخار وبناء درع الأمان المالي.';
      verdictReasonEn = 'Salary boost accelerates your monthly cash flow, savings rate, and emergency shield.';
    } else if (isRecurringCancel) {
      verdictStatus = 'safe';
      verdictTitleAr = 'توفير مالي ذكي';
      verdictTitleEn = 'Smart Savings Move';
      verdictBadgeAr = 'آمن وموصى به ✓';
      verdictBadgeEn = 'Safe & Recommended ✓';
      verdictReasonAr = 'إلغاء المعاملة الدورية يوفر سيولة شهرية مستمرة ويخفض معدل حرق المصروفات.';
      verdictReasonEn = 'Cancelling recurring commitment frees up monthly liquidity and reduces burn rate.';
    } else if (isInvestmentSell) {
      verdictStatus = 'safe';
      verdictTitleAr = 'تعزيز السيولة النقدية';
      verdictTitleEn = 'Liquidity Boost';
      verdictBadgeAr = 'آمن وموصى به ✓';
      verdictBadgeEn = 'Safe & Recommended ✓';
      verdictReasonAr = 'تسييل هذا الأصل يضخ سيولة نقدية مباشرة في حسابك ويعزز درع أمانك المالي.';
      verdictReasonEn = 'Liquidating this asset injects direct liquid cash and strengthens your emergency shield.';
    } else if (isBudgetDiscipline) {
      verdictStatus = 'safe';
      verdictTitleAr = 'انضباط ميزانية مدروس';
      verdictTitleEn = 'Disciplined Budget Cap';
      verdictBadgeAr = 'آمن وموصى به ✓';
      verdictBadgeEn = 'Safe & Recommended ✓';
      verdictReasonAr = 'الالتزام بسقف المصروفات يحمي فائضك الشهري ويحقق وفراً تراكمياً يدعم أهدافك.';
      verdictReasonEn = 'Adhering to this spending cap protects monthly surplus and builds cumulative savings.';
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
      emergencyFloorBreached: decisionCausedBreach,
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
      monthlyNetSavings: decision.monthlyNetSavings,
      livingCashRemaining: decision.livingCashRemaining,
      hasUnrecordedIncome: decision.hasUnrecordedIncome,
      monthlyIncome: decision.monthlyIncome,
      overdrawnAccounts: decision.overdrawnAccounts,
      financingMarkup: decision.financingMarkup,
      score: dynamicScore,
      scoreBreakdown
    };

    // 9. Narrative Story of Pipeline / Actions
    const narrativeStory = (actions || []).map((act, idx) => {
      const p = act.payload || {};
      let labelAr = '';
      let labelEn = '';
      let changeAr = '';
      let changeEn = '';

      switch (act.type) {
        case 'purchase':
          labelAr = p.notes || 'شراء كاش';
          labelEn = p.notes || 'Cash Purchase';
          changeAr = `-${(Number(p.amount) || 0).toLocaleString()} ج.م (فوري)`;
          changeEn = `-${(Number(p.amount) || 0).toLocaleString()} EGP (One-time)`;
          break;
        case 'installment':
          labelAr = p.title || 'شراء بالتقسيط';
          labelEn = p.title || 'Installment Purchase';
          const down = Number(p.downPayment) || 0;
          const mon = Number(p.monthlyAmount) || 0;
          const mos = Number(p.totalMonths) || 12;
          changeAr = `${down > 0 ? `مقدم ${down.toLocaleString()} ج.م + ` : ''}${mon.toLocaleString()} ج.م/شهر × ${mos} شهر`;
          changeEn = `${down > 0 ? `Down ${down.toLocaleString()} EGP + ` : ''}${mon.toLocaleString()} EGP/mo × ${mos} mos`;
          break;
        case 'salary':
          labelAr = 'تعديل الراتب الشهري';
          labelEn = 'Monthly Salary Adjustment';
          changeAr = `${(Number(p.newAmount) || 0).toLocaleString()} ج.م/شهر`;
          changeEn = `${(Number(p.newAmount) || 0).toLocaleString()} EGP/mo`;
          break;
        case 'debt':
          const isBorrow = p.action === 'borrow';
          labelAr = isBorrow ? 'اقتراض دين جديد' : 'سداد من الدين';
          labelEn = isBorrow ? 'Borrow New Debt' : 'Repay Debt';
          changeAr = `${isBorrow ? '+' : '-'}${(Number(p.amount) || 0).toLocaleString()} ج.م`;
          changeEn = `${isBorrow ? '+' : '-'}${(Number(p.amount) || 0).toLocaleString()} EGP`;
          break;
        case 'bill':
          labelAr = 'سداد فاتورة';
          labelEn = 'Bill Payment';
          changeAr = `-${(Number(p.amount) || 0).toLocaleString()} ج.م`;
          changeEn = `-${(Number(p.amount) || 0).toLocaleString()} EGP`;
          break;
        case 'investment':
          const isBuy = p.action === 'buy';
          labelAr = isBuy ? 'شراء استثمار' : 'بيع استثمار';
          labelEn = isBuy ? 'Buy Investment' : 'Sell Investment';
          changeAr = `${isBuy ? '-' : '+'}${(Number(p.amount) || 0).toLocaleString()} ج.م`;
          changeEn = `${isBuy ? '-' : '+'}${(Number(p.amount) || 0).toLocaleString()} EGP`;
          break;
        case 'budget':
          labelAr = 'تعديل الميزانية';
          labelEn = 'Budget Adjustment';
          changeAr = `${(Number(p.amount) || 0).toLocaleString()} ج.م`;
          changeEn = `${(Number(p.amount) || 0).toLocaleString()} EGP`;
          break;
        case 'recurring':
          labelAr = 'معاملة دورية';
          labelEn = 'Recurring Transaction';
          changeAr = `${(Number(p.amount) || 0).toLocaleString()} ج.م`;
          changeEn = `${(Number(p.amount) || 0).toLocaleString()} EGP`;
          break;
        default:
          labelAr = act.type;
          labelEn = act.type;
          changeAr = '';
          changeEn = '';
      }
      return {
        step: idx + 1,
        type: act.type,
        labelAr,
        labelEn,
        changeAr,
        changeEn,
        payload: p
      };
    });
    decision.narrativeStory = narrativeStory;

    // 10. Why It Matters Explanation & Scenario-Specific Details
    let whyItMattersAr = '';
    let whyItMattersEn = '';

    const diffRunway = Number((decision.emergencyCoverageMonthsAfter - decision.emergencyCoverageMonthsBefore).toFixed(1));
    const billsSafe = decision.billsSafe;

    const scenarioDetails = {
      type: primaryAction.type || 'composite'
    };
    let suggestedAlternatives = [];

    if (decision.overdrawnAccounts && decision.overdrawnAccounts.length > 0) {
      const acc = decision.overdrawnAccounts[0];
      whyItMattersAr = `هذا القرار يسبب عجزاً بقيمة ${(acc.deficit || 0).toLocaleString()} ج.م في حساب "${acc.name}". ستحتاج إلى توفير سيولة أو اختيار حساب آخر مسبقاً.`;
      whyItMattersEn = `This decision causes a shortfall of ${(acc.deficit || 0).toLocaleString()} EGP in "${acc.name}". You will need to transfer funds first.`;
    } else if (primaryAction.type === 'installment') {
      const mon = Number(pAction?.monthlyAmount) || 0;
      const mos = Number(pAction?.totalMonths) || 12;
      const down = Number(pAction?.downPayment) || 0;
      if (down > 0) {
        whyItMattersAr = `تقسيط المبلغ يحافظ على سيولتك مع دفع ${down.toLocaleString()} ج.م مقدماً، ويضيف التزاماً شهرياً بقيمة ${mon.toLocaleString()} ج.م لمدة ${mos} شهراً مع بقاء فواتيرك مغطاة.`;
        whyItMattersEn = `Financing preserves most of your upfront liquidity with a ${down.toLocaleString()} EGP down payment, adding a ${mon.toLocaleString()} EGP/month commitment for ${mos} months while keeping bills covered.`;
      } else {
        whyItMattersAr = `تقسيط المبلغ يجنبك دفع كاش فوري تماماً، لكنه يرفع التزاماتك الثابتة الشهرية بمقدار ${mon.toLocaleString()} ج.م لمدة ${mos} شهراً.`;
        whyItMattersEn = `Financing spares your upfront cash entirely, but increases your monthly commitments by ${mon.toLocaleString()} EGP/month for ${mos} months.`;
      }
      scenarioDetails.downPayment = down;
      scenarioDetails.monthlyAmount = mon;
      scenarioDetails.totalMonths = mos;
    } else if (primaryAction.type === 'purchase') {
      const amt = Number(pAction?.amount) || Math.abs(cashDiff);
      if (cashAfter < 0) {
        whyItMattersAr = `هذا الشراء يؤدي إلى عجز نقدي بقيمة ${Math.abs(cashAfter).toLocaleString()} ج.م في رصيدك واستنزاف كامل لدرع الأمان المالي.`;
        whyItMattersEn = `This purchase results in a cash deficit of ${Math.abs(cashAfter).toLocaleString()} EGP and completely exhausts your emergency reserve.`;
      } else if (diffRunway < 0) {
        whyItMattersAr = `هذا الشراء سيقلص درع الطوارئ بنحو ${Math.abs(diffRunway)} شهر مع ${billsSafe ? 'بقاء فواتيرك القادمة مغطاة بالكامل' : 'وجود ضغط على الفواتير القادمة'}.`;
        whyItMattersEn = `This purchase would reduce your emergency buffer by about ${Math.abs(diffRunway)} months while ${billsSafe ? 'keeping your upcoming bills covered' : 'putting pressure on upcoming bills'}.`;
      } else if (!billsSafe || decision.emergencyFloorBreached) {
        whyItMattersAr = `هذا الشراء يضغط على السيولة المتبقية (${cashAfter.toLocaleString()} ج.م) ويجعلك دون سقف الأمان المالي الموصى به.`;
        whyItMattersEn = `This purchase strains remaining liquidity (${cashAfter.toLocaleString()} EGP), dropping you below the recommended safety floor.`;
      } else {
        whyItMattersAr = `هذا الشراء يقلل الرصيد المتاح بمقدار ${amt.toLocaleString()} ج.م مع الحفاظ على استقرار درع الطوارئ والفواتير.`;
        whyItMattersEn = `This purchase decreases available cash by ${amt.toLocaleString()} EGP while keeping emergency reserves and bills stable.`;
      }
      scenarioDetails.amount = amt;
    } else if (primaryAction.type === 'salary') {
      const newIncome = Number(pAction?.newAmount) || 0;
      const surplusBefore = before.currentSavings || 0;
      const surplusAfter = after.currentSavings || 0;
      const surplusDelta = surplusAfter - surplusBefore;
      const growthPct = surplusBefore > 0 ? Math.round((surplusDelta / surplusBefore) * 100) : 100;
      
      whyItMattersAr = `هذا التعديل يرفع فائضك الشهري الصافي بمقدار ${surplusDelta.toLocaleString()} ج.م (${growthPct > 0 ? `+${growthPct}%` : `${growthPct}%`} سرعة ادخار)، مما يسرّع بناء درع الأمان وسداد أي التزامات.`;
      whyItMattersEn = `This adjustment boosts your net monthly surplus by ${surplusDelta.toLocaleString()} EGP (${growthPct > 0 ? `+${growthPct}%` : `${growthPct}%`} savings velocity), accelerating your emergency cushion and debt freedom.`;

      scenarioDetails.newIncome = newIncome;
      scenarioDetails.surplusDelta = surplusDelta;
      scenarioDetails.growthPct = growthPct;
      scenarioDetails.monthlyNetSavings = after.currentSavings;
      suggestedAlternatives = [
        { id: 'invest_surplus', labelKey: 'sandbox.alternatives.investSurplus', labelAr: 'استثمر 50% من الزيادة', labelEn: 'Invest 50% of raise' },
        { id: 'accelerate_debt', labelKey: 'sandbox.alternatives.accelerateDebt', labelAr: 'وجّه الفائض لتسريع سداد الديون', labelEn: 'Accelerate debt payoff' }
      ];
    } else if (primaryAction.type === 'debt') {
      const isBorrow = pAction?.action === 'borrow' || pAction?.action === 'take';
      const amt = Number(pAction?.amount) || 0;
      const totalDebtAfter = after.totalDebtRemaining || 0;
      const dti = after.dtiRatio || 0;

      if (isBorrow) {
        whyItMattersAr = `تحصل على سيولة نقدية فورية بقيمة ${amt.toLocaleString()} ج.م، لكن إجمالي ديونك يرتفع إلى ${totalDebtAfter.toLocaleString()} ج.م مع بلوغ نسبة عبء الدين ${dti}%.`;
        whyItMattersEn = `You gain ${amt.toLocaleString()} EGP in immediate cash, but your total debt jumps to ${totalDebtAfter.toLocaleString()} EGP with a debt burden of ${dti}%.`;
        suggestedAlternatives = [
          { id: 'borrow_half', labelKey: 'sandbox.alternatives.borrowHalf', labelAr: 'جرّب اقتراض 50% فقط', labelEn: 'Try borrowing 50% only' }
        ];
      } else {
        if (cashAfter >= 0) {
          whyItMattersAr = `سداد ${amt.toLocaleString()} ج.م يخفف إجمالي ديونك إلى ${totalDebtAfter.toLocaleString()} ج.م، مع بقاء رصيدك النقدي عند ${cashAfter.toLocaleString()} ج.م كدرع أمان.`;
          whyItMattersEn = `Repaying ${amt.toLocaleString()} EGP reduces your total debt to ${totalDebtAfter.toLocaleString()} EGP, leaving a healthy cash cushion of ${cashAfter.toLocaleString()} EGP.`;
        } else {
          whyItMattersAr = `سداد ${amt.toLocaleString()} ج.م يخفف إجمالي ديونك إلى ${totalDebtAfter.toLocaleString()} ج.م، ولكنه يسبب عجزاً نقدياً في رصيدك بمقدار ${Math.abs(cashAfter).toLocaleString()} ج.م.`;
          whyItMattersEn = `Repaying ${amt.toLocaleString()} EGP reduces your total debt to ${totalDebtAfter.toLocaleString()} EGP, but causes a cash deficit of ${Math.abs(cashAfter).toLocaleString()} EGP.`;
        }
        suggestedAlternatives = [
          { id: 'repay_half', labelKey: 'sandbox.alternatives.repayHalf', labelAr: 'سدد 50% واحتفظ بالباقي كأمان', labelEn: 'Repay 50% and keep cushion' }
        ];
      }
      scenarioDetails.isBorrow = isBorrow;
      scenarioDetails.amount = amt;
      scenarioDetails.totalDebtAfter = totalDebtAfter;
      scenarioDetails.dti = dti;
    } else if (primaryAction.type === 'investment') {
      const isBuy = pAction?.action === 'buy';
      const amt = Number(pAction?.amount) || 0;
      const portVal = after.totalInvestments || 0;

      if (isBuy) {
        whyItMattersAr = `صافي ثروتك النقدية يظل محمياً بنسبة 100% (تحويل كاش إلى أصول)، مع انخفاض السيولة الفورية إلى ${cashAfter.toLocaleString()} ج.م (تغطية طوارئ: ${decision.emergencyCoverageMonthsAfter || 0} شهر).`;
        whyItMattersEn = `Your net worth remains 100% preserved (converting cash to assets), while immediate cash drops to ${cashAfter.toLocaleString()} EGP (${decision.emergencyCoverageMonthsAfter || 0} mo emergency runway).`;
        suggestedAlternatives = [
          { id: 'invest_half', labelKey: 'sandbox.alternatives.investHalfAmount', labelAr: 'جرّب استثمار 50% فقط', labelEn: 'Try investing 50% only' }
        ];
      } else {
        whyItMattersAr = `تسييل الاستثمار يضخ سيولة نقدية بقيمة ${amt.toLocaleString()} ج.م في حسابك، مما يرفع درع أمانك الفوري بمقدار ${Math.abs(diffRunway)} شهر.`;
        whyItMattersEn = `Liquidating this asset injects ${amt.toLocaleString()} EGP in liquid cash into your account, boosting your emergency shield by ${Math.abs(diffRunway)} months.`;
      }
      scenarioDetails.isBuy = isBuy;
      scenarioDetails.amount = amt;
      scenarioDetails.portVal = portVal;
      scenarioDetails.netWorthPreserved = true;
    } else if (primaryAction.type === 'recurring') {
      const amt = Number(pAction?.amount) || 0;
      const annualImpact = amt * 12;
      const isDisable = pAction?.action === 'disable';

      if (isDisable) {
        whyItMattersAr = `إيقاف هذه المعاملة الدورية يوفر لك ${annualImpact.toLocaleString()} ج.م تراكمياً كل عام، ويقلص حرقك اليومي للمصاريف الثابتة.`;
        whyItMattersEn = `Cancelling this recurring subscription saves you ${annualImpact.toLocaleString()} EGP cumulatively every year, lowering your fixed daily burn rate.`;
      } else {
        whyItMattersAr = `إضافة هذا الالتزام الدوري تشكل عبئاً ثابتاً بقيمة ${annualImpact.toLocaleString()} ج.م سنوياً (${amt.toLocaleString()} ج.م/شهر) على تدفقك النقدي.`;
        whyItMattersEn = `Adding this recurring commitment introduces an annual fixed drag of ${annualImpact.toLocaleString()} EGP/year (${amt.toLocaleString()} EGP/mo) on your cash flow.`;
      }
      scenarioDetails.isDisable = isDisable;
      scenarioDetails.monthlyAmount = amt;
      scenarioDetails.annualImpact = annualImpact;
      suggestedAlternatives = [
        { id: 'reduce_half', labelKey: 'sandbox.alternatives.reduceHalf', labelAr: 'جرّب تقليص الباقة إلى 50%', labelEn: 'Try 50% tier reduction' }
      ];
    } else if (primaryAction.type === 'bill') {
      const amt = Number(pAction?.amount) || 0;
      whyItMattersAr = `سداد الفاتورة يحميك من أي غرامات تأخير ويبقي رصيدك عند ${cashAfter.toLocaleString()} ج.م مع ${billsSafe ? 'تغطية آمنة حتى الراتب القادم' : 'ضغط على السيولة'}.`;
      whyItMattersEn = `Paying this bill avoids late fees and leaves your cash at ${cashAfter.toLocaleString()} EGP with ${billsSafe ? 'safe coverage until next payday' : 'pressure on liquidity'}.`;
      scenarioDetails.amount = amt;
      suggestedAlternatives = [
        { id: 'delay_bill', labelKey: 'sandbox.alternatives.delayBill', labelAr: 'جرّب تأجيل السداد لأسبوعين', labelEn: 'Delay payment by 2 weeks' }
      ];
    } else if (primaryAction.type === 'budget') {
      const amt = Number(pAction?.amount) || 0;
      const sixMonthSurplus = amt * 6;
      whyItMattersAr = `الالتزام بهذا السقف الجديد سيوفر لك ${sixMonthSurplus.toLocaleString()} ج.م خلال 6 أشهر قادمة، مما يعزز قدرتك على تحقيق أهدافك الادخارية.`;
      whyItMattersEn = `Sticking to this revised cap will generate ${sixMonthSurplus.toLocaleString()} EGP in compound surplus over the next 6 months, accelerating your savings goals.`;
      scenarioDetails.amount = amt;
      scenarioDetails.sixMonthSurplus = sixMonthSurplus;
      suggestedAlternatives = [
        { id: 'cut_more_10', labelKey: 'sandbox.alternatives.cutMore10', labelAr: 'جرّب خفض 10% إضافية', labelEn: 'Cut additional 10%' },
        { id: 'cut_more_25', labelKey: 'sandbox.alternatives.cutMore25', labelAr: 'جرّب خفض 25% إضافية', labelEn: 'Cut additional 25%' }
      ];
    } else if (actions.length > 1) {
      whyItMattersAr = `السيناريو المركب يُحدث تأثيراً صافياً على رصيدك بمقدار ${cashDiff >= 0 ? '+' : ''}${cashDiff.toLocaleString()} ج.م مع ${billsSafe ? 'تغطية آمنة لالتزاماتك القادمة' : 'حاجة لمراقبة السيولة'}.`;
      whyItMattersEn = `This combined scenario has a net cash impact of ${cashDiff >= 0 ? '+' : ''}${cashDiff.toLocaleString()} EGP with ${billsSafe ? 'safe coverage for upcoming obligations' : 'caution needed on liquidity'}.`;
    } else {
      whyItMattersAr = verdictReasonAr;
      whyItMattersEn = verdictReasonEn;
    }

    decision.whyItMattersAr = whyItMattersAr;
    decision.whyItMattersEn = whyItMattersEn;
    decision.scenarioDetails = scenarioDetails;
    decision.suggestedAlternatives = suggestedAlternatives;

    // 11. Comparative Trade-off: Cash vs. Installment
    // STRICTLY for purchase and installment scenarios. MUST remain null for all other 6 decisions!
    let comparativeTradeoff = null;
    const isPurchaseAction = primaryAction.type === 'purchase';
    const isInstallmentAction = primaryAction.type === 'installment';

    if (isInstallmentAction) {
      const p = primaryAction.payload || {};
      const tot = Number(p.totalAmount) || 0;
      const down = Number(p.downPayment) || 0;
      const mos = Number(p.totalMonths) || 12;
      const mon = Number(p.monthlyAmount) || Math.round((tot - down) / Math.max(1, mos));

      // Option A: Pay Full in Cash
      const cashImmediateImpact = -tot;
      const cashReserve = Math.max(0, (before.emergencyReserve || 0) - tot);
      const cashBurn = before.essentialMonthlyBurn || 6000;
      const cashRunway = cashBurn > 0 ? Number((cashReserve / cashBurn).toFixed(1)) : 0;
      const cashRemainingAfterBills = (before.cashRemaining || 0) - tot;
      const cashBillsCovered = cashRemainingAfterBills >= 0;

      // Option B: Installment Plan
      const instImmediateImpact = -down;
      const instReserve = Math.max(0, (before.emergencyReserve || 0) - down);
      const instBurn = (before.essentialMonthlyBurn || 6000) + mon;
      const instRunway = instBurn > 0 ? Number((instReserve / instBurn).toFixed(1)) : 0;
      const instRemainingAfterBills = (before.cashRemaining || 0) - down;
      const instBillsCovered = instRemainingAfterBills >= 0;

      comparativeTradeoff = {
        simulatedMode: 'installment',
        totalAmount: tot,
        months: mos,
        downPayment: down,
        cash: {
          immediateCash: cashImmediateImpact,
          monthlyCommitment: 0,
          emergencyMonths: cashRunway,
          billsCovered: cashBillsCovered
        },
        installment: {
          immediateCash: instImmediateImpact,
          monthlyCommitment: mon,
          emergencyMonths: instRunway,
          billsCovered: instBillsCovered,
          totalMonths: mos
        }
      };
    } else if (isPurchaseAction) {
      const p = primaryAction.payload || {};
      const tot = Number(p.amount) || Math.abs(cashDiff);
      if (tot > 0) {
        // Option A: Cash (Simulated)
        const cashImmediateImpact = -tot;
        const cashRunway = after.emergencyCoverageMonths !== undefined ? after.emergencyCoverageMonths : 0;
        const cashBillsCovered = after.cashRemaining >= 0;

        // Option B: Realistic Installment alternative (12 months, 0 down)
        const sampleMonths = 12;
        const sampleDown = 0;
        const sampleMonthly = Math.round(tot / sampleMonths);
        const instReserve = before.emergencyReserve || 0;
        const instBurn = (before.essentialMonthlyBurn || 6000) + sampleMonthly;
        const instRunway = instBurn > 0 ? Number((instReserve / instBurn).toFixed(1)) : 0;
        const instBillsCovered = (before.cashRemaining || 0) >= 0;

        comparativeTradeoff = {
          simulatedMode: 'cash',
          totalAmount: tot,
          months: sampleMonths,
          downPayment: sampleDown,
          cash: {
            immediateCash: cashImmediateImpact,
            monthlyCommitment: 0,
            emergencyMonths: cashRunway,
            billsCovered: cashBillsCovered
          },
          installment: {
            immediateCash: -sampleDown,
            monthlyCommitment: sampleMonthly,
            emergencyMonths: instRunway,
            billsCovered: instBillsCovered,
            totalMonths: sampleMonths
          }
        };
      }
    }
    decision.comparativeTradeoff = comparativeTradeoff;

    // 12. Trade-off Suggestions (Strictly tailored to each decision type)
    const tradeOffSuggestions = [];
    if (hasOverdrawnAccount) {
      tradeOffSuggestions.push({
        type: 'transfer',
        textAr: 'قم بتحويل سيولة من حساباتك الأخرى أو اختر حساباً يحتوي على رصيد كافٍ قبل تنفيذ العملية.',
        textEn: 'Transfer liquidity from other accounts or select an account with sufficient balance before executing.'
      });
    }
    if (isPurchaseAction && verdictStatus === 'critical' && cashOutflow > 0 && !hasOverdrawnAccount) {
      tradeOffSuggestions.push({
        type: 'installment',
        textAr: 'بدلاً من الشراء النقدي الكامل، قارن هذا الخيار مع تقسيط المبلغ عبر 6 أو 12 شهراً لحماية درع الأمان.',
        textEn: 'Instead of full upfront payment, compare with a 6 or 12-month installment plan to protect your shield.'
      });
    }
    if (isInstallmentAction && dtiRatio !== null && dtiRatio > 35) {
      tradeOffSuggestions.push({
        type: 'tenure',
        textAr: 'زيادة مدة التقسيط (مثلاً من 6 إلى 12 شهر) تقلل القسط الشهري وتخفض عبء الديون إلى نطاق آمن.',
        textEn: 'Extending installment duration (e.g. from 6 to 12 months) lowers monthly burden into safe territory.'
      });
    }
    if (cashOutflow > 0 && recoveryDays && recoveryDays > 90) {
      tradeOffSuggestions.push({
        type: 'budget',
        textAr: 'ترشيد المصاريف المتغيرة بنسبة 15% يسرع فترة التعافي المالي بمقدار 25 يوماً.',
        textEn: 'Trimming variable discretionary spending by 15% accelerates financial recovery by 25 days.'
      });
    }
    decision.tradeOffSuggestions = tradeOffSuggestions;

    // 13. Backward-compatible Legacy fields
    decision.risk = verdictStatus === 'critical' ? 'Critical' : (verdictStatus === 'caution' ? 'Medium' : 'Low');
    // Note: decision.score is preserved as the dynamic resilience score (10–100)

    // 14. Concise, Actionable, Data-Grounded Insights (Max 2-4 items)
    // 1. Account overdraft insight (Critical) - ONLY if caused by this decision!
    if (hasOverdrawnAccount) {
      overdrawnAccounts.forEach(acc => {
        const defStr = (acc.deficit || 0).toLocaleString();
        insights.push({
          type: 'critical',
          title: 'Funding Account Overdraft Deficit',
          titleAr: 'عجز في رصيد الحساب المنفذ منه',
          titleEn: 'Funding Account Overdraft Deficit',
          message: `Funding account "${acc.name}" lacks sufficient funds and will overdraft by ${defStr} EGP.`,
          messageAr: `الحساب المحدد للعملية "${acc.name}" لا يملك رصيداً كافياً وسيسجل عجزاً ورصيداً مكشوفاً بقيمة ${defStr} ج.م.`,
          messageEn: `Funding account "${acc.name}" lacks sufficient funds and will overdraft by ${defStr} EGP.`
        });
      });
    }

    // 2. Emergency coverage change insight
    const shieldBeforeVal = decision.emergencyCoverageMonthsBefore || 0;
    const shieldAfterVal = decision.emergencyCoverageMonthsAfter || 0;
    if (shieldBeforeVal !== shieldAfterVal) {
      const isImprovement = shieldAfterVal > shieldBeforeVal;
      insights.push({
        type: isImprovement ? 'info' : (shieldAfterVal < 3 ? 'warning' : 'info'),
        title: isImprovement ? 'Emergency Shield Extended' : 'Emergency Buffer Change',
        titleAr: isImprovement ? 'تمديد درع الطوارئ' : 'تغير درع الطوارئ',
        titleEn: isImprovement ? 'Emergency Shield Extended' : 'Emergency Buffer Change',
        message: isImprovement
          ? `Your emergency coverage extends from ${shieldBeforeVal} to ${shieldAfterVal} months.`
          : `Your emergency coverage changes from ${shieldBeforeVal} to ${shieldAfterVal} months.`,
        messageAr: isImprovement
          ? `درع الطوارئ يرتفع ويمتد من ${shieldBeforeVal} إلى ${shieldAfterVal} شهر.`
          : `درع الطوارئ يتغير من ${shieldBeforeVal} إلى ${shieldAfterVal} شهر.`,
        messageEn: isImprovement
          ? `Your emergency coverage extends from ${shieldBeforeVal} to ${shieldAfterVal} months.`
          : `Your emergency coverage changes from ${shieldBeforeVal} to ${shieldAfterVal} months.`
      });
    }

    // 3. New installment monthly commitment insight (ONLY for installment!)
    if (isInstallmentAction) {
      const instBurdenDiff = (after.monthlyInstallmentBurden || 0) - (before.monthlyInstallmentBurden || 0);
      if (instBurdenDiff > 0) {
        insights.push({
          type: 'info',
          title: 'Monthly Installment Commitment',
          titleAr: 'التزام القسط الشهري الجديد',
          titleEn: 'Monthly Installment Commitment',
          message: `Your new installment adds ${instBurdenDiff.toLocaleString()} EGP to your monthly commitments.`,
          messageAr: `القسط الجديد يضيف ${instBurdenDiff.toLocaleString()} ج.م إلى التزاماتك الشهرية الثابتة.`,
          messageEn: `Your new installment adds ${instBurdenDiff.toLocaleString()} EGP to your monthly commitments.`
        });
      }
    }

    // 4. Bills Safety Insight (Only for scenarios that impact immediate cash or bills!)
    if (isPurchaseAction || isInstallmentAction || primaryAction.type === 'bill') {
      const unpaidBills = after.unpaidBillsTotal || 0;
      if (unpaidBills > 0) {
        if (after.cashRemaining >= 0) {
          insights.push({
            type: 'info',
            title: 'Upcoming Bills Safe',
            titleAr: 'الفواتير القادمة مغطاة',
            titleEn: 'Upcoming Bills Safe',
            message: `You will still have enough cash to cover your upcoming bills (${unpaidBills.toLocaleString()} EGP).`,
            messageAr: `سيتبقى معك رصيد كافٍ لتغطية فواتيرك القادمة (${unpaidBills.toLocaleString()} ج.م).`,
            messageEn: `You will still have enough cash to cover your upcoming bills (${unpaidBills.toLocaleString()} EGP).`
          });
        } else {
          const billsDeficit = Math.abs(after.cashRemaining);
          insights.push({
            type: 'critical',
            title: 'Bills At Risk',
            titleAr: 'عجز في تغطية الفواتير',
            titleEn: 'Bills At Risk',
            message: `Cash remaining after this decision is short of covering bills by ${billsDeficit.toLocaleString()} EGP.`,
            messageAr: `الرصيد المتبقي بعد هذا القرار لن يكفي لتغطية فواتيرك القادمة (عجز ${billsDeficit.toLocaleString()} ج.م).`,
            messageEn: `Cash remaining after this decision is short of covering bills by ${billsDeficit.toLocaleString()} EGP.`
          });
        }
      }
    }

    // 5. Floor breach warning (ONLY if caused by this decision!)
    if (decision.emergencyFloorBreached && !hasOverdrawnAccount) {
      insights.push({
        type: 'warning',
        title: 'Emergency Shield Breach',
        titleAr: 'اختراق درع الطوارئ',
        titleEn: 'Emergency Shield Breach',
        message: `Simulated balance drops below your emergency fund safety floor (${floorBreachPercent}% breach).`,
        messageAr: `الرصيد المتوقع يهبط أسفل حد الأمان لدرع الطوارئ (اختراق بنسبة ${floorBreachPercent}%).`,
        messageEn: `Simulated balance drops below your emergency fund safety floor (${floorBreachPercent}% breach).`
      });
    }

    // 6. DTI warning (ONLY if relevant to borrowing or installments!)
    if ((isInstallmentAction || isDebtBorrow) && dtiRatio !== null && dtiRatio > 40 && !hasOverdrawnAccount) {
      insights.push({
        type: 'critical',
        title: 'High Debt-to-Income Ratio',
        titleAr: 'ارتفاع نسبة عبء الدين',
        titleEn: 'High Debt-to-Income Ratio',
        message: `Monthly debt obligations equal ${dtiRatio}% of your monthly income (recommended max: 40%).`,
        messageAr: `الالتزامات والديون الشهرية تعادل ${dtiRatio}% من دخلك الشهري (الحد الأقصى الموصى به: 40%).`,
        messageEn: `Monthly debt obligations equal ${dtiRatio}% of your monthly income (recommended max: 40%).`
      });
    }

    // 15. Decision Metric Hints (Tailored explanation of what each number is based upon)
    let card1Hint = null;
    let card2Hint = null;
    let card3Hint = null;

    if (primaryType === 'salary') {
      card1Hint = {
        titleAr: 'الفائض الشهري الصافي',
        titleEn: 'Net Monthly Surplus',
        hintAr: `محسوب بطرح مصاريفك الأساسية (${(essentialBurn || 0).toLocaleString()} ج.م) من دخلك الجديد (${(after.monthlyIncome || 0).toLocaleString()} ج.م) لمعرفة الفائض المتاح للتوفير.`,
        hintEn: `Calculated by subtracting essential burn (${(essentialBurn || 0).toLocaleString()} EGP) from new income (${(after.monthlyIncome || 0).toLocaleString()} EGP) to determine net surplus.`
      };
      card2Hint = {
        titleAr: 'سرعة وتيرة الادخار',
        titleEn: 'Savings Velocity',
        hintAr: 'محسوب بمقارنة الفائض الشهري الجديد مع الفائض السابق لقياس نسبة تسارع نمو مدخراتك.',
        hintEn: 'Calculated by comparing the new net surplus to previous savings rate to measure growth acceleration.'
      };
      card3Hint = {
        titleAr: 'تغطية درع الطوارئ',
        titleEn: 'Emergency Shield Coverage',
        hintAr: `محسوب بقسمة الرصيد المتاح (${(cashAfter || 0).toLocaleString()} ج.م) على معدل الحرق الشهري لمعرفة عدد أشهر الصمود.`,
        hintEn: `Calculated by dividing available cash (${(cashAfter || 0).toLocaleString()} EGP) by essential burn to find months of runway.`
      };
    } else if (primaryType === 'debt') {
      const isBorrow = pAction?.action === 'borrow' || pAction?.action === 'take';
      card1Hint = {
        titleAr: isBorrow ? 'السيولة المقترضة' : 'السيولة المسددة',
        titleEn: isBorrow ? 'Borrowed Liquidity' : 'Repaid Principal',
        hintAr: isBorrow
          ? 'المبلغ النقدي الذي سيضاف مباشرة إلى حسابك ويزيد من السيولة الحالية.'
          : 'المبلغ النقدي الذي سيخصم من رصيدك لسداد أصل المديونية وتقليص الالتزامات.',
        hintEn: isBorrow
          ? 'Cash principal added directly to your account balance, expanding immediate liquidity.'
          : 'Cash debited from your balance to repay debt principal and lower future burden.'
      };
      card2Hint = {
        titleAr: 'إجمالي الديون المتبقية',
        titleEn: 'Total Debt Remaining',
        hintAr: 'إجمالي أصل المديونيات والأقساط المستحقة عليك بعد تسجيل هذه المعاملة.',
        hintEn: 'Total principal debt obligations outstanding across all loans following this action.'
      };
      card3Hint = {
        titleAr: 'نسبة عبء الدين (DTI)',
        titleEn: 'Debt-to-Income (DTI)',
        hintAr: `محسوب بنسبة إجمالي الأقساط والديون الشهرية إلى دخلك الشهري (${dtiRatio || 0}%). النطاق الصحي أقل من 30% والحد الأقصى 40%.`,
        hintEn: `Calculated as the percentage of monthly debt obligations relative to monthly income (${dtiRatio || 0}%). Healthy is < 30%, max is 40%.`
      };
    } else if (primaryType === 'investment') {
      const isBuy = pAction?.action === 'buy';
      card1Hint = {
        titleAr: isBuy ? 'السيولة المخصصة للاستثمار' : 'السيولة المستردة للكاش',
        titleEn: isBuy ? 'Liquid Cash Allocated' : 'Liquidated Cash Inflow',
        hintAr: isBuy
          ? 'السيولة النقدية المخصومة فورياً من حسابك لتحويلها إلى أصل استثماري.'
          : 'السيولة النقدية المودعة في حسابك بعد بيع وتسييل الأصل الاستثماري.',
        hintEn: isBuy
          ? 'Liquid cash deducted upfront from your account to purchase an investment asset.'
          : 'Liquid cash credited to your account from liquidating the investment.'
      };
      card2Hint = {
        titleAr: 'قيمة المحفظة الاستثمارية',
        titleEn: 'Portfolio Asset Value',
        hintAr: 'القيمة التقديرية التراكمية لجميع أصولك واستثماراتك بعد هذه العملية.',
        hintEn: 'Estimated cumulative market value of all investment assets following this action.'
      };
      card3Hint = {
        titleAr: 'تغطية درع الطوارئ',
        titleEn: 'Emergency Shield Coverage',
        hintAr: `محسوب بقسمة الكاش المتبقي (${(cashAfter || 0).toLocaleString()} ج.م) على معدل حرقك الشهري لضمان عدم تجميد كل السيولة.`,
        hintEn: `Calculated by dividing remaining cash (${(cashAfter || 0).toLocaleString()} EGP) by monthly burn to ensure emergency safety.`
      };
    } else if (primaryType === 'recurring') {
      const isDisable = pAction?.action === 'disable';
      card1Hint = {
        titleAr: isDisable ? 'الوفر الشهري' : 'العبء الشهري المضاف',
        titleEn: isDisable ? 'Monthly Savings' : 'Added Monthly Cost',
        hintAr: isDisable
          ? 'قيمة الاشتراك التي يتم إيقاف خصمها شهرياً مما يخفض مصاريفك الثابتة.'
          : 'قيمة الاشتراك المتكرر التي ستخصم شهرياً وتزيد من التزاماتك الثابتة.',
        hintEn: isDisable
          ? 'Subscription amount stopped monthly, directly reducing your fixed burn.'
          : 'Subscription cost added to your fixed monthly recurring commitments.'
      };
      card2Hint = {
        titleAr: 'الأثر التراكمي السنوي',
        titleEn: '12-Month Cumulative Cost',
        hintAr: 'محسوب بضرب القيمة الشهرية في 12 شهراً لإظهار التكلفة أو التوفير الحقيقي على مدار عام كامل.',
        hintEn: 'Calculated by multiplying monthly amount by 12 months to show true annual cost or savings.'
      };
      card3Hint = {
        titleAr: 'تغطية درع الطوارئ',
        titleEn: 'Emergency Shield Coverage',
        hintAr: 'محسوب بمدى تأثير تغير المصاريف الشهرية الثابتة على قدرة احتياطي الطوارئ على الصمود.',
        hintEn: 'Calculated by evaluating how change in fixed monthly burn alters emergency reserve runway.'
      };
    } else if (primaryType === 'bill') {
      card1Hint = {
        titleAr: 'قيمة الفاتورة المسددة',
        titleEn: 'Bill Amount Paid',
        hintAr: 'المبلغ المستحق الذي يخصم فوراً من الحساب لسداد الفاتورة وتفادي الغرامات.',
        hintEn: 'Due amount debited upfront from account to settle bill and avoid penalties.'
      };
      card2Hint = {
        titleAr: 'السيولة حتى الراتب القادم',
        titleEn: 'Cash Until Payday',
        hintAr: 'الرصيد النقدي الحر المتبقي بعد سداد الفاتورة لتغطية نفقاتك المعيشية اليومية حتى يوم الراتب.',
        hintEn: 'Free cash remaining after paying the bill to cover daily living costs until payday.'
      };
      card3Hint = {
        titleAr: 'الفواتير المجدولة المتبقية',
        titleEn: 'Upcoming Scheduled Bills',
        hintAr: 'مجموع الفواتير المتبقية المستحقة خلال الشهر للتأكد من عدم حدوث تعثر نقدي.',
        hintEn: 'Total scheduled bills remaining due this month to verify ongoing solvency.'
      };
    } else if (primaryType === 'budget') {
      card1Hint = {
        titleAr: 'سقف الإنفاق الشهري',
        titleEn: 'Monthly Spending Cap',
        hintAr: 'الحد الأقصى الجديد المعتمد لمصروفات هذه الفئة لحماية تدفقك المالي.',
        hintEn: 'New approved spending ceiling for this category to protect cash flow.'
      };
      card2Hint = {
        titleAr: 'الفائض التراكمي (6 أشهر)',
        titleEn: '6-Month Compound Surplus',
        hintAr: 'محسوب بضرب الوفر التقديري في 6 أشهر لإظهار حجم السيولة التراكمية المحققة.',
        hintEn: 'Calculated by multiplying estimated monthly savings by 6 months to show compound growth.'
      };
      card3Hint = {
        titleAr: 'تغطية درع الطوارئ',
        titleEn: 'Emergency Shield Coverage',
        hintAr: 'محسوب بتأثير خفض الإنفاق على خفض معدل الحرق اليومي وتمديد مدة درع الطوارئ.',
        hintEn: 'Calculated from lower spending rate extending emergency buffer runway.'
      };
    } else if (isInstallmentAction) {
      const p = primaryAction.payload || {};
      const down = Number(p.downPayment) || 0;
      const mos = Number(p.totalMonths) || 12;
      card1Hint = {
        titleAr: 'الخصم الفوري (المقدم)',
        titleEn: 'Immediate Down Payment',
        hintAr: down > 0
          ? `الدفعة الأولى النقدية المخصومة فوراً من رصيدك (${down.toLocaleString()} ج.م) لبدء خطة التقسيط.`
          : 'تقسيط بدون أي مقدم فوري، مما يحافظ على كامل رصيدك النقدي الحالي.',
        hintEn: down > 0
          ? `Cash down payment debited immediately (${down.toLocaleString()} EGP) to initiate installment plan.`
          : 'Zero down payment plan, preserving all of your upfront liquid cash.'
      };
      card2Hint = {
        titleAr: 'تغطية درع الطوارئ',
        titleEn: 'Emergency Shield Coverage',
        hintAr: `محسوب بقسمة الرصيد بعد خصم المقدم على مصاريفك الأساسية مضافاً إليها القسط الجديد.`,
        hintEn: 'Calculated by dividing cash after down payment by essential burn plus the new monthly installment.'
      };
      card3Hint = {
        titleAr: 'القسط الشهري الجديد',
        titleEn: 'New Monthly Payment',
        hintAr: `محسوب بقسمة المبلغ الممول بعد المقدم على مدة التقسيط (${mos} شهراً).`,
        hintEn: `Calculated by dividing financed balance over installment duration (${mos} months).`
      };
    } else {
      // Default: Cash Purchase
      card1Hint = {
        titleAr: 'السيولة المتبقية',
        titleEn: 'Available Cash',
        hintAr: `محسوب بطرح تكلفة الشراء الفورية (${Math.abs(cashDiff).toLocaleString()} ج.م) من رصيد الحساب المتاح.`,
        hintEn: `Calculated by subtracting upfront purchase cost (${Math.abs(cashDiff).toLocaleString()} EGP) from cash balance.`
      };
      card2Hint = {
        titleAr: 'تغطية درع الطوارئ',
        titleEn: 'Emergency Shield Coverage',
        hintAr: `محسوب بقسمة الرصيد المتبقي (${(cashAfter || 0).toLocaleString()} ج.م) على معدل حرقك الأساسي (${(essentialBurn || 0).toLocaleString()} ج.م/شهر).`,
        hintEn: `Calculated by dividing remaining cash (${(cashAfter || 0).toLocaleString()} EGP) by essential monthly burn (${(essentialBurn || 0).toLocaleString()} EGP/mo).`
      };
      card3Hint = {
        titleAr: 'الفواتير القادمة',
        titleEn: 'Upcoming Bills',
        hintAr: 'محسوب بمقارنة السيولة المتوفرة بعد الشراء مع الفواتير المجدولة للتأكد من كفايتها.',
        hintEn: 'Calculated by checking if post-purchase cash is sufficient to cover scheduled bills.'
      };
    }

    const metricHints = {
      card1: card1Hint,
      card2: card2Hint,
      card3: card3Hint,
      cash: card1Hint,
      shield: card2Hint,
      commitment: card3Hint
    };
    decision.metricHints = metricHints;

    // Cap to top 4 insights
    const finalInsights = insights.slice(0, 4);

    return { decision, insights: finalInsights };
  }
}

module.exports = DecisionEvaluator;
