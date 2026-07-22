const Receivable = require('../models/Receivable');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const AppError = require('../utils/AppError');

const Category = require('../models/Category');
const list = (userId) => Receivable.find({ user: userId }).populate('paidFrom').populate('participants.payments.account').sort({ createdAt: -1 });
const create = async (userId, data) => {
  const paidAmount = Number(data.paidAmount);
  const account = await Account.findOne({ _id: data.paidFrom, user: userId });
  if (!account || !Number.isFinite(paidAmount) || paidAmount <= 0) throw new AppError('Choose the account and amount you paid.', 400);
  let category = await Category.findOne({ user: userId, name: 'مستحقات مشتركة', type: 'expense' });
  if (!category) category = await Category.create({ user: userId, name: 'مستحقات مشتركة', type: 'expense' });
  const expense = await Transaction.create({ user: userId, title: data.title, amount: paidAmount, type: 'expense', account: account._id, category: category._id });
  return Receivable.create({ user: userId, title: data.title, paidAmount, paidFrom: account._id, expenseTransaction: expense._id, participants: data.participants || [] });
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
  participant.paidAmount += amount;
  participant.payments.push({ amount, account: account._id, paidAt: data.date || new Date() });
  await receivable.save();
  await Transaction.create({ user: userId, title: `تسوية من ${participant.name}: ${receivable.title}`, amount, type: 'settlement', account: account._id, date: data.date || new Date() });
  return receivable;
};
module.exports = { list, create, recordPayment };
