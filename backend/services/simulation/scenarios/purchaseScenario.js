module.exports = function purchaseScenario(state, payload) {
  // payload: { amount, categoryId, accountId, date, notes }
  const newTransaction = {
    _id: `sim_tx_${Date.now()}`,
    type: 'expense',
    amount: Number(payload.amount),
    category: payload.categoryId,
    account: payload.accountId,
    date: payload.date || new Date().toISOString(),
    notes: payload.notes || 'Simulated Purchase',
    isSimulation: true
  };
  
  state.transactions.push(newTransaction);
  return state;
};
