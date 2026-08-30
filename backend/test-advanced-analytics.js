require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const agentService = require('./services/agentService');
const User = require('./models/User');
const Category = require('./models/Category');
const Account = require('./models/Account');
const Transaction = require('./models/Transaction');

async function setupMockData(userId) {
  // Create accounts
  const cash = await Account.findOneAndUpdate({ user: userId, name: 'Cash' }, { balance: 1000 }, { upsert: true, new: true });
  const bank = await Account.findOneAndUpdate({ user: userId, name: 'Bank' }, { balance: 5000 }, { upsert: true, new: true });
  
  // Create categories
  const cafe = await Category.findOneAndUpdate({ user: userId, name: 'Cafe', type: 'expense' }, { color: '#000', icon: 'coffee' }, { upsert: true, new: true });
  const transport = await Category.findOneAndUpdate({ user: userId, name: 'Transport', type: 'expense' }, { color: '#111', icon: 'car' }, { upsert: true, new: true });
  const groceries = await Category.findOneAndUpdate({ user: userId, name: 'Groceries', type: 'expense' }, { color: '#222', icon: 'shopping-cart' }, { upsert: true, new: true });
  const salary = await Category.findOneAndUpdate({ user: userId, name: 'Salary', type: 'income' }, { color: '#333', icon: 'dollar-sign' }, { upsert: true, new: true });
  
  // Create some transactions
  // This month
  const thisMonth = new Date();
  
  // Last month
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  // 2 months ago
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  await Transaction.deleteMany({ user: userId, title: { $regex: /^TEST_/ } });
  
  const txs = [
    // This month
    { user: userId, title: 'TEST_Cafe', amount: 100, type: 'expense', category: cafe._id, account: cash._id, date: thisMonth },
    { user: userId, title: 'TEST_Cafe', amount: 50, type: 'expense', category: cafe._id, account: cash._id, date: thisMonth },
    { user: userId, title: 'TEST_Transport', amount: 200, type: 'expense', category: transport._id, account: bank._id, date: thisMonth },
    { user: userId, title: 'TEST_Salary', amount: 3000, type: 'income', category: salary._id, account: bank._id, date: thisMonth },
    
    // Last month
    { user: userId, title: 'TEST_Cafe', amount: 80, type: 'expense', category: cafe._id, account: cash._id, date: lastMonth },
    { user: userId, title: 'TEST_Groceries', amount: 300, type: 'expense', category: groceries._id, account: bank._id, date: lastMonth },
    { user: userId, title: 'TEST_Salary', amount: 3000, type: 'income', category: salary._id, account: bank._id, date: lastMonth },
    
    // 2 months ago
    { user: userId, title: 'TEST_Transport', amount: 150, type: 'expense', category: transport._id, account: bank._id, date: twoMonthsAgo },
  ];
  
  await Transaction.insertMany(txs);
  
  return { cash, bank, cafe, transport, groceries, salary };
}

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne();
  const userId = user._id.toString();

  console.log('Setting up mock data...');
  await setupMockData(userId);

  const originalProcess = agentService.processChat.bind(agentService);
  agentService.processChat = async function(uid, msg, hist) {
    const res = await originalProcess(uid, msg, hist);
    const iters = res.history.filter(m => m.role === 'assistant').length;
    return { res, iters };
  };
  
  const originalCreate = agentService.groq.chat.completions.create.bind(agentService.groq.chat.completions);
  let sessionPrompt = 0;
  let sessionComp = 0;
  
  let exposedTools = [];
  agentService.groq.chat.completions.create = async function(args) {
    if (args.tools) {
      exposedTools.push(args.tools.length);
    }
    const completion = await originalCreate(args);
    sessionPrompt += completion.usage.prompt_tokens;
    sessionComp += completion.usage.completion_tokens;
    return completion;
  }

  const queries = [
    "How much did I spend this month?",
    "How much did I spend on Cafe this month?",
    "Did I spend more this month than last month?",
    "How much did I spend on Cafe this month compared to last month?",
    "Where did most of my money go this month?",
    "Is my spending increasing lately?",
    "Is my spending decreasing?",
    "Which category increased the most compared to last month?",
    "What changed in my spending recently?",
    "Forecast my balance for 30 days.",
    "Can I afford a $500 TV?",
    "What's my balance and can I afford a $500 TV?"
  ];

  console.log('\n--- ADVANCED ANALYTICS TESTS ---');
  for (const q of queries) {
    sessionPrompt = 0;
    sessionComp = 0;
    exposedTools = [];
    const { res, iters } = await agentService.processChat(userId, q);
    
    const toolCalls = res.history.filter(m => m.role === 'tool').map(m => m.name);
    const toolResults = res.history.filter(m => m.role === 'tool').map(m => m.content ? m.content.length : 0);
    
    console.log(`\nQuery: "${q}"`);
    console.log(`Exposed Tools: ${exposedTools.join(', ')}`);
    console.log(`Iters: ${iters} | Tool Calls: ${toolCalls.join(', ')}`);
    console.log(`Tool Result Sizes (chars): ${toolResults.join(', ')}`);
    console.log(`Tokens: Prompt ${sessionPrompt}, Comp ${sessionComp}, Total ${sessionPrompt+sessionComp}`);
    console.log(`Response: ${res.content.substring(0, 150).replace(/\n/g, ' ')}`);
    
    if (iters > 2 && toolCalls.length > 1) {
      console.log('WARNING: Multi-tool loop detected.');
    }
  }

  // Cleanup
  await Transaction.deleteMany({ user: userId, title: { $regex: /^TEST_/ } });
  await mongoose.disconnect();
}

runTests();
