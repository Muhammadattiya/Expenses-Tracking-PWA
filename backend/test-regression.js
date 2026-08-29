require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Account = require('./models/Account');
const Transaction = require('./models/Transaction');
const agentService = require('./services/agentService');
const { agentToolsDefinition } = require('./services/agentTools');

async function runTests() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expenses-tracker');
  const user = await require('./models/User').findOne();
  const userId = user._id.toString();
  
  const originalCreate = agentService.groq.chat.completions.create.bind(agentService.groq.chat.completions);
  
  let exposedToolsList = [];
  let tokenPrompt = 0;
  let tokenComp = 0;
  let retries = 0;

  agentService.groq.chat.completions.create = async function(args) {
    if (args.tools) {
      exposedToolsList.push(args.tools.map(t => t.function.name));
    }
    try {
      const completion = await originalCreate(args);
      if(completion.usage) {
         tokenPrompt += completion.usage.prompt_tokens;
         tokenComp += completion.usage.completion_tokens;
      }
      return completion;
    } catch (e) {
      retries++;
      throw e;
    }
  }

  const queries = [
    // Trend
    { q: "Am I spending more lately?", exp: "spending_trend" },
    { q: "Is my spending going up?", exp: "spending_trend" },
    { q: "Are my expenses getting higher?", exp: "spending_trend" },
    { q: "Did my spending increase?", exp: "spending_trend" },
    { q: "Is my spending increasing lately?", exp: "spending_trend" },
    
    // Compare periods
    { q: "Did I spend more this month than last month?", exp: "compare_periods" },
    { q: "Was last month cheaper than this month?", exp: "compare_periods" },
    { q: "Compare my spending this month and last month.", exp: "compare_periods" },
    { q: "How much more did I spend this month?", exp: "compare_periods" },
    
    // Category Distribution
    { q: "Where am I spending the most?", exp: "spending_by_category" },
    { q: "What categories cost me the most?", exp: "spending_by_category" },
    { q: "Show me my biggest spending categories.", exp: "spending_by_category" },
    
    // Category comparison
    { q: "Which category increased the most compared to last month?", exp: "category_comparison" },
    { q: "Which categories changed the most?", exp: "category_comparison" },
    
    // Summary & Entity preservation
    { q: "How much did I spend on Cafe this month?", exp: "get_financial_summary" },
    { q: "How much did I spend from Cash this month?", exp: "get_financial_summary" },
    { q: "How much did I spend on Cafe this month compared to last month?", exp: "compare_periods" },
    
    // Compound
    { q: "What's my balance and can I afford a $500 TV?", exp: "get_financial_summary, simulate_purchase" },

    // Arabic
    { q: "هل مصاريفي بتزيد؟", exp: "spending_trend" },
    { q: "هل صرفي بيزيد؟", exp: "spending_trend" },
    { q: "مصاريفي زادت مؤخراً", exp: "spending_trend" },
    { q: "مقارنة بالشهر اللي فات صرفت أكتر؟", exp: "compare_periods" },
    { q: "فين صرفت أكتر الشهر ده؟", exp: "spending_by_category" },
    { q: "أنهي فئة زادت أكتر؟", exp: "category_comparison" },
    { q: "أقدر أشتري تلفزيون بـ500؟", exp: "simulate_purchase" },
    { q: "الرصيد هيبقى كام بعد 15 يوم؟", exp: "forecast_balance" }
  ];

  console.log('--- ROUTING REGRESSION PASS ---');
  let totalPrompt = 0;
  let totalComp = 0;
  
  for (const item of queries) {
    exposedToolsList = [];
    tokenPrompt = 0;
    tokenComp = 0;
    retries = 0;

    const res = await agentService.processChat(userId, item.q);
    const iters = res.history.filter(m => m.role === 'assistant').length;
    
    const toolCalls = res.history.filter(m => m.role === 'tool').map(m => m.name);
    const exposed = exposedToolsList[0] || [];
    
    console.log(`\nQuery: "${item.q}"`);
    console.log(`Expected: ${item.exp}`);
    console.log(`Exposed Tools (${exposed.length}): ${exposed.length === 10 ? 'ALL (Fallback)' : exposed.join(', ')}`);
    console.log(`Actual Calls: ${toolCalls.join(', ')}`);
    console.log(`Iters: ${iters} | Total Tokens: ${tokenPrompt + tokenComp} | Retries: ${retries}`);
    
    let isCorrect = false;
    const expectedList = item.exp.split(', ');
    for (const expTool of expectedList) {
       if (toolCalls.includes(expTool)) isCorrect = true;
    }
    console.log(`Verdict: ${isCorrect ? 'PASS' : 'FAIL'}`);
    totalPrompt += tokenPrompt;
    totalComp += tokenComp;
    
    // small delay to prevent rate limit
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total Queries: ${queries.length}`);
  console.log(`Total Tokens: ${totalPrompt + totalComp}`);
  console.log(`Average Tokens per Query: ${Math.round((totalPrompt + totalComp)/queries.length)}`);

  await mongoose.disconnect();
}

runTests().catch(console.error);
