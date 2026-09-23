module.exports = function installmentScenario(state, payload) {
  // payload: { title, provider, totalAmount, downPayment, monthlyAmount, totalMonths, dueDayOfMonth, linkedAccountId, startDate }
  const totalAmount = Number(payload.totalAmount) || 0;
  const downPayment = Number(payload.downPayment) || 0;
  const totalMonths = Number(payload.totalMonths) || 12;
  const monthlyAmount = Number(payload.monthlyAmount) || Math.round((totalAmount - downPayment) / Math.max(1, totalMonths));
  const dueDayOfMonth = Number(payload.dueDayOfMonth) || new Date().getDate();

  // 1. If there's an upfront down payment, create a simulated expense transaction
  if (downPayment > 0) {
    state.transactions.push({
      _id: `sim_tx_down_${Date.now()}`,
      type: 'expense',
      amount: downPayment,
      account: payload.linkedAccountId,
      date: payload.startDate || new Date().toISOString(),
      notes: `[Simulated Down Payment] ${payload.title || 'Installment'}`,
      isSimulation: true
    });
  }

  // 2. Add the simulated installment obligation to state.installments
  if (!state.installments) {
    state.installments = [];
  }

  state.installments.push({
    _id: `sim_inst_${Date.now()}`,
    title: payload.title || 'Simulated Installment',
    provider: payload.provider || 'valU',
    totalAmount,
    downPayment,
    monthlyAmount,
    totalMonths,
    paidMonths: 0,
    dueDayOfMonth,
    linkedAccountId: payload.linkedAccountId,
    status: 'active',
    isSimulation: true
  });

  return state;
};
