module.exports = function budgetScenario(state, payload) {
  // payload: { action: 'increase' | 'decrease' | 'create' | 'delete', categoryId, amount }
  
  if (payload.action === 'create') {
    state.budgets.push({
      _id: `sim_bdg_${Date.now()}`,
      category: payload.categoryId,
      amount: Number(payload.amount),
      period: 'monthly'
    });
  } else if (payload.action === 'delete') {
    state.budgets = state.budgets.filter(b => b.category?.toString() !== payload.categoryId);
  } else {
    // increase or decrease
    const budget = state.budgets.find(b => b.category?.toString() === payload.categoryId);
    if (budget) {
      if (payload.action === 'increase') {
        budget.amount += Number(payload.amount);
      } else if (payload.action === 'decrease') {
        budget.amount -= Number(payload.amount);
        if (budget.amount < 0) budget.amount = 0;
      }
    }
  }

  return state;
};
