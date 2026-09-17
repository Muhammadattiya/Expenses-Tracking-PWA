import path from 'path';
import { createRequire } from 'module';
const require = createRequire('d:/expenses-tracker/backend/package.json');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'd:/expenses-tracker/backend/.env' });

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await mongoose.connection.db.collection('users').findOne({ email: { $regex: /gemini/i } });
  if (!user) throw new Error('User gemini not found');

  let account = await mongoose.connection.db.collection('accounts').findOne({ user: user._id });
  if (!account) {
    const accRes = await mongoose.connection.db.collection('accounts').insertOne({
      user: user._id,
      name: 'Cash Wallet',
      balance: 5000,
      color: '#8D6346',
      icon: 'Wallet',
      createdAt: new Date()
    });
    account = { _id: accRes.insertedId };
  }

  // Clear existing debts for clean sample
  await mongoose.connection.db.collection('debts').deleteMany({ user: user._id });
  await mongoose.connection.db.collection('receivables').deleteMany({ user: user._id });

  // Add sample personal debts
  await mongoose.connection.db.collection('debts').insertMany([
    {
      user: user._id,
      personName: 'Ahmed Mansour',
      type: 'owed_to_me',
      initialAmount: 1500,
      remainingAmount: 500,
      status: 'active',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
    },
    {
      user: user._id,
      personName: 'Kareem El-Sayed',
      type: 'i_owe',
      initialAmount: 2400,
      remainingAmount: 2400,
      status: 'active',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)
    },
    {
      user: user._id,
      personName: 'Omar Farouk',
      type: 'owed_to_me',
      initialAmount: 800,
      remainingAmount: 0,
      status: 'settled',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10)
    }
  ]);

  // Add sample group expense (Split bill)
  await mongoose.connection.db.collection('receivables').insertOne({
    user: user._id,
    title: 'Weekend BBQ Gathering',
    paidAmount: 2200,
    paidFrom: account._id,
    receivedAmount: 600,
    participants: [
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Tarek',
        owedAmount: 500,
        paidAmount: 500,
        payments: [{ amount: 500, account: account._id, paidAt: new Date() }]
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Hassan',
        owedAmount: 500,
        paidAmount: 0,
        payments: []
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Youssef',
        owedAmount: 600,
        paidAmount: 200,
        payments: [{ amount: 200, account: account._id, paidAt: new Date() }]
      }
    ],
    createdAt: new Date()
  });

  console.log('Successfully seeded sample debts and receivables!');
  await mongoose.disconnect();
}

seed().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
