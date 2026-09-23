import mongoose from 'mongoose';
import Account from '../backend/models/Account.js';
import Transaction from '../backend/models/Transaction.js';
import DebtTransaction from '../backend/models/DebtTransaction.js';
import InstallmentTransaction from '../backend/models/InstallmentTransaction.js';
import Receivable from '../backend/models/Receivable.js';
import User from '../backend/models/User.js';

async function check() {
  await mongoose.connect('mongodb://localhost:27017/expenses-tracker');
  const user = await User.findOne({ email: 'gemini@gmail.com' });
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }

  const accounts = await Account.find({ user: user._id }).lean();
  const txs = await Transaction.find({ user: user._id }).lean();
  const debtTxs = await DebtTransaction.find({ user: user._id }).lean();
  const instTxs = await InstallmentTransaction.find({ user: user._id }).lean();
  const receivables = await Receivable.find({ user: user._id }).lean();

  console.log(`Found ${accounts.length} accounts, ${txs.length} txs, ${debtTxs.length} debtTxs, ${instTxs.length} instTxs, ${receivables.length} receivables`);

  accounts.forEach(acc => {
    const accId = acc._id.toString();
    
    // Method 1: naive (PlansTab current logic)
    let naiveBal = Number(acc.balance_adjustment) || 0;
    txs.forEach(t => {
      const amt = Number(t.amount) || 0;
      const tAcc = (t.account?._id || t.account)?.toString();
      const tFrom = (t.from_account?._id || t.from_account)?.toString();
      const tTo = (t.to_account?._id || t.to_account)?.toString();
      if (t.type === 'income' || t.type === 'settlement') {
        if (tAcc === accId) naiveBal += amt;
      } else if (t.type === 'expense') {
        if (tAcc === accId) naiveBal -= amt;
      } else if (t.type === 'transfer') {
        if (tFrom === accId) naiveBal -= amt;
        if (tTo === accId) naiveBal += amt;
      }
    });

    // Method 2: complete (Dashboard & AccountManagement logic)
    let fullBal = Number(acc.balance_adjustment) || 0;
    txs.forEach(t => {
      const amt = Number(t.amount) || 0;
      const tAcc = (t.account?._id || t.account)?.toString();
      const tFrom = (t.from_account?._id || t.from_account)?.toString();
      const tTo = (t.to_account?._id || t.to_account)?.toString();
      if (t.type === 'income' || t.type === 'settlement') {
        if (tAcc === accId) fullBal += amt;
      } else if (t.type === 'expense') {
        if (tAcc === accId) fullBal -= amt;
      } else if (t.type === 'transfer') {
        if (tFrom === accId) fullBal -= amt;
        if (tTo === accId) fullBal += amt;
      }
    });
    debtTxs.forEach(dt => {
      const dtAcc = (dt.account?._id || dt.account)?.toString();
      if (dtAcc === accId) {
        if (dt.type === 'loan') fullBal -= dt.amount;
        else if (dt.type === 'repayment') fullBal -= dt.amount;
      }
    });
    instTxs.forEach(it => {
      const itAcc = (it.account?._id || it.account)?.toString();
      if (itAcc === accId) {
        fullBal -= (Number(it.amount) || 0);
      }
    });
    receivables.forEach(r => {
      const paidFrom = (r.paidFrom?._id || r.paidFrom)?.toString();
      const recTo = (r.receivedTo?._id || r.receivedTo)?.toString();
      if (paidFrom === accId) fullBal -= r.paidAmount;
      if (recTo === accId) fullBal += r.receivedAmount;
      if (r.participants) {
        r.participants.forEach(p => {
          if (p.payments) {
            p.payments.forEach(pay => {
              if ((pay.account?._id || pay.account)?.toString() === accId) fullBal += pay.amount;
            });
          }
        });
      }
    });

    console.log(`Account "${acc.name}" (${acc.type}):`);
    console.log(`   Naive Bal (PlansTab): ${naiveBal} -> Math.max(0): ${Math.max(0, naiveBal)}`);
    console.log(`   Full Bal (Dashboard/Settings): ${fullBal}`);
  });

  await mongoose.disconnect();
}

check();
