const Bill = require('../models/Bill');

exports.getBills = async (userId) => {
  return await Bill.find({ user: userId }).sort({ dueDate: 1 });
};

exports.createBill = async (userId, data) => {
  const bill = new Bill({
    ...data,
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

  Object.assign(bill, data);
  if (data.dueDate) {
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
