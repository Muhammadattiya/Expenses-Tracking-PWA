import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/expenses-tracker/backend/.env' });
import Account from '../backend/models/Account.js';
import User from '../backend/models/User.js';
import Transaction from '../backend/models/Transaction.js';
import StateBuilder from '../backend/services/simulation/stateBuilder.js';
import FinancialCalculator from '../backend/services/simulation/financialCalculator.js';

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email: 'gemini@gmail.com' });
  if (!user) { console.log('User not found'); process.exit(0); }
  
  const baseState = await StateBuilder.buildState(user._id);
  const metrics = FinancialCalculator.calculate(baseState);
  
  console.log('User Accounts with calculated balance:');
  metrics.accounts.forEach(a => {
    console.log(`Account "${a.name}" (_id: ${a._id}): balance = ${a.balance}`);
  });
  
  process.exit(0);
}
check().catch(console.error);
