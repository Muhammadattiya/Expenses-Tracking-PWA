const RecurringTransaction = require('../models/RecurringTransaction');
const Account = require('../models/Account');
const Category = require('../models/Category');
const { processRecurringTransactions } = require('./cronJobs');

exports.getRecurringTransactions = async (userId) => {
  return await RecurringTransaction.find({ user: userId }).sort({ createdAt: -1 });
};

exports.createRecurringTransaction = async (userId, data) => {
  const allowedFields = [
    'title', 'amount', 'type', 'account', 'category', 'from_account', 
    'to_account', 'notes', 'repeatType', 'executionTime', 'interval', 
    'startDate', 'endDate', 'neverEnds', 'maxOccurrences', 
    'nextExecutionDate', 'isActive', 'reminderEnabled', 'reminderDaysBefore'
  ];

  const recurringData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      recurringData[field] = data[field];
    }
  }

  if (recurringData.account) {
    const acc = await Account.findOne({ _id: recurringData.account, user: userId });
    if (!acc) throw new Error('Invalid account reference');
  }
  if (recurringData.from_account) {
    const acc = await Account.findOne({ _id: recurringData.from_account, user: userId });
    if (!acc) throw new Error('Invalid account reference');
  }
  if (recurringData.to_account) {
    const acc = await Account.findOne({ _id: recurringData.to_account, user: userId });
    if (!acc) throw new Error('Invalid account reference');
  }
  if (recurringData.category) {
    const cat = await Category.findOne({ _id: recurringData.category, user: userId });
    if (!cat) throw new Error('Invalid category reference');
  }

  const recurring = new RecurringTransaction({
    ...recurringData,
    user: userId,
  });

  // Calculate first nextExecutionDate if not provided.
  if (!recurring.nextExecutionDate) {
    let nextExecutionDate = new Date(recurring.startDate);
    if (recurring.executionTime) {
      const [hours, minutes] = recurring.executionTime.split(':');
      nextExecutionDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    }
    recurring.nextExecutionDate = nextExecutionDate;
  }

  await recurring.save();

  // Process immediately to register the first transaction if it's due today
  processRecurringTransactions({ recurringExecuted: 0 }).catch(console.error);

  return recurring;
};

exports.updateRecurringTransaction = async (userId, id, data) => {
  const allowedFields = [
    'title', 'amount', 'type', 'account', 'category', 'from_account', 
    'to_account', 'notes', 'repeatType', 'executionTime', 'interval', 
    'startDate', 'endDate', 'neverEnds', 'maxOccurrences', 
    'nextExecutionDate', 'isActive', 'reminderEnabled', 'reminderDaysBefore'
  ];

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
  if (updateData.from_account) {
    const acc = await Account.findOne({ _id: updateData.from_account, user: userId });
    if (!acc) throw new Error('Invalid account reference');
  }
  if (updateData.to_account) {
    const acc = await Account.findOne({ _id: updateData.to_account, user: userId });
    if (!acc) throw new Error('Invalid account reference');
  }
  if (updateData.category) {
    const cat = await Category.findOne({ _id: updateData.category, user: userId });
    if (!cat) throw new Error('Invalid category reference');
  }

  const recurring = await RecurringTransaction.findOneAndUpdate(
    { _id: id, user: userId },
    updateData,
    { returnDocument: 'after', runValidators: true }
  );

  if (!recurring) {
    throw new Error('Recurring transaction not found');
  }

  // Process immediately in case the update made it due
  processRecurringTransactions({ recurringExecuted: 0 }).catch(console.error);

  return recurring;
};

exports.deleteRecurringTransaction = async (userId, id) => {
  const recurring = await RecurringTransaction.findOneAndDelete({ _id: id, user: userId });
  if (!recurring) {
    throw new Error('Recurring transaction not found');
  }
  return recurring;
};

exports.toggleActive = async (userId, id) => {
  const recurring = await RecurringTransaction.findOne({ _id: id, user: userId });
  if (!recurring) {
    throw new Error('Recurring transaction not found');
  }

  recurring.isActive = !recurring.isActive;
  await recurring.save();
  return recurring;
};
