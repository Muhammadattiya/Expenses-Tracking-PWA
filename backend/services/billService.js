const mongoose = require('mongoose');
const Bill = require('../models/Bill');
const Account = require('../models/Account');
const Category = require('../models/Category');

exports.getBills = async (userId) => {
  return await Bill.find({ user: userId })
    .populate('category', 'name icon color')
    .populate('account', 'name icon color')
    .populate('transactionId', 'amount date description type')
    .populate('lastTransactionId', 'amount date description type')
    .populate('paymentHistory.transactionId', 'amount date description type')
    .sort({ dueDate: 1 });
};

exports.createBill = async (userId, data) => {
  const allowedFields = ['name', 'expectedAmount', 'category', 'account', 'notes', 'dueDate', 'repeat', 'reminderEnabled', 'reminderDaysBefore', 'notificationEnabled', 'isActive'];
  const billData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      billData[field] = data[field];
    }
  }

  if (billData.account) {
    const acc = await Account.findOne({ _id: billData.account, user: userId });
    if (!acc) throw new Error('Invalid account reference');
  }
  if (billData.category) {
    const cat = await Category.findOne({ _id: billData.category, user: userId });
    if (!cat) throw new Error('Invalid category reference');
  }

  const bill = new Bill({
    ...billData,
    user: userId,
  });

  // Calculate status based on dueDate
  bill.status = calculateBillStatus(bill.dueDate);

  await bill.save();
  const { reconcileEmergencyFundBurn } = require('./emergencyFundService');
  reconcileEmergencyFundBurn(userId).catch(err => console.error('[EMERGENCY_FUND] bill reconcile error:', err.message));
  return bill;
};

exports.updateBill = async (userId, id, data) => {
  const bill = await Bill.findOne({ _id: id, user: userId });
  if (!bill) throw new Error('Bill not found');

  const allowedFields = ['name', 'expectedAmount', 'category', 'account', 'notes', 'dueDate', 'repeat', 'reminderEnabled', 'reminderDaysBefore', 'notificationEnabled', 'isActive'];
  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  if (updateData.account) {
    const acc = await Account.findOne({ _id: updateData.account, user: userId });
    if (!acc) throw new Error('Invalid account reference');
  }
  if (updateData.category) {
    const cat = await Category.findOne({ _id: updateData.category, user: userId });
    if (!cat) throw new Error('Invalid category reference');
  }

  Object.assign(bill, updateData);
  if (updateData.dueDate) {
    bill.status = calculateBillStatus(bill.dueDate);
  }
  await bill.save();
  const { reconcileEmergencyFundBurn } = require('./emergencyFundService');
  reconcileEmergencyFundBurn(userId).catch(err => console.error('[EMERGENCY_FUND] bill reconcile error:', err.message));
  return bill;
};

exports.deleteBill = async (userId, id) => {
  const bill = await Bill.findOneAndDelete({ _id: id, user: userId });
  if (!bill) throw new Error('Bill not found');
  const { reconcileEmergencyFundBurn } = require('./emergencyFundService');
  reconcileEmergencyFundBurn(userId).catch(err => console.error('[EMERGENCY_FUND] bill reconcile error:', err.message));
  return bill;
};

exports.markAsPaid = async (userId, id, transactionId) => {
  const bill = await Bill.findOne({ _id: id, user: userId });
  if (!bill) throw new Error('Bill not found');

  const now = new Date();
  const currentDueDate = bill.dueDate;
  const paidAmount = bill.expectedAmount;

  if (!Array.isArray(bill.paymentHistory)) {
    bill.paymentHistory = [];
  }

  // Validate that transactionId is a genuine 24-character hexadecimal ObjectId
  // to avoid fatal CastErrors with client-side offline IDs (e.g., "local_...")
  const isValidTxId = Boolean(
    transactionId &&
    typeof transactionId === 'string' &&
    !transactionId.startsWith('local_') &&
    mongoose.Types.ObjectId.isValid(transactionId) &&
    transactionId.length === 24
  );
  const safeTxId = isValidTxId ? transactionId : undefined;

  // Record payment in paymentHistory to preserve it permanently across cycles
  bill.paymentHistory.push({
    paidAt: now,
    dueDate: currentDueDate,
    amount: paidAmount,
    transactionId: safeTxId
  });

  // Preserve latest payment date and transaction references
  bill.paymentDate = now;
  bill.lastPaymentDate = now;
  if (safeTxId) {
    bill.lastTransactionId = safeTxId;
  }

  if (bill.repeat !== 'never') {
    let nextDate = new Date(bill.dueDate);
    if (bill.repeat === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (bill.repeat === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (bill.repeat === 'yearly') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }
    bill.dueDate = nextDate;
    bill.status = calculateBillStatus(nextDate);
    bill.transactionId = undefined; 
  } else {
    bill.status = 'paid';
    bill.transactionId = safeTxId;
  }
  
  await bill.save();
  return bill;
};

exports.ignoreBill = async (userId, id) => {
  const bill = await Bill.findOne({ _id: id, user: userId });
  if (!bill) throw new Error('Bill not found');

  if (bill.repeat !== 'never') {
    let nextDate = new Date(bill.dueDate);
    if (bill.repeat === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (bill.repeat === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (bill.repeat === 'yearly') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }
    bill.dueDate = nextDate;
    bill.status = calculateBillStatus(nextDate);
  } else {
    // For one-time bills, ignoring means hiding it from active bills
    bill.isActive = false;
  }
  
  await bill.save();
  return bill;
};

function calculateBillStatus(dueDate) {
  const now = new Date();
  const due = new Date(dueDate);
  
  now.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);

  if (dueDay.getTime() === now.getTime()) {
    return 'due_today';
  } else if (dueDay.getTime() < now.getTime()) {
    return 'overdue';
  } else {
    return 'upcoming';
  }
}
