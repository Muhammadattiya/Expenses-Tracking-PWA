module.exports = function billScenario(state, payload) {
  // payload: { action: 'pay' | 'delay' | 'delete' | 'add', billId, amount, accountId }
  
  if (payload.action === 'add') {
    state.bills.push({
      _id: `sim_bill_${Date.now()}`,
      name: 'Simulated Bill',
      expectedAmount: Number(payload.amount),
      status: 'upcoming'
    });
  } else if (payload.action === 'delete') {
    state.bills = state.bills.filter(b => b._id?.toString() !== payload.billId);
  } else if (payload.action === 'delay') {
    // doesn't really change the math of unpaid bills unless we filter by date, 
    // but we can just mark it differently or leave it pending.
    const bill = state.bills.find(b => b._id?.toString() === payload.billId);
    if (bill) {
      bill.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // push 30 days
    }
  } else if (payload.action === 'pay') {
    const bill = state.bills.find(b => b._id?.toString() === payload.billId);
    if (bill) {
      bill.status = 'paid';
      state.transactions.push({
        _id: `sim_tx_${Date.now()}`,
        type: 'expense',
        amount: bill.expectedAmount,
        account: payload.accountId,
        date: new Date().toISOString(),
        notes: `Simulated Bill Payment: ${bill.name}`
      });
    }
  }

  return state;
};
