require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const agentService = require('./services/agentService');
const User = require('./models/User');
const Category = require('./models/Category');
const Account = require('./models/Account');

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne();
  const userId = user._id.toString();

  // Create or get mock entities
  const testCat = await Category.findOneAndUpdate({ user: userId, name: 'Cafe', type: 'expense' }, { color: '#000', icon: 'coffee' }, { upsert: true, new: true });
  const testAcc = await Account.findOneAndUpdate({ user: userId, name: 'Cash' }, { balance: 1000 }, { upsert: true, new: true });

  const originalProcess = agentService.processChat.bind(agentService);
  agentService.processChat = async function(uid, msg, hist) {
    const start = Date.now();
    const res = await originalProcess(uid, msg, hist);
    const iters = res.history.filter(m => m.role === 'assistant').length;
    
    // Sum tokens
    let totalPrompt = 0, totalComp = 0;
    // We cannot accurately extract it from here unless we patch groq, but iters is enough to prove efficiency
    
    return { res, iters, duration: Date.now() - start };
  };
  
  // Patch groq to capture total tokens
  const originalCreate = agentService.groq.chat.completions.create.bind(agentService.groq.chat.completions);
  let sessionPrompt = 0;
  let sessionComp = 0;
  
  agentService.groq.chat.completions.create = async function(args) {
    const completion = await originalCreate(args);
    sessionPrompt += completion.usage.prompt_tokens;
    sessionComp += completion.usage.completion_tokens;
    return completion;
  }

  const queries = [
    "How much did I spend this month?",
    "How much did I spend this week?",
    "What did I spend today?",
    "How much did I spend last month?",
    "How much did I spend on Cafe this month?",
    "How much did I spend from my Cash account this week?",
    "What is my overall balance?",
    "Forecast my balance 15 days from now.",
    "Can I afford to buy a $500 TV from my Cash account?"
  ];

  console.log('--- TEMPORAL & REGRESSION TESTS ---');
  for (const q of queries) {
    sessionPrompt = 0;
    sessionComp = 0;
    const { res, iters, duration } = await agentService.processChat(userId, q);
    
    const toolCalls = res.history.filter(m => m.role === 'tool').map(m => m.name);
    
    console.log(`\nQuery: "${q}"`);
    console.log(`Iters: ${iters} | Tool Calls: ${toolCalls.join(', ')}`);
    console.log(`Tokens: Prompt ${sessionPrompt}, Comp ${sessionComp}, Total ${sessionPrompt+sessionComp}`);
    console.log(`Response: ${res.content.substring(0, 150).replace(/\n/g, ' ')}`);
    
    if (iters > 2 && toolCalls.length > 1) {
      console.log('WARNING: Multi-tool loop detected.');
    }
  }

  // Cleanup
  await Category.deleteOne({ _id: testCat._id });
  await Account.deleteOne({ _id: testAcc._id });
  await mongoose.disconnect();
}

runTests();
