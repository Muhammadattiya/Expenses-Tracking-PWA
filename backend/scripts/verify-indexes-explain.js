const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const Budget = require('../models/Budget');
const SmartBudgetPlan = require('../models/SmartBudgetPlan');

async function testExplain() {
  await mongoose.connect(process.env.MONGO_URI);
  const dummyUser = new mongoose.Types.ObjectId();
  const dummyCat = new mongoose.Types.ObjectId();
  const now = new Date();

  console.log('=== EXPLAIN BUDGET QUERY ===');
  const bExplain = await Budget.find({
    user: dummyUser,
    category: dummyCat,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  }).explain('executionStats');
  
  const bWinning = bExplain.queryPlanner.winningPlan;
  console.log('Budget stage:', bWinning.stage, bWinning.inputStage?.stage);
  console.log('Budget indexName:', bWinning.inputStage?.indexName || bWinning.indexName);
  console.log('Budget totalDocsExamined:', bExplain.executionStats?.totalDocsExamined);

  console.log('\n=== EXPLAIN SMART BUDGET QUERY ===');
  const sbExplain = await SmartBudgetPlan.find({
    user: dummyUser,
    status: 'confirmed',
    groupAsMaster: true
  }).explain('executionStats');

  const sbWinning = sbExplain.queryPlanner.winningPlan;
  console.log('SmartBudget stage:', sbWinning.stage, sbWinning.inputStage?.stage);
  console.log('SmartBudget indexName:', sbWinning.inputStage?.indexName || sbWinning.indexName);
  console.log('SmartBudget totalDocsExamined:', sbExplain.executionStats?.totalDocsExamined);

  process.exit(0);
}
testExplain().catch(err => { console.error(err); process.exit(1); });
