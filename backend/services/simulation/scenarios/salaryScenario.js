module.exports = function salaryScenario(state, payload) {
  // payload: { newAmount, accountId, categoryId, date }
  
  // Find current month's salary to replace it or just add the difference?
  // A simple way is to inject a new income transaction with the difference,
  // or just add a new income transaction.
  // The simplest is just adding a new simulated income transaction.
  
  const newTransaction = {
    _id: `sim_tx_${Date.now()}`,
    type: 'income',
    amount: Number(payload.newAmount),
    category: payload.categoryId, // usually the Salary category
    account: payload.accountId,
    date: payload.date || new Date().toISOString(),
    notes: 'Simulated Salary Change',
    isSimulation: true
  };

  state.transactions.push(newTransaction);
  return state;
};
