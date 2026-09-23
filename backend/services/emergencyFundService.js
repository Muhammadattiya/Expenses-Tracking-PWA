const EmergencyFund = require('../models/EmergencyFund');
const Account = require('../models/Account');
const Bill = require('../models/Bill');
const RecurringTransaction = require('../models/RecurringTransaction');
const Installment = require('../models/Installment');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const DebtTransaction = require('../models/DebtTransaction');
const InstallmentTransaction = require('../models/InstallmentTransaction');
const Receivable = require('../models/Receivable');
const transactionService = require('./transactionService');
const AppError = require('../utils/AppError');

/**
 * Computes live balance for an account document.
 */
async function computeAccountBalance(userId, account) {
  if (!account) return 0;
  const accIdStr = account._id.toString();
  let bal = account.balance_adjustment || 0;

  // 1. Transactions
  const txs = await Transaction.find({
    user: userId,
    $or: [
      { account: account._id },
      { from_account: account._id },
      { to_account: account._id }
    ]
  }).select('type amount account from_account to_account').lean();

  for (const t of txs) {
    if (t.type === 'income' || t.type === 'settlement') bal += (t.amount || 0);
    else if (t.type === 'expense') bal -= (t.amount || 0);
    else if (t.type === 'transfer') {
      if (t.from_account?.toString() === accIdStr) bal -= (t.amount || 0);
      if (t.to_account?.toString() === accIdStr) bal += (t.amount || 0);
    }
  }

  // 2. Debt Transactions
  const debtTxs = await DebtTransaction.find({ user: userId, account: accIdStr })
    .populate('debtId', 'type')
    .lean();
  for (const dt of debtTxs) {
    const amt = Number(dt.amount) || 0;
    if (dt.type === 'loan') {
      if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') bal += amt;
      else bal -= amt;
    } else if (dt.type === 'repayment') {
      if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') bal -= amt;
      else bal += amt;
    }
  }

  // 3. Installment Transactions
  const instTxs = await InstallmentTransaction.find({ user: userId, account: accIdStr }).lean();
  for (const it of instTxs) {
    bal -= (Number(it.amount) || 0);
  }

  // 4. Receivables
  const recs = await Receivable.find({
    user: userId,
    $or: [
      { paidFrom: accIdStr },
      { receivedTo: accIdStr },
      { 'participants.payments.account': accIdStr }
    ]
  }).lean();
  for (const r of recs) {
    if (r.paidFrom?.toString() === accIdStr) bal -= (Number(r.paidAmount) || 0);
    if (r.receivedTo?.toString() === accIdStr) bal += (Number(r.receivedAmount) || 0);
    if (r.participants) {
      for (const p of r.participants) {
        if (p.payments) {
          for (const pay of p.payments) {
            if (pay.account?.toString() === accIdStr) bal += (Number(pay.amount) || 0);
          }
        }
      }
    }
  }

  return Math.round(bal);
}

/**
 * Calculates the user's essential monthly burn breakdown.
 */
async function calculateBurnBreakdown(userId) {
  // 1. Recurring Bills
  const bills = await Bill.find({ user: userId, isActive: true }).lean();
  let billsMonthly = 0;
  for (const b of bills) {
    const amt = Number(b.amount) || 0;
    if (b.repeat === 'weekly') billsMonthly += amt * (52 / 12);
    else if (b.repeat === 'yearly') billsMonthly += amt / 12;
    else billsMonthly += amt; // monthly default
  }

  // 2. Recurring Expenses
  const recurrings = await RecurringTransaction.find({ user: userId, isActive: true, type: 'expense' }).lean();
  let recurringMonthly = 0;
  for (const r of recurrings) {
    const amt = Number(r.amount) || 0;
    if (r.frequency === 'daily' || r.every === 'day') recurringMonthly += amt * 30;
    else if (r.frequency === 'weekly' || r.every === 'week') recurringMonthly += amt * (52 / 12);
    else if (r.frequency === 'yearly' || r.every === 'year') recurringMonthly += amt / 12;
    else recurringMonthly += amt;
  }

  // 3. Active Installments
  const installments = await Installment.find({ user: userId, status: 'active' }).lean();
  let installmentsMonthly = 0;
  for (const i of installments) {
    installmentsMonthly += Number(i.monthlyAmount) || 0;
  }

  // 4. Baseline Discretionary Essential Spend (Food, Housing, Utilities, Healthcare)
  const essentialKeywords = [
    'food', 'grocer', 'supermarket', 'market', 'housing', 'rent', 'utilit',
    'health', 'pharmacy', 'medic', 'أكل', 'طعام', 'سوبرماركت', 'تموين', 'سكن',
    'إيجار', 'كهرباء', 'مياه', 'غاز', 'صحة', 'علاج', 'أدوية', 'صيدلية'
  ];

  const categories = await Category.find({ user: userId }).lean();
  const essentialCategoryIds = categories
    .filter(c => {
      const name = (c.name || '').toLowerCase();
      return essentialKeywords.some(kw => name.includes(kw));
    })
    .map(c => c._id);

  let discretionaryBaseline = 0;

  // Check active category budgets for essential categories
  const activeBudgets = await Budget.find({
    user: userId,
    isActive: true,
    category: { $in: essentialCategoryIds }
  }).lean();

  if (activeBudgets && activeBudgets.length > 0) {
    discretionaryBaseline = activeBudgets.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  } else {
    // 60-day historical average fallback
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const pastEssentialSpend = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'expense',
          category: { $in: essentialCategoryIds },
          date: { $gte: sixtyDaysAgo }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    if (pastEssentialSpend && pastEssentialSpend.length > 0) {
      discretionaryBaseline = Math.round((pastEssentialSpend[0].total / 60) * 30);
    } else {
      // Conservative minimal baseline fallback if brand new user
      discretionaryBaseline = 3000;
    }
  }

  return {
    billsMonthly: Math.round(billsMonthly),
    recurringMonthly: Math.round(recurringMonthly),
    installmentsMonthly: Math.round(installmentsMonthly),
    discretionaryBaseline: Math.round(discretionaryBaseline)
  };
}

/**
 * Retrieves the live Financial Shield metrics.
 */
async function getEmergencyFundShield(userId) {
  let config = await EmergencyFund.findOne({ user: userId });
  if (!config) {
    config = new EmergencyFund({
      user: userId,
      targetMonths: 6
    });
    await config.save();
  }

  const burnBreakdown = await calculateBurnBreakdown(userId);
  const calculatedBurn = burnBreakdown.billsMonthly +
    burnBreakdown.recurringMonthly +
    burnBreakdown.installmentsMonthly +
    burnBreakdown.discretionaryBaseline;

  const essentialMonthlyBurn = (config.customMonthlyBurnOverride && config.customMonthlyBurnOverride > 0)
    ? config.customMonthlyBurnOverride
    : Math.max(1000, calculatedBurn);

  const targetMonths = config.targetMonths || 6;
  const targetAmount = Math.round(essentialMonthlyBurn * targetMonths);

  // Find linked emergency account
  let reserveAccount = null;
  if (config.linkedAccountId) {
    reserveAccount = await Account.findOne({ _id: config.linkedAccountId, user: userId });
  }

  if (!reserveAccount) {
    reserveAccount = await Account.findOne({ user: userId, isEmergencyFund: true });
  }

  if (!reserveAccount) {
    reserveAccount = await Account.findOne({ user: userId, isSavingsAccount: true });
  }

  if (!reserveAccount) {
    reserveAccount = await Account.findOne({ user: userId, isArchived: false }).sort({ balance_adjustment: -1 });
  }

  const currentReserveAmount = reserveAccount ? await computeAccountBalance(userId, reserveAccount) : 0;
  const fundingRatio = targetAmount > 0
    ? Math.min(100, Math.round((Math.max(0, currentReserveAmount) / targetAmount) * 100))
    : 0;

  const runwayDurationMonths = essentialMonthlyBurn > 0
    ? Number((Math.max(0, currentReserveAmount) / essentialMonthlyBurn).toFixed(1))
    : 0;

  let protectionTier = 'vulnerable';
  if (runwayDurationMonths >= 6) protectionTier = 'fortress';
  else if (runwayDurationMonths >= 3) protectionTier = 'solid';
  else if (runwayDurationMonths >= 1) protectionTier = 'basic';

  return {
    targetMonths,
    essentialMonthlyBurn,
    targetAmount,
    currentReserveAmount,
    fundingRatio,
    runwayDurationMonths,
    protectionTier,
    burnBreakdown,
    linkedAccount: reserveAccount ? {
      _id: reserveAccount._id,
      name: reserveAccount.name,
      type: reserveAccount.type,
      color: reserveAccount.color,
      balance: currentReserveAmount
    } : null
  };
}

/**
 * Updates user Emergency Fund preferences.
 */
async function updateEmergencyFund(userId, data) {
  let config = await EmergencyFund.findOne({ user: userId });
  if (!config) {
    config = new EmergencyFund({ user: userId });
  }

  if (data.targetMonths !== undefined) {
    config.targetMonths = Math.min(24, Math.max(1, Number(data.targetMonths)));
  }

  if (data.linkedAccountId !== undefined) {
    if (data.linkedAccountId) {
      const acc = await Account.findOne({ _id: data.linkedAccountId, user: userId });
      if (!acc) throw new AppError('Linked emergency account not found', 404);
      await Account.updateMany(
        { user: userId, _id: { $ne: data.linkedAccountId } },
        { $set: { isEmergencyFund: false } }
      );
      await Account.updateOne(
        { user: userId, _id: data.linkedAccountId },
        { $set: { isEmergencyFund: true } }
      );
      config.linkedAccountId = data.linkedAccountId;
    } else {
      await Account.updateMany(
        { user: userId },
        { $set: { isEmergencyFund: false } }
      );
      config.linkedAccountId = null;
    }
  }

  if (data.customMonthlyBurnOverride !== undefined) {
    config.customMonthlyBurnOverride = data.customMonthlyBurnOverride ? Number(data.customMonthlyBurnOverride) : null;
  }

  await config.save();
  return getEmergencyFundShield(userId);
}

/**
 * Deposits money from a source account into the emergency fund reserve.
 */
async function depositToEmergencyFund(userId, { fromAccountId, amount, notes }) {
  if (!fromAccountId || !amount || Number(amount) <= 0) {
    throw new AppError('Valid source account and amount required', 400);
  }

  const shield = await getEmergencyFundShield(userId);
  if (!shield.linkedAccount) {
    throw new AppError('No emergency fund account is configured', 400);
  }

  const toAccountId = shield.linkedAccount._id;

  if (fromAccountId.toString() === toAccountId.toString()) {
    throw new AppError('Source and destination accounts must be different', 400);
  }

  // Create transfer transaction via transactionService
  const tx = await transactionService.createTransaction(userId, {
    type: 'transfer',
    amount: Number(amount),
    from_account: fromAccountId,
    to_account: toAccountId,
    date: new Date(),
    notes: notes || 'تغذية درع الطوارئ المالي'
  }, { trusted: true });

  const updatedShield = await getEmergencyFundShield(userId);

  return {
    success: true,
    transaction: tx,
    shield: updatedShield
  };
}

module.exports = {
  computeAccountBalance,
  calculateBurnBreakdown,
  getEmergencyFundShield,
  updateEmergencyFund,
  depositToEmergencyFund
};
