module.exports = function recurringScenario(state, payload) {
  // payload: { action: 'disable' | 'enable' | 'edit', recurringId, amount }
  
  const rec = state.recurring.find(r => r._id?.toString() === payload.recurringId);
  
  if (rec) {
    if (payload.action === 'disable') {
      rec.status = 'paused';
    } else if (payload.action === 'enable') {
      rec.status = 'active';
    } else if (payload.action === 'edit') {
      rec.amount = Number(payload.amount);
    }
  }

  // A recurring transaction doesn't immediately affect balance until it executes.
  // But for the sake of the sandbox, we could project it if we had a projection logic.
  // Currently, the financialCalculator just calculates based on existing transactions.
  // So editing a recurring doesn't change today's balance. It's an insight.
  
  return state;
};
