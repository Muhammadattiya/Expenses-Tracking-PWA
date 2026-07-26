const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // Adjust if needed
const RecurringTransaction = require('./models/RecurringTransaction');

async function run() {
  try {
    // connect to mongo
    await mongoose.connect('mongodb://127.0.0.1:27017/expenses-tracker' || process.env.MONGODB_URI);
    const recurring = await RecurringTransaction.findOne();
    if (!recurring) {
      console.log('No recurring transaction found');
      return;
    }
    console.log('Found:', recurring);

    const payload = {
      amount: recurring.amount,
      title: recurring.title,
      type: recurring.type,
      repeatType: recurring.repeatType,
      interval: recurring.interval,
      neverEnds: recurring.neverEnds,
      executionTime: recurring.executionTime
    };

    if (recurring.type === "transfer") {
      payload.from_account = recurring.from_account;
      payload.to_account = recurring.to_account;
    } else {
      payload.account = recurring.account;
      payload.category = recurring.category;
    }

    const updated = await RecurringTransaction.findOneAndUpdate(
      { _id: recurring._id },
      payload,
      { new: true, runValidators: true }
    );
    console.log('Success:', updated);
  } catch (err) {
    console.error('Validation Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
