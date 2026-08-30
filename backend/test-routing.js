require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Account = require('./models/Account');
const Transaction = require('./models/Transaction');
const agentService = require('./services/agentService');
const { agentToolsDefinition } = require('./services/agentTools');

async function runTests() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expenses-tracker');

  const userId = '64abcd000000000000000000'; // mock
  const originalCreate = agentService.groq.chat.completions.create.bind(agentService.groq.chat.completions);
  
  let exposedToolsList = [];
  let tokenPrompt = 0;
  let tokenComp = 0;

  agentService.groq.chat.completions.create = async function(args) {
    if (args.tools) {
      exposedToolsList.push(args.tools.map(t => t.function.name));
    }
    const completion = await originalCreate(args);
    if(completion.usage) {
       tokenPrompt += completion.usage.prompt_tokens;
       tokenComp += completion.usage.completion_tokens;
    }
    return completion;
  }

  const queries = [
    { q: "Am I spending more lately?", exp: "spending_trend" },
    { q: "Is my spending going up?", exp: "spending_trend" },
    { q: "Are my expenses getting higher?", exp: "spending_trend" },
    { q: "How has my spending changed recently?", exp: "spending_trend" },
    { q: "Did my spending increase?", exp: "spending_trend" },
    { q: "Is my spending increasing lately?", exp: "spending_trend" },
    
    { q: "Did I spend more this month than last month?", exp: "compare_periods" },
    { q: "Was last month cheaper than this month?", exp: "compare_periods" },
    { q: "Compare my spending this month and last month.", exp: "compare_periods" },
    { q: "How much more did I spend this month?", exp: "compare_periods" },
    
    { q: "Where am I spending the most?", exp: "spending_by_category" },
    { q: "What categories cost me the most?", exp: "spending_by_category" },
    { q: "Show me my biggest spending categories.", exp: "spending_by_category" },
    { q: "What did I spend the most money on?", exp: "spending_by_category" },
    
    { q: "Which category increased the most compared to last month?", exp: "category_comparison" },
    { q: "Which categories changed the most?", exp: "category_comparison" },
    { q: "What categories are costing me more than before?", exp: "category_comparison" },
    
    { q: "How much did I spend on Cafe this month?", exp: "get_financial_summary" },
    { q: "How much did I spend from Cash this month?", exp: "get_financial_summary" },
    { q: "How much did I spend on Cafe this month compared to last month?", exp: "compare_periods" },
    
    { q: "What's my balance and can I afford a $500 TV?", exp: "get_financial_summary, simulate_purchase" },
    { q: "What's my balance and how much did I spend on Cafe this month?", exp: "get_financial_summary" },

    { q: "هل مصاريفي زادت مؤخرا؟", exp: "spending_trend" },
    { q: "هل صرفت هذا الشهر اكثر من الشهر الماضي؟", exp: "compare_periods" },
    { q: "وين صرفت فلوسي اكثر شي؟", exp: "spending_by_category" },
    { q: "ايش اكثر فئة زاد الصرف عليها؟", exp: "category_comparison" },
    { q: "كم صرفت على القهوة هذا الشهر؟", exp: "get_financial_summary" }
  ];

  console.log('--- ROUTING VALIDATION PASS ---');
  
  for (const item of queries) {
    exposedToolsList = [];
    tokenPrompt = 0;
    tokenComp = 0;

    const res = await agentService.processChat(userId, item.q);
    const iters = res.history.filter(m => m.role === 'assistant').length;
    
    const toolCalls = res.history.filter(m => m.role === 'tool').map(m => m.name);
    const exposed = exposedToolsList[0] || [];
    
    console.log(`\nQuery: "${item.q}"`);
    console.log(`Expected: ${item.exp}`);
    console.log(`Exposed Tools (${exposed.length}): ${exposed.length === 10 ? 'ALL (Fallback)' : exposed.join(', ')}`);
    console.log(`Actual Calls: ${toolCalls.join(', ')}`);
    console.log(`Iters: ${iters} | Total Tokens: ${tokenPrompt + tokenComp}`);
    
    let isCorrect = false;
    const expectedList = item.exp.split(', ');
    for (const expTool of expectedList) {
       if (toolCalls.includes(expTool)) isCorrect = true;
    }
    console.log(`Verdict: ${isCorrect ? 'PASS' : 'FAIL'}`);
  }

  await mongoose.disconnect();
}

runTests();
