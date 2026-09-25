class FinancialCalculator {
  static calculate(state) {
    const { 
      accounts = [], 
      transactions = [], 
      debts = [], 
      debtTransactions = [],
      installmentTransactions = [],
      bills = [], 
      investments = [], 
      budgets = [], 
      receivables = [] 
    } = state;
    
    // 1. Balance & Cash Available
    let currentBalance = 0;
    let cashAvailable = 0; // Balance from non-excluded accounts

    accounts.forEach(acc => {
      const accIdStr = acc._id.toString();
      const isInvAcc = acc.type === 'investment' || acc.name === 'Investments' || acc.name === 'استثمارات';
      
      let accBalance = Number(acc.balance_adjustment) || 0;
      
      if (isInvAcc && state.investmentsValue !== undefined) {
        accBalance = state.investmentsValue;
      } else {
        // Calculate current balance based on transactions for this account
        // For income/expense, 'account' is used. For transfers, 'from_account' and 'to_account' are used.
        const accTransactions = transactions.filter(t => {
          if (t.type === 'transfer') {
            return t.from_account?.toString() === accIdStr || t.to_account?.toString() === accIdStr;
          }
          return t.account?.toString() === accIdStr;
        });
        
        accTransactions.forEach(t => {
          const amt = Number(t.amount) || 0;
          if (t.type === 'income') accBalance += amt;
          if (t.type === 'expense') accBalance -= amt;
          if (t.type === 'settlement') accBalance += amt;
          if (t.type === 'transfer') {
            if (t.from_account?.toString() === accIdStr) accBalance -= amt;
            if (t.to_account?.toString() === accIdStr) accBalance += amt;
          }
        });

        // 2. Debt Transactions (loans and repayments)
        if (debtTransactions) {
          debtTransactions.forEach(dt => {
            if (dt.account?.toString() === accIdStr) {
              const dtAmount = Number(dt.amount) || 0;
              const parentDebt = (debts || []).find(d => d._id?.toString() === (dt.debtId?._id || dt.debtId)?.toString());
              const debtType = dt.debtType || parentDebt?.type || dt.debtId?.type;
              if (dt.type === 'loan') {
                if (debtType === 'i_owe') accBalance += dtAmount;
                else accBalance -= dtAmount;
              } else if (dt.type === 'repayment') {
                if (debtType === 'i_owe') accBalance -= dtAmount;
                else accBalance += dtAmount;
              }
            }
          });
        }

        // 3. Installment Transactions
        if (installmentTransactions) {
          installmentTransactions.forEach(it => {
            if (it.account?.toString() === accIdStr) {
              accBalance -= (Number(it.amount) || 0);
            }
          });
        }
        
        // 4. Receivables
        if (receivables) {
          receivables.forEach(r => {
            if (r.paidFrom?.toString() === accIdStr) accBalance -= (Number(r.paidAmount) || 0);
            if (r.receivedTo?.toString() === accIdStr) accBalance += (Number(r.receivedAmount) || 0);
            if (r.participants) {
              r.participants.forEach(p => {
                if (p.payments) {
                  p.payments.forEach(pay => {
                    if (pay.account?.toString() === accIdStr) accBalance += (Number(pay.amount) || 0);
                  });
                }
              });
            }
          });
        }
      }

      acc.calculatedBalance = accBalance;

      if (!acc.excludeFromTotal) {
        currentBalance += accBalance;
        cashAvailable += accBalance;
      }
    });

    // 2. Savings (Income - Expense for current month)
    const now = new Date();
    const currentMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    let currentMonthIncome = 0;
    let currentMonthExpense = 0;
    currentMonthTx.forEach(t => {
      if (t.type === 'income') currentMonthIncome += t.amount;
      if (t.type === 'expense') currentMonthExpense += t.amount;
    });
    
    const currentSavings = currentMonthIncome - currentMonthExpense;

    // 3. Debt & Installments Summary
    let personalDebtRemaining = 0;
    debts.forEach(d => {
      if (d.type === 'borrowed') {
        const remaining = d.amount - (d.paidAmount || 0);
        personalDebtRemaining += remaining;
      }
    });

    let totalInstallmentObligations = 0;
    let monthlyInstallmentBurden = 0;
    let activeInstallmentsCount = 0;
    (state.installments || []).forEach(inst => {
      if (inst.status === 'active') {
        const remainingMonths = Math.max(0, (inst.totalMonths || 0) - (inst.paidMonths || 0));
        totalInstallmentObligations += remainingMonths * (inst.monthlyAmount || 0);
        monthlyInstallmentBurden += (inst.monthlyAmount || 0);
        activeInstallmentsCount += 1;
      }
    });

    const totalDebtRemaining = personalDebtRemaining + totalInstallmentObligations;

    // 4. Bills Coverage (Unpaid bills)
    let unpaidBillsTotal = 0;
    bills.forEach(b => {
      if (b.status === 'due_today' || b.status === 'overdue' || b.status === 'upcoming') {
        unpaidBillsTotal += b.expectedAmount;
      }
    });

    // 4.5 Monthly Fixed Expenses Burn Rate (bills + recurring + active installments)
    let monthlyFixedExpenses = 0;
    bills.forEach(b => {
      if (b.isActive) {
        let monthly = 0;
        if (b.repeat === 'weekly') monthly = b.expectedAmount * (52 / 12);
        else if (b.repeat === 'yearly') monthly = b.expectedAmount / 12;
        else if (b.repeat === 'monthly') monthly = b.expectedAmount;
        else if (b.status === 'due_today' || b.status === 'overdue' || b.status === 'upcoming') monthly = b.expectedAmount;
        monthlyFixedExpenses += monthly;
      }
    });
    
    if (state.recurring) {
      state.recurring.forEach(r => {
        if (r.isActive && r.type === 'expense') {
          let monthly = 0;
          if (r.repeatType === 'daily') monthly = r.amount * 30;
          else if (r.repeatType === 'weekly') monthly = r.amount * (52 / 12);
          else if (r.repeatType === 'yearly') monthly = r.amount / 12;
          else if (r.repeatType === 'monthly') monthly = r.amount;
          else monthly = r.amount;
          monthlyFixedExpenses += monthly;
        }
      });
    }

    monthlyFixedExpenses += monthlyInstallmentBurden;

    // Essential Monthly Burn (Fixed expenses + Essential category budgets or baseline)
    let essentialBudget = 0;
    (budgets || []).forEach(b => {
      essentialBudget += (b.amount || 0);
    });
    const essentialMonthlyBurn = Math.round(monthlyFixedExpenses + (essentialBudget > 0 ? essentialBudget : 3000));

    // Emergency Shield Reserve & Coverage Runway
    let emergencyReserve = 0;
    const emergencyAcc = accounts.find(a => a.isEmergencyFund);
    if (emergencyAcc) {
      emergencyReserve = emergencyAcc.calculatedBalance || 0;
    } else if (state.emergencyFund?.currentReserveAmount) {
      emergencyReserve = state.emergencyFund.currentReserveAmount;
    } else {
      emergencyReserve = Math.max(0, cashAvailable);
    }

    const emergencyCoverageMonths = essentialMonthlyBurn > 0
      ? Number((emergencyReserve / essentialMonthlyBurn).toFixed(1))
      : 0;

    // 5. Investments Summary
    let totalInvestments = 0;
    investments.forEach(inv => {
      totalInvestments += inv.quantity * (inv.currentValue || inv.purchasePrice);
    });

    // 6. Budget Usage
    let totalBudgetAmount = 0;
    let totalBudgetSpent = 0;
    budgets.forEach(b => {
      totalBudgetAmount += b.amount;
      // Find expenses in this budget category for the current month
      const bCategoryIdStr = b.category?.toString();
      const bExpenses = currentMonthTx.filter(t => t.type === 'expense' && t.category?.toString() === bCategoryIdStr);
      const spent = bExpenses.reduce((sum, t) => sum + t.amount, 0);
      b.spent = spent;
      totalBudgetSpent += spent;
    });

    // 7. Net Worth
    const netWorth = cashAvailable + totalInvestments - totalDebtRemaining;

    // 8. Cash Remaining after bills
    const cashRemaining = cashAvailable - unpaidBillsTotal;

    // 9. Debt-to-Income (DTI) Ratio
    const monthlyIncome = state.userMonthlyIncome || 0;
    const dtiRatio = monthlyIncome > 0
      ? Number(((monthlyInstallmentBurden / monthlyIncome) * 100).toFixed(1))
      : null;

    return {
      currentBalance,
      cashAvailable,
      currentMonthIncome,
      currentMonthExpense,
      currentSavings,
      totalDebtRemaining,
      personalDebtRemaining,
      totalInstallmentObligations,
      monthlyInstallmentBurden,
      activeInstallmentsCount,
      unpaidBillsTotal,
      totalInvestments,
      totalBudgetAmount,
      totalBudgetSpent,
      netWorth,
      cashRemaining,
      monthlyFixedExpenses,
      essentialMonthlyBurn,
      emergencyReserve,
      emergencyCoverageMonths,
      dtiRatio,
      monthlyIncome,
      accounts: accounts.map(a => ({ _id: a._id, name: a.name, balance: a.calculatedBalance })),
      bills: bills.map(b => ({ _id: b._id, name: b.name, status: b.status, expectedAmount: b.expectedAmount }))
    };
  }
}

module.exports = FinancialCalculator;
