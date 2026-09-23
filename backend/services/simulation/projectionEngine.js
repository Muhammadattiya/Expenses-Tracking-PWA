/**
 * ProjectionEngine: Computes multi-month discrete-event financial trajectories
 * for the Finova Financial Sandbox using conservative hybrid spending models.
 */

class ProjectionEngine {
  /**
   * Projects 3, 6, or 12 month forward trajectories.
   * @param {Object} baseState - Financial state snapshot from StateBuilder
   * @param {Object} simulatedState - Mutated state after applying scenario pipeline
   * @param {Number} horizonMonths - 3, 6, or 12 (default 6)
   */
  static projectTrajectory(baseState, simulatedState, horizonMonths = 6) {
    const horizon = [3, 6, 12].includes(Number(horizonMonths)) ? Number(horizonMonths) : 6;
    const totalDays = horizon * 30;

    // 1. Initial Spendable Balances
    const getSpendableBalance = (accounts) => {
      return (accounts || [])
        .filter(a => !a.excludeFromTotal)
        .reduce((sum, a) => sum + (Number(a.calculatedBalance) || 0), 0);
    };

    let currBaseline = getSpendableBalance(baseState.accounts);
    let currSimulated = getSpendableBalance(simulatedState.accounts);

    // 2. Conservative Hybrid Variable Discretionary Spending
    // Formula: Sum_c max(Active Budget Limit(c), 60-Day Historical Monthly Avg(c))
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const past60Txs = (baseState.transactions || []).filter(t => {
      const d = new Date(t.date);
      return d >= sixtyDaysAgo && d <= now && t.type === 'expense';
    });

    // Compute category 60-day historical monthly averages (total / 2)
    const categoryAverages = new Map();
    past60Txs.forEach(t => {
      const catId = (t.category?._id || t.category || 'uncategorized').toString();
      const prev = categoryAverages.get(catId) || 0;
      categoryAverages.set(catId, prev + (Number(t.amount) || 0));
    });

    for (const [catId, total] of categoryAverages.entries()) {
      categoryAverages.set(catId, Math.round(total / 2));
    }

    // Active category budgets
    const activeBudgets = new Map();
    (baseState.budgets || []).forEach(b => {
      if (b.category && b.amount) {
        const catId = (b.category?._id || b.category).toString();
        activeBudgets.set(catId, Number(b.amount) || 0);
      }
    });

    // Union of all categories
    const allCategories = new Set([...categoryAverages.keys(), ...activeBudgets.keys()]);
    let monthlyDiscretionary = 0;
    allCategories.forEach(catId => {
      const budgetLimit = activeBudgets.get(catId) || 0;
      const histAvg = categoryAverages.get(catId) || 0;
      monthlyDiscretionary += Math.max(budgetLimit, histAvg);
    });

    // If historical data is sparse, ensure reasonable baseline
    if (monthlyDiscretionary === 0) {
      monthlyDiscretionary = 3000;
    }
    const dailyDiscretionary = Math.round(monthlyDiscretionary / 30);

    // 3. Monthly Net Income Estimation
    // Active recurring income transactions
    const recurringIncomes = (baseState.recurring || []).filter(r => r.type === 'income' && r.isActive !== false);
    let monthlyIncome = 0;
    if (recurringIncomes.length > 0) {
      recurringIncomes.forEach(r => {
        const amt = Number(r.amount) || 0;
        if (r.frequency === 'daily' || r.every === 'day') monthlyIncome += amt * 30;
        else if (r.frequency === 'weekly' || r.every === 'week') monthlyIncome += amt * (52 / 12);
        else if (r.frequency === 'yearly' || r.every === 'year') monthlyIncome += amt / 12;
        else monthlyIncome += amt; // monthly default
      });
    } else {
      // Historical 60-day income transactions average
      const incomeTxs = (baseState.transactions || []).filter(t => {
        const d = new Date(t.date);
        return d >= sixtyDaysAgo && d <= now && t.type === 'income';
      });
      const totalPastIncome = incomeTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      monthlyIncome = totalPastIncome > 0 ? Math.round(totalPastIncome / 2) : 10000;
    }

    // 4. Fixed Monthly Commitments (Bills + Recurring Expenses + Installments)
    const calculateFixedBurden = (stateObj) => {
      let billsTotal = 0;
      (stateObj.bills || []).forEach(b => {
        if (b.isActive !== false) {
          const amt = Number(b.amount) || 0;
          if (b.repeat === 'weekly') billsTotal += amt * (52 / 12);
          else if (b.repeat === 'yearly') billsTotal += amt / 12;
          else billsTotal += amt;
        }
      });

      let recurTotal = 0;
      (stateObj.recurring || []).forEach(r => {
        if (r.type === 'expense' && r.isActive !== false) {
          const amt = Number(r.amount) || 0;
          if (r.frequency === 'daily' || r.every === 'day') recurTotal += amt * 30;
          else if (r.frequency === 'weekly' || r.every === 'week') recurTotal += amt * (52 / 12);
          else if (r.frequency === 'yearly' || r.every === 'year') recurTotal += amt / 12;
          else recurTotal += amt;
        }
      });

      let instTotal = 0;
      (stateObj.installments || []).forEach(inst => {
        if (inst.status === 'active') {
          instTotal += Number(inst.monthlyAmount) || 0;
        }
      });

      return {
        billsTotal: Math.round(billsTotal),
        recurTotal: Math.round(recurTotal),
        instTotal: Math.round(instTotal),
        essentialMonthlyBurn: Math.round(billsTotal + recurTotal + instTotal + monthlyDiscretionary)
      };
    };

    const baseFixed = calculateFixedBurden(baseState);
    const simFixed = calculateFixedBurden(simulatedState);

    // 5. Emergency Safety Floor
    let safetyFloor = 0;
    if (baseState.emergencyFund?.targetAmount) {
      safetyFloor = Number(baseState.emergencyFund.targetAmount);
    } else {
      const targetMonths = baseState.emergencyFund?.targetMonths || 3;
      safetyFloor = baseFixed.essentialMonthlyBurn * targetMonths;
    }

    // 6. Day-by-Day Discrete Event Simulation
    const dailyPoints = [];
    let minSimulatedBalance = currSimulated;
    let minBaselineBalance = currBaseline;

    const startDate = new Date();

    for (let d = 1; d <= totalDays; d++) {
      const pointDate = new Date(startDate.getTime() + d * 24 * 60 * 60 * 1000);
      const dayOfMonth = pointDate.getDate();
      const monthIndex = Math.floor((d - 1) / 30);

      // Baseline day cash flow:
      let baseDayIn = 0;
      let baseDayOut = dailyDiscretionary;

      // Simulated day cash flow:
      let simDayIn = 0;
      let simDayOut = dailyDiscretionary;

      // Income injected once a month (e.g. day 1 or 28)
      if (dayOfMonth === 1) {
        baseDayIn += monthlyIncome;
        simDayIn += monthlyIncome;
      }

      // Bills due on this day (approximate on day 5 or bill.dueDay)
      (baseState.bills || []).forEach(b => {
        if (b.isActive !== false) {
          const dueDay = b.dueDay || 10;
          if (dayOfMonth === dueDay) baseDayOut += Number(b.amount) || 0;
        }
      });
      (simulatedState.bills || []).forEach(b => {
        if (b.isActive !== false) {
          const dueDay = b.dueDay || 10;
          if (dayOfMonth === dueDay) simDayOut += Number(b.amount) || 0;
        }
      });

      // Installments due on this day:
      (baseState.installments || []).forEach(inst => {
        if (inst.status === 'active') {
          const totalM = Number(inst.totalMonths) || 12;
          const paidM = Number(inst.paidMonths) || 0;
          if (paidM + monthIndex < totalM) {
            const dueDay = Math.min(Number(inst.dueDayOfMonth) || 15, 28);
            if (dayOfMonth === dueDay) baseDayOut += Number(inst.monthlyAmount) || 0;
          }
        }
      });
      (simulatedState.installments || []).forEach(inst => {
        if (inst.status === 'active') {
          const totalM = Number(inst.totalMonths) || 12;
          const paidM = Number(inst.paidMonths) || 0;
          if (paidM + monthIndex < totalM) {
            const dueDay = Math.min(Number(inst.dueDayOfMonth) || 15, 28);
            if (dayOfMonth === dueDay) simDayOut += Number(inst.monthlyAmount) || 0;
          }
        }
      });

      currBaseline += (baseDayIn - baseDayOut);
      currSimulated += (simDayIn - simDayOut);

      if (currSimulated < minSimulatedBalance) minSimulatedBalance = currSimulated;
      if (currBaseline < minBaselineBalance) minBaselineBalance = currBaseline;

      const dateStr = pointDate.toISOString().substring(0, 10);

      dailyPoints.push({
        day: d,
        date: dateStr,
        monthIndex,
        baselineBalance: Math.round(currBaseline),
        simulatedBalance: Math.round(currSimulated),
        safetyFloorBalance: Math.round(safetyFloor)
      });
    }

    // 7. Monthly Aggregated Trajectory Points for smoother UI charts
    const monthlyPoints = [];
    for (let m = 0; m < horizon; m++) {
      const monthEndDay = (m + 1) * 30;
      const point = dailyPoints[monthEndDay - 1] || dailyPoints[dailyPoints.length - 1];
      const monthDate = new Date(startDate.getTime() + monthEndDay * 24 * 60 * 60 * 1000);
      
      const monthNameAr = monthDate.toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' });
      const monthNameEn = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      monthlyPoints.push({
        month: m + 1,
        date: point.date,
        labelAr: monthNameAr,
        labelEn: monthNameEn,
        baselineBalance: point.baselineBalance,
        simulatedBalance: point.simulatedBalance,
        safetyFloorBalance: point.safetyFloorBalance,
        delta: point.simulatedBalance - point.baselineBalance
      });
    }

    // 8. Evaluation Metrics
    const floorBreachAmount = Math.max(0, safetyFloor - minSimulatedBalance);
    const floorBreachPercent = safetyFloor > 0 ? Math.round((floorBreachAmount / safetyFloor) * 100) : 0;
    const breachedFloor = floorBreachAmount > 0;

    return {
      horizonMonths: horizon,
      safetyFloor: Math.round(safetyFloor),
      minSimulatedBalance: Math.round(minSimulatedBalance),
      minBaselineBalance: Math.round(minBaselineBalance),
      breachedFloor,
      floorBreachAmount: Math.round(floorBreachAmount),
      floorBreachPercent,
      monthlyIncome: Math.round(monthlyIncome),
      monthlyDiscretionary: Math.round(monthlyDiscretionary),
      essentialMonthlyBurn: simFixed.essentialMonthlyBurn,
      dailyPoints,
      monthlyPoints
    };
  }
}

module.exports = ProjectionEngine;
