module.exports = function debtScenario(state, payload) {
  // payload: { action: 'take' | 'repay', amount, accountId }
  
  if (payload.action === 'take') {
    // Taking debt increases our balance and increases total debt
    state.debts.push({
      _id: `sim_debt_${Date.now()}`,
      type: 'borrowed',
      amount: Number(payload.amount),
      paidAmount: 0
    });
    // Add to account
    state.transactions.push({
      _id: `sim_tx_${Date.now()}`,
      type: 'income',
      amount: Number(payload.amount),
      account: payload.accountId,
      date: new Date().toISOString(),
      notes: 'Simulated Borrowed Debt'
    });
  } else if (payload.action === 'repay') {
    // We add a repayment (decreases cash, decreases debt)
    // Assume paying off general debt
    state.transactions.push({
      _id: `sim_tx_${Date.now()}`,
      type: 'expense',
      amount: Number(payload.amount),
      account: payload.accountId,
      date: new Date().toISOString(),
      notes: 'Simulated Debt Repayment'
    });
    // Decrease an arbitrary debt or spread it
    let remainingToPay = Number(payload.amount);
    for (let d of state.debts) {
      if (d.type === 'borrowed' && d.paidAmount < d.amount) {
        const remainingOnDebt = d.amount - d.paidAmount;
        if (remainingToPay >= remainingOnDebt) {
          d.paidAmount = d.amount;
          remainingToPay -= remainingOnDebt;
        } else {
          d.paidAmount += remainingToPay;
          remainingToPay = 0;
          break;
        }
      }
    }
  }

  return state;
};
