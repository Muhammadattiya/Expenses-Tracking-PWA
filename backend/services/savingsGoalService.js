const SavingsGoal = require('../models/SavingsGoal');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const DebtTransaction = require('../models/DebtTransaction');
const InstallmentTransaction = require('../models/InstallmentTransaction');
const Receivable = require('../models/Receivable');
const transactionService = require('./transactionService');
const AppError = require('../utils/AppError');

/**
 * Computes live balance for an account document or ID.
 */
async function computeAccountBalance(userId, accountOrId) {
  if (!accountOrId) return 0;
  let account = accountOrId;
  const accIdStr = (account._id || account).toString();
  if (account.balance_adjustment === undefined) {
    account = await Account.findOne({ _id: accIdStr, user: userId }).lean();
    if (!account) return 0;
  }
  let bal = Number(account.balance_adjustment) || 0;

  // 1. Transactions
  const txs = await Transaction.find({
    user: userId,
    $or: [
      { account: accIdStr },
      { from_account: accIdStr },
      { to_account: accIdStr }
    ]
  }).select('type amount account from_account to_account').lean();

  for (const t of txs) {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income' || t.type === 'settlement') bal += amt;
    else if (t.type === 'expense') bal -= amt;
    else if (t.type === 'transfer') {
      if (t.from_account?.toString() === accIdStr) bal -= amt;
      if (t.to_account?.toString() === accIdStr) bal += amt;
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
 * Efficiently computes live balances for all user accounts in one pass.
 */
async function getAllAccountBalances(userId) {
  const accounts = await Account.find({ user: userId }).lean();
  const balanceMap = new Map();
  accounts.forEach(acc => {
    balanceMap.set(acc._id.toString(), Number(acc.balance_adjustment) || 0);
  });

  const [txs, debtTxs, instTxs, recs] = await Promise.all([
    Transaction.find({ user: userId }).select('type amount account from_account to_account').lean(),
    DebtTransaction.find({ user: userId }).populate('debtId', 'type').lean(),
    InstallmentTransaction.find({ user: userId }).lean(),
    Receivable.find({ user: userId }).lean()
  ]);

  for (const t of txs) {
    const amt = Number(t.amount) || 0;
    const accId = t.account?.toString();
    const fromId = t.from_account?.toString();
    const toId = t.to_account?.toString();

    if (t.type === 'income' || t.type === 'settlement') {
      if (accId && balanceMap.has(accId)) balanceMap.set(accId, balanceMap.get(accId) + amt);
    } else if (t.type === 'expense') {
      if (accId && balanceMap.has(accId)) balanceMap.set(accId, balanceMap.get(accId) - amt);
    } else if (t.type === 'transfer') {
      if (fromId && balanceMap.has(fromId)) balanceMap.set(fromId, balanceMap.get(fromId) - amt);
      if (toId && balanceMap.has(toId)) balanceMap.set(toId, balanceMap.get(toId) + amt);
    }
  }

  for (const dt of debtTxs) {
    const accId = dt.account?.toString();
    if (!accId || !balanceMap.has(accId)) continue;
    const amt = Number(dt.amount) || 0;
    if (dt.type === 'loan') {
      if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') balanceMap.set(accId, balanceMap.get(accId) + amt);
      else balanceMap.set(accId, balanceMap.get(accId) - amt);
    } else if (dt.type === 'repayment') {
      if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') balanceMap.set(accId, balanceMap.get(accId) - amt);
      else balanceMap.set(accId, balanceMap.get(accId) + amt);
    }
  }

  for (const it of instTxs) {
    const accId = it.account?.toString();
    if (accId && balanceMap.has(accId)) {
      balanceMap.set(accId, balanceMap.get(accId) - (Number(it.amount) || 0));
    }
  }

  for (const r of recs) {
    const paidFromId = r.paidFrom?.toString();
    const recToId = r.receivedTo?.toString();
    if (paidFromId && balanceMap.has(paidFromId)) balanceMap.set(paidFromId, balanceMap.get(paidFromId) - (Number(r.paidAmount) || 0));
    if (recToId && balanceMap.has(recToId)) balanceMap.set(recToId, balanceMap.get(recToId) + (Number(r.receivedAmount) || 0));
    if (r.participants) {
      for (const p of r.participants) {
        if (p.payments) {
          for (const pay of p.payments) {
            const payAccId = pay.account?.toString();
            if (payAccId && balanceMap.has(payAccId)) {
              balanceMap.set(payAccId, balanceMap.get(payAccId) + (Number(pay.amount) || 0));
            }
          }
        }
      }
    }
  }

  return balanceMap;
}

/**
 * Calculates derived pace, status, and milestone metrics for a savings goal.
 */
function computeGoalMetrics(goalDoc) {
  const goal = goalDoc.toObject ? goalDoc.toObject() : { ...goalDoc };
  const targetDate = new Date(goal.targetDate);
  const now = new Date();

  // Months remaining (minimum 1)
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const monthsRemaining = diffDays <= 0 ? 1 : Math.max(1, Math.ceil(diffDays / 30));

  const currentAmount = Math.max(0, Number(goal.currentAmount) || 0);
  const targetAmount = Math.max(1, Number(goal.targetAmount) || 1);

  const progressPercent = Math.round((currentAmount / targetAmount) * 100);
  const surplusAmount = Math.max(0, currentAmount - targetAmount);

  const requiredMonthlyPace = currentAmount >= targetAmount 
    ? 0 
    : Math.max(0, Math.ceil((targetAmount - currentAmount) / monthsRemaining));

  // Current calendar month deposits
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthDeposits = (goal.contributions || [])
    .filter(c => new Date(c.date) >= startOfMonth)
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  // Pace status evaluation
  let paceStatus = 'on_track';
  if (currentAmount >= targetAmount) {
    paceStatus = 'ahead';
  } else if (requiredMonthlyPace === 0) {
    paceStatus = 'on_track';
  } else if (currentMonthDeposits >= requiredMonthlyPace * 1.2) {
    paceStatus = 'ahead';
  } else if (currentMonthDeposits >= requiredMonthlyPace * 0.9) {
    paceStatus = 'on_track';
  } else {
    paceStatus = 'behind';
  }

  const milestones = {
    milestone25: progressPercent >= 25,
    milestone50: progressPercent >= 50,
    milestone75: progressPercent >= 75,
    milestone100: progressPercent >= 100
  };

  return {
    ...goal,
    monthsRemaining,
    progressPercent,
    surplusAmount,
    requiredMonthlyPace,
    currentMonthDeposits,
    paceStatus,
    milestones
  };
}

/**
 * Get all savings goals for a user.
 */
async function getSavingsGoals(userId, filter = {}) {
  const query = { user: userId };
  if (filter.status) query.status = filter.status;

  const [goals, balanceMap] = await Promise.all([
    SavingsGoal.find(query)
      .populate('linkedAccountId', 'name icon color type balance_adjustment')
      .sort({ targetDate: 1 })
      .lean(),
    getAllAccountBalances(userId)
  ]);

  return goals.map(g => {
    let currentAmount = Number(g.currentAmount) || 0;
    if (g.allocationType === 'dedicated' && g.linkedAccountId) {
      const accId = (g.linkedAccountId._id || g.linkedAccountId).toString();
      currentAmount = Math.max(0, balanceMap.get(accId) || 0);
    }
    const targetAmount = Number(g.targetAmount) || 1;
    let status = g.status;
    if (currentAmount >= targetAmount) {
      status = 'achieved';
    } else if (status === 'achieved') {
      status = 'active';
    }
    return computeGoalMetrics({
      ...g,
      currentAmount,
      status
    });
  });
}

/**
 * Get single savings goal by ID.
 */
async function getSavingsGoalById(userId, goalId) {
  const goal = await SavingsGoal.findOne({ _id: goalId, user: userId })
    .populate('linkedAccountId', 'name icon color type balance_adjustment');

  if (!goal) {
    throw new AppError('Savings goal not found', 404);
  }

  let goalObj = goal.toObject ? goal.toObject() : { ...goal };
  if (goalObj.allocationType === 'dedicated' && goalObj.linkedAccountId) {
    const bal = await computeAccountBalance(userId, goalObj.linkedAccountId);
    goalObj.currentAmount = Math.max(0, bal);
    if (goalObj.currentAmount >= goalObj.targetAmount) {
      goalObj.status = 'achieved';
    } else if (goalObj.status === 'achieved') {
      goalObj.status = 'active';
    }
  }

  return computeGoalMetrics(goalObj);
}

/**
 * Create a new savings goal.
 */
async function createSavingsGoal(userId, data) {
  const { title, category, icon, color, targetAmount, currentAmount, targetDate, priority, allocationType, linkedAccountId, notes } = data;

  if (!title || !targetAmount || !targetDate || !linkedAccountId) {
    throw new AppError('Missing required fields: title, targetAmount, targetDate, and linkedAccountId are required', 400);
  }

  const targetAccId = linkedAccountId?._id || linkedAccountId;
  const account = await Account.findOne({ _id: targetAccId, user: userId });
  if (!account) {
    throw new AppError('Linked account not found or does not belong to user', 404);
  }

  const allocType = allocationType || 'virtual_jar';
  let initialSaved = Math.max(0, Number(currentAmount) || 0);
  if (allocType === 'dedicated') {
    const accBal = await computeAccountBalance(userId, account);
    initialSaved = Math.max(0, accBal);
  }

  const numTarget = Number(targetAmount);
  const newGoal = await SavingsGoal.create({
    user: userId,
    title: title.trim(),
    category: category || 'other',
    icon: icon || 'Target',
    color: color || '#8D6346',
    targetAmount: numTarget,
    currentAmount: initialSaved,
    targetDate: new Date(targetDate),
    priority: priority || 'medium',
    allocationType: allocType,
    linkedAccountId: account._id,
    notes: notes ? notes.trim() : '',
    status: (initialSaved >= numTarget) ? 'achieved' : 'active'
  });

  const populated = await SavingsGoal.findById(newGoal._id)
    .populate('linkedAccountId', 'name icon color type balance_adjustment');

  return computeGoalMetrics(populated);
}

/**
 * Update an existing savings goal.
 */
async function updateSavingsGoal(userId, goalId, data) {
  const goal = await SavingsGoal.findOne({ _id: goalId, user: userId });
  if (!goal) {
    throw new AppError('Savings goal not found', 404);
  }

  const allowedFields = [
    'title', 'category', 'icon', 'color', 'targetAmount', 
    'currentAmount', 'targetDate', 'priority', 'allocationType', 
    'linkedAccountId', 'status', 'notes'
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      if (field === 'targetAmount') goal.targetAmount = Number(data.targetAmount);
      else if (field === 'currentAmount') goal.currentAmount = Math.max(0, Number(data.currentAmount));
      else if (field === 'targetDate') goal.targetDate = new Date(data.targetDate);
      else if (field === 'title') goal.title = data.title.trim();
      else if (field === 'linkedAccountId') {
        const targetAccId = data.linkedAccountId?._id || data.linkedAccountId;
        const acc = await Account.findOne({ _id: targetAccId, user: userId });
        if (!acc) throw new AppError('Linked account not found', 404);
        goal.linkedAccountId = acc._id;
      } else {
        goal[field] = data[field];
      }
    }
  }

  // If dedicated allocation, the saved amount is ALWAYS the linked account's balance
  if (goal.allocationType === 'dedicated') {
    const acc = await Account.findOne({ _id: goal.linkedAccountId, user: userId });
    if (acc) {
      const accBal = await computeAccountBalance(userId, acc);
      goal.currentAmount = Math.max(0, accBal);
    }
  }

  if (goal.currentAmount >= goal.targetAmount) {
    goal.status = 'achieved';
  } else if (goal.status === 'achieved') {
    goal.status = 'active';
  }

  await goal.save();

  const populated = await SavingsGoal.findById(goal._id)
    .populate('linkedAccountId', 'name icon color type balance_adjustment');

  return computeGoalMetrics(populated);
}

/**
 * Delete a savings goal.
 */
async function deleteSavingsGoal(userId, goalId) {
  const goal = await SavingsGoal.findOneAndDelete({ _id: goalId, user: userId });
  if (!goal) {
    throw new AppError('Savings goal not found', 404);
  }
  return { success: true };
}

/**
 * Contribute funds to a savings goal via account transfer.
 */
async function contributeToGoal(userId, goalId, { fromAccountId, amount, notes }) {
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    throw new AppError('A valid positive contribution amount is required', 400);
  }

  const goal = await SavingsGoal.findOne({ _id: goalId, user: userId });
  if (!goal) {
    throw new AppError('Savings goal not found', 404);
  }

  const sourceAccount = await Account.findOne({ _id: fromAccountId, user: userId });
  if (!sourceAccount) {
    throw new AppError('Source account not found', 404);
  }

  const destAccountId = goal.linkedAccountId.toString();
  const srcAccountId = sourceAccount._id.toString();

  let tx = null;
  // If moving money between distinct accounts, create an actual transfer transaction
  if (srcAccountId !== destAccountId) {
    tx = await transactionService.createTransaction(userId, {
      type: 'transfer',
      amount: numAmount,
      date: new Date(),
      from_account: srcAccountId,
      to_account: destAccountId,
      notes: notes || `إيداع في هدف الادخار: ${goal.title}`
    });
  }

  // Update goal currentAmount and history
  goal.currentAmount = (goal.currentAmount || 0) + numAmount;
  if (goal.currentAmount >= goal.targetAmount && goal.status === 'active') {
    goal.status = 'achieved';
  }

  goal.contributions.push({
    amount: numAmount,
    date: new Date(),
    fromAccountId: sourceAccount._id,
    transactionId: tx?._id || null,
    notes: notes || ''
  });

  await goal.save();

  const populated = await SavingsGoal.findById(goal._id)
    .populate('linkedAccountId', 'name icon color type balance_adjustment');

  return {
    goal: computeGoalMetrics(populated),
    transactionId: tx?._id || null
  };
}

module.exports = {
  computeGoalMetrics,
  getSavingsGoals,
  getSavingsGoalById,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  contributeToGoal
};
