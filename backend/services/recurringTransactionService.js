const RecurringTransaction = require('../models/RecurringTransaction');
const { processRecurringTransactions } = require('./cronJobs');

exports.getRecurringTransactions = async (userId) => {
  return await RecurringTransaction.find({ user: userId }).sort({ createdAt: -1 });
};

exports.createRecurringTransaction = async (userId, data) => {
  const recurring = new RecurringTransaction({
    ...data,
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
  const recurring = await RecurringTransaction.findOneAndUpdate(
    { _id: id, user: userId },
    data,
    { returnDocument: 'after' }
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
