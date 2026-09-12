const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const SmartBudgetPlan = require('../models/SmartBudgetPlan');

async function backfillBudgets() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`Starting budget backfill...${isDryRun ? ' [DRY RUN]' : ''}`);

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set. Exiting.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  let stats = {
    budgetsScanned: 0,
    budgetsUpdated: 0,
    smartBudgetsScanned: 0,
    smartBudgetsUpdated: 0,
    transactionsConsidered: 0,
    errors: 0
  };

  try {
    // 1. Backfill Budgets
    const budgets = await Budget.find({ isActive: true });
    stats.budgetsScanned = budgets.length;

    for (const budget of budgets) {
      if (!budget.startDate || !budget.endDate) continue;

      const query = {
        user: budget.user,
        category: budget.category._id || budget.category,
        type: 'expense',
        date: { $gte: budget.startDate, $lte: budget.endDate }
      };

      if (budget.account) {
        query.$or = [{ account: budget.account }, { from_account: budget.account }];
      }

      const txs = await Transaction.find(query).select('amount').lean();
      stats.transactionsConsidered += txs.length;
      
      const spent = txs.reduce((sum, tx) => sum + (tx.amount || 0), 0);

      if (budget.spent !== spent) {
        if (!isDryRun) {
          await Budget.updateOne({ _id: budget._id }, { $set: { spent } });
        }
        stats.budgetsUpdated++;
      }
    }

    // 2. Backfill SmartBudgetPlans
    const smartBudgets = await SmartBudgetPlan.find({ status: 'confirmed', groupAsMaster: true });
    stats.smartBudgetsScanned = smartBudgets.length;

    for (const sb of smartBudgets) {
      if (!sb.startDate || !sb.endDate || !sb.categories || sb.categories.length === 0) continue;

      const categoryIds = sb.categories.map(c => c.category);
      const query = {
        user: sb.user,
        category: { $in: categoryIds },
        type: 'expense',
        date: { $gte: sb.startDate, $lte: sb.endDate }
      };

      const txs = await Transaction.find(query).select('amount').lean();
      stats.transactionsConsidered += txs.length;
      
      const spent = txs.reduce((sum, tx) => sum + (tx.amount || 0), 0);

      if (sb.spent !== spent) {
        if (!isDryRun) {
          await SmartBudgetPlan.updateOne({ _id: sb._id }, { $set: { spent } });
        }
        stats.smartBudgetsUpdated++;
      }
    }

    console.log('\n--- BACKFILL COMPLETE ---');
    console.log(`Budgets scanned:        ${stats.budgetsScanned}`);
    console.log(`Budgets updated:        ${stats.budgetsUpdated}`);
    console.log(`Smart budgets scanned:  ${stats.smartBudgetsScanned}`);
    console.log(`Smart budgets updated:  ${stats.smartBudgetsUpdated}`);
    console.log(`Transactions summed:    ${stats.transactionsConsidered}`);
    console.log(`Errors encountered:     ${stats.errors}`);

  } catch (err) {
    console.error('Fatal error during backfill:', err);
    stats.errors++;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(stats.errors > 0 ? 1 : 0);
  }
}

backfillBudgets();
