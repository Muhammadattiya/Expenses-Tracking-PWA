module.exports = function investmentScenario(state, payload) {
  // payload: { action: 'buy' | 'sell', amount, accountId }
  
  if (payload.action === 'buy') {
    state.investments.push({
      _id: `sim_inv_${Date.now()}`,
      name: 'Simulated Investment',
      type: 'custom',
      quantity: 1,
      purchasePrice: Number(payload.amount),
      currentValue: Number(payload.amount)
    });
    
    state.transactions.push({
      _id: `sim_tx_${Date.now()}`,
      type: 'expense',
      amount: Number(payload.amount),
      account: payload.accountId,
      date: new Date().toISOString(),
      notes: 'Simulated Investment Purchase'
    });
  } else if (payload.action === 'sell') {
    state.transactions.push({
      _id: `sim_tx_${Date.now()}`,
      type: 'income',
      amount: Number(payload.amount),
      account: payload.accountId,
      date: new Date().toISOString(),
      notes: 'Simulated Investment Sale'
    });
    // Find an investment and reduce it
    if (state.investments.length > 0) {
      // Just subtract from the first one for simplicity in this sandbox version
      const inv = state.investments[0];
      const val = inv.currentValue || inv.purchasePrice;
      // simplistic deduction
      if (val > Number(payload.amount)) {
        inv.currentValue = val - Number(payload.amount);
      } else {
        state.investments.shift();
      }
    }
  }

  return state;
};
