const Transaction = require('../../models/Transaction');
const Account = require('../../models/Account');
const Budget = require('../../models/Budget');
const Debt = require('../../models/Debt');
const Bill = require('../../models/Bill');
const RecurringTransaction = require('../../models/RecurringTransaction');
const Investment = require('../../models/Investment');
const User = require('../../models/User');

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
      bills,
      recurring,
      investments,
      user
    ] = await Promise.all([
      Transaction.find({ user: userId }).lean(),
      Account.find({ user: userId }).lean(),
      Budget.find({ user: userId }).lean(),
      Debt.find({ user: userId }).lean(),
      Bill.find({ user: userId }).lean(),
      RecurringTransaction.find({ user: userId }).lean(),
      Investment.find({ user: userId }).lean(),
      User.findById(userId).lean()
    ]);

    return {
      userId,
      transactions,
      accounts,
      budgets,
      debts,
      bills,
      recurring,
      investments,
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
