import { createRequire } from 'module';
const require = createRequire('d:/expenses-tracker/backend/package.json');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'd:/expenses-tracker/backend/.env' });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const debts = await mongoose.connection.db.collection('debts').find({}).toArray();
  const debtTxs = await mongoose.connection.db.collection('debttransactions').find({}).toArray();
  const receivables = await mongoose.connection.db.collection('receivables').find({}).toArray();
  
  console.log('--- DEBTS ---', JSON.stringify(debts.map(d => ({ _id: d._id, personName: d.personName, type: d.type, initialAmount: d.initialAmount, createdAt: d.createdAt })), null, 2));
  console.log('--- DEBT TRANSACTIONS ---', JSON.stringify(debtTxs.map(t => ({ _id: t._id, debtId: t.debtId, amount: t.amount, type: t.type, date: t.date, createdAt: t.createdAt })), null, 2));
  console.log('--- RECEIVABLES ---', JSON.stringify(receivables.map(r => ({ _id: r._id, title: r.title, paidAmount: r.paidAmount, participants: r.participants?.map(p => ({ name: p.name, payments: p.payments })) })), null, 2));
  
  await mongoose.disconnect();
}

check().catch(console.error);
