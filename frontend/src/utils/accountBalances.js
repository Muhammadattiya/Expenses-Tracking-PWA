/**
 * Centralized Authoritative Account Balance Calculator
 * Matches Dashboard.jsx and AccountManagement.jsx calculations.
 */
export function calculateAccountBalances({
  accounts = [],
  transactions = [],
  debtTransactions = [],
  installmentTransactions = [],
  receivables = [],
  investmentsValue = 0
}) {
  const isInvestmentAccount = (a) => a?.type === 'investment' || a?.name === 'Investments' || a?.name === 'استثمارات';
  const balances = new Map();

  accounts.forEach(account => {
    const accId = (account._id || account).toString();
    if (!accId) return;

    if (isInvestmentAccount(account)) {
      balances.set(accId, investmentsValue || 0);
      return;
    }

    let balance = Number(account.balance_adjustment) || 0;

    // 1. Regular Transactions (income, expense, transfer, settlement)
    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      const tAccId = (t.account?._id || t.account)?.toString();
      const tFromId = (t.from_account?._id || t.from_account)?.toString();
      const tToId = (t.to_account?._id || t.to_account)?.toString();

      if (t.type === 'income' && tAccId === accId) balance += amt;
      else if (t.type === 'expense' && tAccId === accId) balance -= amt;
      else if (t.type === 'transfer') {
        if (tToId === accId) balance += amt;
        if (tFromId === accId) balance -= amt;
      } else if (t.type === 'settlement' && tAccId === accId) balance += amt;
    });

    // 2. Debt Transactions (loans and repayments)
    debtTransactions.forEach(dt => {
      const dtAccId = (dt.account?._id || dt.account)?.toString();
      if (dtAccId === accId) {
        const amt = Number(dt.amount) || 0;
        if (dt.type === 'loan') {
          if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') balance += amt;
          else balance -= amt;
        } else if (dt.type === 'repayment') {
          if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') balance -= amt;
          else balance += amt;
        }
      }
    });

    // 3. Installment Transactions
    installmentTransactions.forEach(it => {
      const itAccId = (it.account?._id || it.account)?.toString();
      if (itAccId === accId) {
        balance -= (Number(it.amount) || 0);
      }
    });

    // 4. Receivables
    receivables.forEach(r => {
      const paidFromId = (r.paidFrom?._id || r.paidFrom)?.toString();
      const recToId = (r.receivedTo?._id || r.receivedTo)?.toString();
      if (paidFromId === accId) balance -= (Number(r.paidAmount) || 0);
      if (recToId === accId) balance += (Number(r.receivedAmount) || 0);
      if (r.participants) {
        r.participants.forEach(p => {
          if (p.payments) {
            p.payments.forEach(pay => {
              const payAccId = (pay.account?._id || pay.account)?.toString();
              if (payAccId === accId) balance += (Number(pay.amount) || 0);
            });
          }
        });
      }
    });

    balances.set(accId, Math.round(balance));
  });

  return balances;
}
