class FinancialCalculator {
  static calculate(state) {
    const { accounts, transactions, debts, bills, investments, budgets, receivables } = state;
    
    // 1. Balance & Cash Available
    let currentBalance = 0;
    let cashAvailable = 0; // Balance from non-excluded accounts

    accounts.forEach(acc => {
      const accIdStr = acc._id.toString();
      
      // Calculate current balance based on transactions for this account
      // For income/expense, 'account' is used. For transfers, 'from_account' and 'to_account' are used.
      const accTransactions = transactions.filter(t => {
        if (t.type === 'transfer') {
          return t.from_account?.toString() === accIdStr || t.to_account?.toString() === accIdStr;
        }
        return t.account?.toString() === accIdStr;
      });
      
      let accBalance = acc.balance_adjustment || 0;
      
      accTransactions.forEach(t => {
        if (t.type === 'income') accBalance += t.amount;
        if (t.type === 'expense') accBalance -= t.amount;
        if (t.type === 'settlement') accBalance += t.amount; // depending on whether settlement acts as income
        if (t.type === 'transfer') {
          if (t.from_account?.toString() === accIdStr) accBalance -= t.amount;
          if (t.to_account?.toString() === accIdStr) accBalance += t.amount;
        }
      });
      
      if (receivables) {
        receivables.forEach(r => {
          if (r.paidFrom?.toString() === accIdStr) accBalance -= r.paidAmount;
          if (r.receivedTo?.toString() === accIdStr) accBalance += r.receivedAmount;
          if (r.participants) {
            r.participants.forEach(p => {
              if (p.payments) {
                p.payments.forEach(pay => {
                  if (pay.account?.toString() === accIdStr) accBalance += pay.amount;
                });
              }
            });
          }
        });
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

    // 3. Debt Summary
    let totalDebtRemaining = 0;
    debts.forEach(d => {
      if (d.type === 'borrowed') {
        const remaining = d.amount - (d.paidAmount || 0);
        totalDebtRemaining += remaining;
      }
    });

    // 4. Bills Coverage (Unpaid bills)
    let unpaidBillsTotal = 0;
    bills.forEach(b => {
      if (b.status === 'due_today' || b.status === 'overdue' || b.status === 'upcoming') {
        unpaidBillsTotal += b.expectedAmount;
      }
    });

    // 4.5 Monthly Fixed Expenses Burn Rate
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
          else monthly = r.amount; // fallback
          monthlyFixedExpenses += monthly;
        }
      });
    }

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

    return {
      currentBalance,
      cashAvailable,
      currentMonthIncome,
      currentMonthExpense,
      currentSavings,
      totalDebtRemaining,
      unpaidBillsTotal,
      totalInvestments,
      totalBudgetAmount,
      totalBudgetSpent,
      netWorth,
      cashRemaining,
      monthlyFixedExpenses,
      accounts: accounts.map(a => ({ _id: a._id, name: a.name, balance: a.calculatedBalance })),
      bills: bills.map(b => ({ _id: b._id, name: b.name, status: b.status, expectedAmount: b.expectedAmount }))
    };
  }
}

module.exports = FinancialCalculator;
