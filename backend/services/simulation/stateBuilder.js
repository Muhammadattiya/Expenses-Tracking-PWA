const Transaction = require('../../models/Transaction');
const Account = require('../../models/Account');
const Budget = require('../../models/Budget');
const Debt = require('../../models/Debt');
const DebtTransaction = require('../../models/DebtTransaction');
const Bill = require('../../models/Bill');
const RecurringTransaction = require('../../models/RecurringTransaction');
const Investment = require('../../models/Investment');
const User = require('../../models/User');
const Receivable = require('../../models/Receivable');
const Installment = require('../../models/Installment');
const InstallmentTransaction = require('../../models/InstallmentTransaction');
const SavingsGoal = require('../../models/SavingsGoal');
const EmergencyFund = require('../../models/EmergencyFund');
const IncomeProfile = require('../../models/IncomeProfile');

class StateBuilder {
  /**
   * Builds the current financial state of the user for simulation.
   * @param {String} userId 
   */
  static async buildState(userId) {
    const [
      transactions,
      accounts,
      budgets,
      debts,
      debtTransactions,
      bills,
      recurring,
      investments,
      user,
      receivables,
      installments,
      installmentTransactions,
      savingsGoals,
      emergencyFund,
      incomeProfiles
    ] = await Promise.all([
      Transaction.find({ user: userId }).lean(),
      Account.find({ user: userId, isArchived: { $ne: true } }).lean(),
      Budget.find({ user: userId }).lean(),
      Debt.find({ user: userId }).lean(),
      DebtTransaction.find({ user: userId }).lean(),
      Bill.find({ user: userId }).lean(),
      RecurringTransaction.find({ user: userId }).lean(),
      Investment.find({ user: userId }).lean(),
      User.findById(userId).lean(),
      Receivable.find({ user: userId }).lean(),
      Installment.find({ user: userId, status: 'active' }).lean(),
      InstallmentTransaction.find({ user: userId }).lean(),
      SavingsGoal.find({ user: userId }).lean(),
      EmergencyFund.findOne({ user: userId }).lean(),
      IncomeProfile.find({ user: userId, isActive: true }).lean()
    ]);

    let userMonthlyIncome = 0;
    if (incomeProfiles && incomeProfiles.length > 0) {
      for (const p of incomeProfiles) {
        if (p.frequency === 'daily') userMonthlyIncome += p.amount * 30;
        else if (p.frequency === 'weekly') userMonthlyIncome += p.amount * (52 / 12);
        else if (p.frequency === 'yearly') userMonthlyIncome += p.amount / 12;
        else userMonthlyIncome += p.amount;
      }
      userMonthlyIncome = Math.round(userMonthlyIncome);
    } else {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const pastIncomeTotal = (transactions || [])
        .filter(t => t.type === 'income' && new Date(t.date) >= sixtyDaysAgo)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      userMonthlyIncome = pastIncomeTotal > 0 ? Math.round(pastIncomeTotal / 2) : 0;
    }

    return {
      userId,
      transactions,
      accounts,
      budgets,
      debts,
      debtTransactions: debtTransactions || [],
      bills,
      recurring,
      investments,
      receivables,
      installments: installments || [],
      installmentTransactions: installmentTransactions || [],
      savingsGoals: savingsGoals || [],
      emergencyFund: emergencyFund || null,
      userMonthlyIncome,
      userPrefs: user?.preferences || {}
    };
  }

  /**
   * Deep clones the state so simulations don't mutate the original fetched state.
   */
  static cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }
}

module.exports = StateBuilder;
