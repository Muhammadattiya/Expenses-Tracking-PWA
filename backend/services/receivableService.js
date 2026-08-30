const Receivable = require('../models/Receivable');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const AppError = require('../utils/AppError');
const Category = require('../models/Category');

const list = (userId) => Receivable.find({ user: userId }).populate('paidFrom').populate('receivedTo').populate('expenseCategory').populate('participants.payments.account').sort({ createdAt: -1 }).lean();

const create = async (userId, data) => {
  const paidAmount = Number(data.paidAmount);
  const receivedAmount = Number(data.receivedAmount) || 0;
  
  const account = await Account.findOne({ _id: data.paidFrom, user: userId });
  if (!account || !Number.isFinite(paidAmount) || paidAmount <= 0) throw new AppError('Choose the account and amount you paid.', 400);
  if (receivedAmount < 0 || receivedAmount > paidAmount) throw new AppError('Received amount must be between 0 and the paid amount.', 400);
  
  let receivedToAccount = null;
  if (receivedAmount > 0 && data.receivedTo) {
    receivedToAccount = await Account.findOne({ _id: data.receivedTo, user: userId });
    if (!receivedToAccount) throw new AppError('Receiving account not found.', 404);
  }

  const participants = data.participants || [];
  let sumOwed = 0;
  for (const p of participants) {
    sumOwed += (Number(p.owedAmount) || 0);
  }

  if (receivedAmount + sumOwed > paidAmount) {
    throw new AppError('Total received and owed amounts cannot exceed the paid amount.', 400);
  }

  const userShare = paidAmount - receivedAmount - sumOwed;

  let expenseCategory = null;
  if (userShare > 0) {
    if (data.expenseCategory) {
      expenseCategory = await Category.findOne({ _id: data.expenseCategory, user: userId });
    }
    if (!expenseCategory) {
      expenseCategory = await Category.findOne({ user: userId, name: 'مستحقات مشتركة', type: 'expense' });
      if (!expenseCategory) expenseCategory = await Category.create({ user: userId, name: 'مستحقات مشتركة', type: 'expense' });
    }
  }

  const receivable = await Receivable.create({ 
    user: userId, 
    title: data.title, 
    paidAmount, 
    paidFrom: account._id, 
    receivedAmount, 
    receivedTo: receivedToAccount?._id || null, 
    expenseCategory: expenseCategory?._id || null,
    participants 
  });

  const refId = receivable._id.toString();

  if (userShare > 0) {
    await Transaction.create({
      user: userId,
      title: `${data.title} (My Share)`,
      amount: userShare,
      type: 'expense',
      account: account._id,
      category: expenseCategory._id,
      date: new Date(),
      source: 'system',
      referenceNumber: refId
    });
    const { checkBudgetThresholds } = require('./budgetEngine');
    checkBudgetThresholds(userId).catch(err => console.error('[ERROR] checkBudgetThresholds:', err));
  }



  return receivable;
};

const update = async (userId, id, data) => {
  const receivable = await Receivable.findOne({ _id: id, user: userId });
  if (!receivable) throw new AppError('Receivable not found.', 404);

  const paidAmount = Number(data.paidAmount);
  const receivedAmount = Number(data.receivedAmount) || 0;
  const account = await Account.findOne({ _id: data.paidFrom, user: userId });
  if (!account || !Number.isFinite(paidAmount) || paidAmount <= 0) throw new AppError('Choose the account and amount you paid.', 400);
  if (receivedAmount < 0 || receivedAmount > paidAmount) throw new AppError('Received amount must be between 0 and the paid amount.', 400);

  let receivedToAccount = null;
  if (receivedAmount > 0 && data.receivedTo) {
    receivedToAccount = await Account.findOne({ _id: data.receivedTo, user: userId });
    if (!receivedToAccount) throw new AppError('Receiving account not found.', 404);
  }

  const newParticipants = [];
  let sumOwed = 0;
  const incomingParticipants = data.participants || [];
  
  for (const p of incomingParticipants) {
    const owed = Number(p.owedAmount) || 0;
    sumOwed += owed;
    let existingP = null;
    if (p._id) {
      existingP = receivable.participants.id(p._id);
    }
    if (existingP) {
      if (owed < existingP.paidAmount) throw new AppError(`Amount owed by ${p.name} cannot be less than what they already paid.`, 400);
      existingP.name = p.name;
      existingP.owedAmount = owed;
      newParticipants.push(existingP);
    } else {
      newParticipants.push({ name: p.name, owedAmount: owed, paidAmount: 0, payments: [] });
    }
  }

  for (const existingP of receivable.participants) {
    if (!newParticipants.find(np => np._id && np._id.toString() === existingP._id.toString())) {
      if (existingP.paidAmount > 0) {
        throw new AppError(`Cannot remove participant ${existingP.name} because they already made payments.`, 400);
      }
    }
  }

  if (receivedAmount + sumOwed > paidAmount) throw new AppError('Total received and owed amounts cannot exceed the paid amount.', 400);

  const userShare = paidAmount - receivedAmount - sumOwed;

  let expenseCategory = null;
  if (userShare > 0) {
    if (data.expenseCategory) {
      expenseCategory = await Category.findOne({ _id: data.expenseCategory, user: userId });
    }
    if (!expenseCategory) {
      expenseCategory = await Category.findOne({ user: userId, name: 'مستحقات مشتركة', type: 'expense' });
      if (!expenseCategory) expenseCategory = await Category.create({ user: userId, name: 'مستحقات مشتركة', type: 'expense' });
    }
  }

  receivable.title = data.title;
  receivable.paidAmount = paidAmount;
  receivable.paidFrom = account._id;
  receivable.receivedAmount = receivedAmount;
  receivable.receivedTo = receivedToAccount?._id || null;
  receivable.participants = newParticipants;
  receivable.expenseCategory = expenseCategory?._id || null;

  await receivable.save();

  const refId = receivable._id.toString();
  await Transaction.deleteMany({ user: userId, referenceNumber: refId });

  if (userShare > 0) {
    await Transaction.create({
      user: userId,
      title: `${data.title} (My Share)`,
      amount: userShare,
      type: 'expense',
      account: account._id,
      category: expenseCategory._id,
      date: new Date(),
      source: 'system',
      referenceNumber: refId
    });
    const { checkBudgetThresholds } = require('./budgetEngine');
    checkBudgetThresholds(userId).catch(err => console.error('[ERROR] checkBudgetThresholds:', err));
  }



  return receivable;
};

const recordPayment = async (userId, receivableId, participantId, data) => {
  const receivable = await Receivable.findOne({ _id: receivableId, user: userId });
  if (!receivable) throw new AppError('Receivable not found.', 404);
  const participant = receivable.participants.id(participantId);
  if (!participant) throw new AppError('Participant not found.', 404);
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0 || participant.paidAmount + amount > participant.owedAmount) throw new AppError('Invalid payment amount.', 400);
  const account = await Account.findOne({ _id: data.account, user: userId });
  if (!account) throw new AppError('Account not found.', 404);
  
  const paymentTime = data.date || new Date();
  participant.paidAmount += amount;
  participant.payments.push({ amount, account: account._id, paidAt: paymentTime });
  
  await receivable.save();



  return receivable;
};

const remove = async (userId, id) => {
  const receivable = await Receivable.findOne({ _id: id, user: userId });
  if (!receivable) throw new AppError('Receivable not found.', 404);

  const refId = receivable._id.toString();
  await Transaction.deleteMany({ user: userId, referenceNumber: { $regex: `^${refId}` } });
  await receivable.deleteOne();
  
  return { success: true };
};

module.exports = { list, create, update, recordPayment, remove };
