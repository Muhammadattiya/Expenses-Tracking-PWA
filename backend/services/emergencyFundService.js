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
const UserAnalyticsMonthly = require('../models/UserAnalyticsMonthly');
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
 * Implements Option 2 (Hybrid Model):
 * Monthly Burn Rate = Fixed Commitments (Bills + Recurring + Installments) + Actual Variable Monthly Expenses.
 *
 * Performance-optimized: Uses pre-aggregated UserAnalyticsMonthly to derive the user's
 * actual monthly expense in O(1) time, avoiding expensive ad-hoc collection scans on raw transactions.
 */
async function calculateBurnBreakdown(userId) {
  // 1. Recurring Bills (Active)
  const bills = await Bill.find({ user: userId, isActive: true }).lean();
  let billsMonthly = 0;
  for (const b of bills) {
    const amt = Number(b.expectedAmount ?? b.amount) || 0;
    if (b.repeat === 'weekly') billsMonthly += amt * (52 / 12);
    else if (b.repeat === 'yearly') billsMonthly += amt / 12;
    else billsMonthly += amt; // monthly default or active one-time
  }

  // 2. Recurring Expenses (Active)
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

  const fixedMonthlyCommitments = billsMonthly + recurringMonthly + installmentsMonthly;

  // 4. Actual Variable Monthly Expense (Discretionary Living / Survival Categories)
  // Utilizes pre-aggregated UserAnalyticsMonthly maintained in O(1) by analyticsEngine.
  // Supports user-selected survival categories with smart essential defaults.
  let discretionaryBaseline = 0;

  // Retrieve user's configured essential survival categories
  const efConfig = await EmergencyFund.findOne({ user: userId }).select('essentialCategoryIds').lean();
  let targetCategoryIds = (efConfig?.essentialCategoryIds || []).map(id => id.toString());

  // If user hasn't explicitly selected categories yet, auto-select default essential categories
  if (targetCategoryIds.length === 0) {
    const essentialKeywords = [
      'food', 'grocer', 'supermarket', 'market', 'housing', 'rent', 'utilit',
      'health', 'pharmacy', 'medic', 'أكل', 'طعام', 'سوبرماركت', 'تموين', 'سكن',
      'إيجار', 'كهرباء', 'مياه', 'غاز', 'صحة', 'علاج', 'أدوية', 'صيدلية', 'فواتير'
    ];
    const userCategories = await Category.find({ user: userId, type: 'expense' }).lean();
    targetCategoryIds = userCategories
      .filter(c => {
        const name = (c.name || '').toLowerCase();
        return essentialKeywords.some(kw => name.includes(kw));
      })
      .map(c => c._id.toString());
  }

  const currentMonthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  
  // Read up to 4 recent materialized monthly analytics documents (sub-millisecond indexed read)
  const monthlyDocs = await UserAnalyticsMonthly.find({ user: userId })
    .sort({ month: -1 })
    .limit(4)
    .select('month summary.expense categoryTotals')
    .lean();

  // Helper to extract survival category spend from a monthly analytics doc in O(1)
  const extractSurvivalSpend = (doc) => {
    if (!doc) return 0;
    if (targetCategoryIds.length > 0 && doc.categoryTotals) {
      let catSum = 0;
      for (const catId of targetCategoryIds) {
        const catData = doc.categoryTotals instanceof Map
          ? doc.categoryTotals.get(catId)
          : doc.categoryTotals[catId];
        if (catData && catData.amount > 0) {
          catSum += Number(catData.amount) || 0;
        }
      }
      return catSum;
    }
    return Math.max(0, (doc.summary?.expense || 0) - fixedMonthlyCommitments);
  };

  // Completed calendar months strictly before the current month with positive expenses
  const completedMonths = (monthlyDocs || []).filter(
    doc => doc.month < currentMonthKey && (doc.summary?.expense || 0) > 0
  );

  if (completedMonths.length > 0) {
    // Average across recent completed months (up to 3)
    const recentCompleted = completedMonths.slice(0, 3);
    const sum = recentCompleted.reduce((acc, d) => acc + extractSurvivalSpend(d), 0);
    discretionaryBaseline = Math.round(sum / recentCompleted.length);
  } else {
    // If no prior completed months exist, examine current month
    const currentDoc = (monthlyDocs || []).find(doc => doc.month === currentMonthKey);
    const currentExpense = currentDoc?.summary?.expense || 0;
    const dayOfMonth = new Date().getUTCDate();

    if (currentExpense > 0 && dayOfMonth >= 3) {
      const currentSurvival = extractSurvivalSpend(currentDoc);
      discretionaryBaseline = Math.round((currentSurvival / dayOfMonth) * 30);
    }
  }

  // Fallback for new accounts with minimal or no transaction history, or if variable calculated to 0
  if (discretionaryBaseline <= 0) {
    const activeBudgets = await Budget.find({
      user: userId,
      isActive: true,
      ...(targetCategoryIds.length > 0 ? { category: { $in: targetCategoryIds } } : {})
    }).lean();

    if (activeBudgets && activeBudgets.length > 0) {
      discretionaryBaseline = activeBudgets.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    } else {
      // Conservative minimal baseline for living expenses (food, essential supplies)
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
 * Uses cached/materialized EmergencyFund calculations if recent,
 * avoiding unnecessary re-computations on high-frequency UI visits.
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

  // Pre-aggregated cache check (TTL: 5 minutes)
  const CACHE_TTL_MS = 5 * 60 * 1000;
  const isFresh = config.lastReconciledAt &&
    (Date.now() - new Date(config.lastReconciledAt).getTime() < CACHE_TTL_MS) &&
    config.burnBreakdown &&
    config.essentialMonthlyBurn > 0;

  let burnBreakdown;
  let calculatedBurn;

  if (isFresh) {
    burnBreakdown = {
      billsMonthly: config.burnBreakdown.billsMonthly || 0,
      recurringMonthly: config.burnBreakdown.recurringMonthly || 0,
      installmentsMonthly: config.burnBreakdown.installmentsMonthly || 0,
      discretionaryBaseline: config.burnBreakdown.discretionaryBaseline || 0
    };
    calculatedBurn = burnBreakdown.billsMonthly +
      burnBreakdown.recurringMonthly +
      burnBreakdown.installmentsMonthly +
      burnBreakdown.discretionaryBaseline;
  } else {
    burnBreakdown = await calculateBurnBreakdown(userId);
    calculatedBurn = burnBreakdown.billsMonthly +
      burnBreakdown.recurringMonthly +
      burnBreakdown.installmentsMonthly +
      burnBreakdown.discretionaryBaseline;

    config.burnBreakdown = burnBreakdown;
    config.lastReconciledAt = new Date();
  }

  const essentialMonthlyBurn = (config.customMonthlyBurnOverride && config.customMonthlyBurnOverride > 0)
    ? config.customMonthlyBurnOverride
    : Math.max(1000, calculatedBurn);

  const targetMonths = config.targetMonths || 6;
  const targetAmount = Math.round(essentialMonthlyBurn * targetMonths);

  // Persist updated targets if modified or calculated
  if (!isFresh || config.essentialMonthlyBurn !== essentialMonthlyBurn || config.targetAmount !== targetAmount) {
    config.essentialMonthlyBurn = essentialMonthlyBurn;
    config.targetAmount = targetAmount;
    await config.save();
  }

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
    essentialCategoryIds: (config.essentialCategoryIds || []).map(id => id.toString()),
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

  if (data.essentialCategoryIds !== undefined) {
    config.essentialCategoryIds = Array.isArray(data.essentialCategoryIds)
      ? data.essentialCategoryIds.filter(id => id && String(id).length === 24)
      : [];
  }

  if (data.customMonthlyBurnOverride !== undefined) {
    config.customMonthlyBurnOverride = data.customMonthlyBurnOverride ? Number(data.customMonthlyBurnOverride) : null;
  }

  // Invalidate cached reconciliation date so metrics recalculate on save
  config.lastReconciledAt = null;
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

/**
 * Asynchronously reconciles and updates the emergency fund pre-aggregated metrics.
 * Can be called after transactions or commitments change.
 */
async function reconcileEmergencyFundBurn(userId) {
  try {
    const config = await EmergencyFund.findOne({ user: userId });
    if (!config) return;

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

    config.burnBreakdown = burnBreakdown;
    config.essentialMonthlyBurn = essentialMonthlyBurn;
    config.targetAmount = targetAmount;
    config.lastReconciledAt = new Date();
    await config.save();
  } catch (err) {
    console.error('[EMERGENCY_FUND] reconcileEmergencyFundBurn error:', err.message);
  }
}

module.exports = {
  computeAccountBalance,
  calculateBurnBreakdown,
  getEmergencyFundShield,
  updateEmergencyFund,
  depositToEmergencyFund,
  reconcileEmergencyFundBurn
};
