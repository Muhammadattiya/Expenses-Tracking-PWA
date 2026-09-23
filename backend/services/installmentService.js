const Installment = require('../models/Installment');
const InstallmentTransaction = require('../models/InstallmentTransaction');
const Account = require('../models/Account');
const IncomeProfile = require('../models/IncomeProfile');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const transactionService = require('./transactionService');
const AppError = require('../utils/AppError');

/**
 * Calculates next execution date clamping dueDayOfMonth to the days in target month.
 */
function calculateNextDueDate(dueDayOfMonth, referenceDate = new Date()) {
  const targetDay = Number(dueDayOfMonth);
  const now = new Date(referenceDate);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const effectiveDayThisMonth = Math.min(targetDay, daysInCurrentMonth);
  const candidateThisMonth = new Date(currentYear, currentMonth, effectiveDayThisMonth, 0, 0, 0, 0);

  if (candidateThisMonth >= now) {
    return candidateThisMonth;
  }

  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const nextMonth = (currentMonth + 1) % 12;
  const daysInNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
  const effectiveDayNextMonth = Math.min(targetDay, daysInNextMonth);
  return new Date(nextMonthYear, nextMonth, effectiveDayNextMonth, 0, 0, 0, 0);
}

/**
 * Advances nextDueDate to the subsequent month, respecting calendar boundaries.
 */
function advanceDueDate(dueDayOfMonth, currentDueDate = new Date()) {
  const targetDay = Number(dueDayOfMonth);
  const base = new Date(currentDueDate);
  const currentYear = base.getFullYear();
  const currentMonth = base.getMonth();

  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const nextMonth = (currentMonth + 1) % 12;
  const daysInNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
  const effectiveDayNextMonth = Math.min(targetDay, daysInNextMonth);
  return new Date(nextMonthYear, nextMonth, effectiveDayNextMonth, 0, 0, 0, 0);
}

/**
 * Computes user's normalized monthly net income from active income profiles or past transactions.
 */
async function getUserMonthlyIncome(userId) {
  const activeProfiles = await IncomeProfile.find({ user: userId, isActive: true });
  if (activeProfiles && activeProfiles.length > 0) {
    let monthlyTotal = 0;
    for (const p of activeProfiles) {
      if (p.frequency === 'daily') monthlyTotal += p.amount * 30;
      else if (p.frequency === 'weekly') monthlyTotal += p.amount * (52 / 12);
      else if (p.frequency === 'yearly') monthlyTotal += p.amount / 12;
      else monthlyTotal += p.amount; // default monthly
    }
    return Math.round(monthlyTotal);
  }

  // Fallback: Check past 60 days income transactions
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const pastIncomes = await Transaction.aggregate([
    { $match: { user: userId, type: 'income', date: { $gte: sixtyDaysAgo } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  if (pastIncomes && pastIncomes.length > 0 && pastIncomes[0].total > 0) {
    return Math.round((pastIncomes[0].total / 60) * 30);
  }

  return 0;
}

/**
 * Get all installments with summary and DTI metrics.
 */
async function getInstallments(userId) {
  const installments = await Installment.find({ user: userId })
    .populate('linkedAccountId', 'name type icon color balance')
    .populate('category', 'name icon color')
    .sort({ status: 1, nextDueDate: 1 })
    .lean();

  const now = new Date();
  let totalMonthlyBurden = 0;
  let totalRemainingObligations = 0;
  let activeCount = 0;

  const enriched = installments.map(inst => {
    const remainingMonths = Math.max(0, inst.totalMonths - inst.paidMonths);
    const remainingAmount = remainingMonths * inst.monthlyAmount;
    const progressPercent = Math.min(100, Math.round((inst.paidMonths / inst.totalMonths) * 100));
    const isOverdue = inst.status === 'active' && new Date(inst.nextDueDate) < now;

    if (inst.status === 'active') {
      totalMonthlyBurden += inst.monthlyAmount;
      totalRemainingObligations += remainingAmount;
      activeCount += 1;
    }

    return {
      ...inst,
      remainingMonths,
      remainingAmount,
      progressPercent,
      isOverdue
    };
  });

  const monthlyIncome = await getUserMonthlyIncome(userId);
  const debtToIncomeRatio = monthlyIncome > 0
    ? Number(((totalMonthlyBurden / monthlyIncome) * 100).toFixed(1))
    : 0;

  let dtiStatus = 'healthy';
  if (debtToIncomeRatio > 40) dtiStatus = 'critical';
  else if (debtToIncomeRatio > 30) dtiStatus = 'caution';

  const installmentIds = installments.map(i => i._id);
  const transactions = await InstallmentTransaction.find({
    user: userId,
    installmentId: { $in: installmentIds }
  })
    .populate('account', 'name type icon color')
    .populate('installmentId', 'title provider providerName totalMonths paidMonths')
    .sort({ date: -1, createdAt: -1 })
    .lean();

  return {
    summary: {
      totalMonthlyBurden,
      totalRemainingObligations,
      activeCount,
      monthlyIncome,
      debtToIncomeRatio,
      dtiStatus
    },
    installments: enriched,
    transactions
  };
}

/**
 * Create a new installment contract.
 */
async function createInstallment(userId, data) {
  const {
    title,
    provider,
    providerName,
    totalAmount,
    downPayment = 0,
    monthlyAmount,
    totalMonths,
    dueDayOfMonth,
    linkedAccountId,
    category,
    autoPay = false,
    notes,
    recordDownPaymentTransaction = false
  } = data;

  if (!title || !totalAmount || !monthlyAmount || !totalMonths || !dueDayOfMonth || !linkedAccountId) {
    throw new AppError('Missing required installment fields', 400);
  }

  // Validate account ownership
  const account = await Account.findOne({ _id: linkedAccountId, user: userId });
  if (!account) {
    throw new AppError('Linked payment account not found', 404);
  }

  const nextDueDate = calculateNextDueDate(dueDayOfMonth);

  const installment = new Installment({
    user: userId,
    title: title.trim(),
    provider: provider || 'other',
    providerName: providerName ? providerName.trim() : undefined,
    totalAmount: Number(totalAmount),
    downPayment: Number(downPayment) || 0,
    monthlyAmount: Number(monthlyAmount),
    totalMonths: Number(totalMonths),
    paidMonths: 0,
    dueDayOfMonth: Number(dueDayOfMonth),
    linkedAccountId,
    category,
    autoPay: Boolean(autoPay),
    nextDueDate,
    notes: notes ? notes.trim() : undefined
  });

  await installment.save();

  // If user requested recording the down payment as an immediate live transaction
  if (recordDownPaymentTransaction && downPayment > 0) {
    try {
      const it = new InstallmentTransaction({
        user: userId,
        installmentId: installment._id,
        amount: Number(downPayment),
        type: 'down_payment',
        paymentNumber: 0,
        account: linkedAccountId,
        date: new Date(),
        notes: notes ? notes.trim() : undefined
      });
      await it.save();
      await it.populate([
        { path: 'account', select: 'name type icon color' },
        { path: 'installmentId', select: 'title provider providerName totalMonths paidMonths' }
      ]);
    } catch (txErr) {
      console.error('[INSTALLMENTS] Failed to log down payment transaction:', txErr.message);
    }
  }

  return installment.populate('linkedAccountId', 'name type icon color balance');
}

/**
 * Update an existing installment contract.
 */
async function updateInstallment(userId, id, data) {
  const installment = await Installment.findOne({ _id: id, user: userId });
  if (!installment) {
    throw new AppError('Installment not found', 404);
  }

  const allowedFields = [
    'title', 'provider', 'providerName', 'monthlyAmount', 'totalMonths',
    'dueDayOfMonth', 'linkedAccountId', 'category', 'status', 'autoPay', 'notes'
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      installment[field] = data[field];
    }
  }

  if (data.dueDayOfMonth !== undefined) {
    installment.nextDueDate = calculateNextDueDate(data.dueDayOfMonth);
  }

  await installment.save();
  return installment.populate('linkedAccountId', 'name type icon color balance');
}

/**
 * Delete an installment contract and cascade all its transactions.
 */
async function deleteInstallment(userId, id) {
  const result = await Installment.findOneAndDelete({ _id: id, user: userId });
  if (!result) {
    throw new AppError('Installment not found', 404);
  }
  // Delete all associated installment transactions (matching deleteDebt behavior)
  await InstallmentTransaction.deleteMany({ installmentId: id, user: userId });
  // Also delete any regular transactions matching down payments or references
  await Transaction.deleteMany({
    user: userId,
    $or: [
      { notes: { $regex: new RegExp(`\\[مقدم قسط\\] ${result.title}`, 'i') } },
      { notes: { $regex: new RegExp(`${result._id}`, 'i') } }
    ]
  });
  return { success: true };
}

/**
 * Executes a single-tap payment for the installment.
 */
async function payInstallment(userId, id, paymentData = {}) {
  const installment = await Installment.findOne({ _id: id, user: userId });
  if (!installment) {
    throw new AppError('Installment not found', 404);
  }

  if (installment.status === 'settled' || installment.paidMonths >= installment.totalMonths) {
    throw new AppError('Installment is already fully settled', 400);
  }

  const accountId = paymentData.accountId || installment.linkedAccountId;
  const account = await Account.findOne({ _id: accountId, user: userId });
  if (!account) {
    throw new AppError('Payment account not found', 404);
  }

  const paymentDate = paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date();

  // Create real InstallmentTransaction matching DebtTransaction
  const tx = new InstallmentTransaction({
    user: userId,
    installmentId: installment._id,
    amount: installment.monthlyAmount,
    type: 'monthly_payment',
    paymentNumber: installment.paidMonths + 1,
    account: accountId,
    date: paymentDate,
    notes: paymentData.notes ? paymentData.notes.trim() : undefined
  });
  await tx.save();
  await tx.populate([
    { path: 'account', select: 'name type icon color' },
    { path: 'installmentId', select: 'title provider providerName totalMonths paidMonths' }
  ]);

  // Update installment state
  installment.paidMonths += 1;
  if (installment.paidMonths >= installment.totalMonths) {
    installment.status = 'settled';
  } else {
    installment.nextDueDate = advanceDueDate(installment.dueDayOfMonth, installment.nextDueDate);
  }

  await installment.save();

  return {
    installment,
    transaction: tx
  };
}

module.exports = {
  calculateNextDueDate,
  advanceDueDate,
  getUserMonthlyIncome,
  getInstallments,
  createInstallment,
  updateInstallment,
  deleteInstallment,
  payInstallment
};
