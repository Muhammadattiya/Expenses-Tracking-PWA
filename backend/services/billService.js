const Bill = require('../models/Bill');
const Account = require('../models/Account');
const Category = require('../models/Category');

exports.getBills = async (userId) => {
  return await Bill.find({ user: userId })
    .populate('category', 'name icon color')
    .populate('account', 'name icon color')
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
  return bill;
};

exports.deleteBill = async (userId, id) => {
  const bill = await Bill.findOneAndDelete({ _id: id, user: userId });
  if (!bill) throw new Error('Bill not found');
  return bill;
};

exports.markAsPaid = async (userId, id, transactionId) => {
  const bill = await Bill.findOne({ _id: id, user: userId });
  if (!bill) throw new Error('Bill not found');

  bill.transactionId = transactionId;
  bill.paymentDate = new Date();

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
