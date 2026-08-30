require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Account = require('./models/Account');
const Transaction = require('./models/Transaction');
const agentService = require('./services/agentService');

const queries = [
  // Trend (spending_trend)
  { q: "Am I spending more lately?", exp: "spending_trend" },
  { q: "Is my spending going up?", exp: "spending_trend" },
  { q: "Are my expenses getting higher?", exp: "spending_trend" },
  { q: "Did my spending increase?", exp: "spending_trend" },
  { q: "Has my spending increased recently?", exp: "spending_trend" },
  { q: "Is my spending getting worse?", exp: "spending_trend" },
  { q: "Am I spending less than before?", exp: "spending_trend" },
  { q: "Are my expenses going down?", exp: "spending_trend" },
  { q: "How is my spending trending?", exp: "spending_trend" },
  { q: "What's happening with my spending lately?", exp: "spending_trend" },

  // Compare periods
  { q: "Did I spend more this month than last month?", exp: "compare_periods" },
  { q: "Did I spend less this month than last month?", exp: "compare_periods" },
  { q: "Was last month cheaper?", exp: "compare_periods" },
  { q: "Compare this month with last month.", exp: "compare_periods" },
  { q: "Compare January and February.", exp: "compare_periods" },
  { q: "How much more did I spend this month?", exp: "compare_periods" },
  { q: "How much less did I spend last month?", exp: "compare_periods" },
  { q: "How does this month compare to last month?", exp: "compare_periods" },
  { q: "What is the difference between this month and last month?", exp: "compare_periods" },
  { q: "Did my spending change from January to February?", exp: "compare_periods" },

  // Category
  { q: "Where did most of my money go?", exp: "spending_by_category" },
  { q: "Where am I spending the most?", exp: "spending_by_category" },
  { q: "What categories cost me the most?", exp: "spending_by_category" },
  { q: "Show my biggest spending categories.", exp: "spending_by_category" },
  { q: "What do I spend the most money on?", exp: "spending_by_category" },
  { q: "Which categories take most of my money?", exp: "spending_by_category" },
  { q: "Break down my spending by category.", exp: "spending_by_category" },

  // Category Comparison
  { q: "Which category increased the most?", exp: "category_comparison" },
  { q: "Which category changed the most?", exp: "category_comparison" },
  { q: "Which categories increased compared to last month?", exp: "category_comparison" },
  { q: "Which categories decreased?", exp: "category_comparison" },
  { q: "What categories changed between this month and last month?", exp: "category_comparison" },
  { q: "What spending categories changed the most?", exp: "category_comparison" },

  // Summary
  { q: "What's my balance?", exp: "get_financial_summary" },
  { q: "What's my overall balance?", exp: "get_financial_summary" },
  { q: "How much did I spend?", exp: "get_financial_summary" },
  { q: "How much did I earn?", exp: "get_financial_summary" },
  { q: "Give me my financial summary.", exp: "get_financial_summary" },
  { q: "How am I doing financially?", exp: "get_financial_summary, FALLBACK" },

  // Entity Queries
  { q: "How much did I spend on Cafe?", exp: "get_financial_summary" },
  { q: "How much did I spend on Food?", exp: "get_financial_summary" },
  { q: "How much did I spend from Cash?", exp: "get_financial_summary" },
  { q: "How much did I spend from my Bank account?", exp: "get_financial_summary" },
  { q: "Compare my Cafe spending this month and last month.", exp: "compare_periods" },
  { q: "How much did I spend on Travel last month?", exp: "get_financial_summary" },

  // Forecast
  { q: "What will my balance be in 15 days?", exp: "forecast_balance" },
  { q: "Forecast my balance for the next month.", exp: "forecast_balance" },
  { q: "What will my balance look like next week?", exp: "forecast_balance" },
  { q: "How much money will I have in 30 days?", exp: "forecast_balance" },

  // Simulation
  { q: "Can I afford a $500 TV?", exp: "simulate_purchase" },
  { q: "Can I afford to buy a $1000 laptop?", exp: "simulate_purchase" },
  { q: "What happens if I spend $300 on a phone?", exp: "simulate_purchase" },
  { q: "If I buy a $500 TV, will I be okay?", exp: "simulate_purchase" },
  { q: "Can I afford this purchase?", exp: "simulate_purchase" },

  // Compound Queries
  { q: "What's my balance and can I afford a $500 TV?", exp: "get_financial_summary, simulate_purchase" },
  { q: "What's my balance and how much did I spend on Cafe?", exp: "get_financial_summary" },
  { q: "How much did I spend this month and what will my balance be in 15 days?", exp: "get_financial_summary, forecast_balance" },
  { q: "Can I afford a $500 TV and how much did I spend last month?", exp: "simulate_purchase, get_financial_summary" },

  // Arabic
  { q: "هل مصاريفي بتزيد؟", exp: "spending_trend" },
  { q: "هل صرفي بيزيد؟", exp: "spending_trend" },
  { q: "مصاريفي زادت مؤخراً", exp: "spending_trend" },
  { q: "هل أنا بصرف أكتر الفترة دي؟", exp: "spending_trend" },
  { q: "مصاريفي بتقل ولا بتزيد؟", exp: "spending_trend" },
  
  { q: "صرفت أكتر الشهر ده من الشهر اللي فات؟", exp: "compare_periods" },
  { q: "مقارنة بالشهر اللي فات صرفت أكتر؟", exp: "compare_periods" },
  { q: "قارن مصاريفي بين يناير وفبراير", exp: "compare_periods" },
  { q: "الفرق بين صرفي الشهر ده والشهر اللي فات إيه؟", exp: "compare_periods" },
  { q: "الشهر ده صرفت أقل ولا أكتر؟", exp: "compare_periods" },
  
  { q: "فين صرفت أكتر؟", exp: "spending_by_category" },
  { q: "أكتر حاجة بصرف عليها إيه؟", exp: "spending_by_category" },
  { q: "أكتر فئة بصرف عليها إيه؟", exp: "spending_by_category" },
  { q: "وريني أكتر الفئات اللي بصرف عليها", exp: "spending_by_category" },
  
  { q: "أنهي فئة زادت أكتر؟", exp: "category_comparison" },
  { q: "أنهي فئة اتغيرت؟", exp: "category_comparison" },
  { q: "إيه الفئات اللي زادت الشهر ده؟", exp: "category_comparison" },
  { q: "إيه الفئات اللي قلت؟", exp: "category_comparison" },
  
  { q: "أقدر أشتري تلفزيون بـ500؟", exp: "simulate_purchase" },
  { q: "لو اشتريت لابتوب بـ1000 هقدر؟", exp: "simulate_purchase" },
  { q: "لو صرفت 300 على موبايل هيحصل إيه؟", exp: "simulate_purchase" },
  
  { q: "الرصيد هيبقى كام بعد 15 يوم؟", exp: "forecast_balance" },
  { q: "توقع الرصيد الشهر الجاي", exp: "forecast_balance" },
  { q: "بعد شهر هيبقى معايا كام؟", exp: "forecast_balance" }
];

async function runTests() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expenses-tracker');
  const user = await User.findOne();
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
    
    while(true) {
      try {
        const completion = await originalCreate(args);
        if(completion.usage) {
           tokenPrompt += completion.usage.prompt_tokens;
           tokenComp += completion.usage.completion_tokens;
        }
        return completion;
      } catch (e) {
        if (e.status === 429) {
          retries++;
          let waitTime = 10000;
          const match = e.message.match(/try again in ([\d\.]+)s/);
          if (match && match[1]) {
            waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 1000;
          } else if (e.message.match(/try again in ([\d\.]+)m([\d\.]+)s/)) {
            const m = e.message.match(/try again in ([\d\.]+)m([\d\.]+)s/);
            waitTime = (parseInt(m[1]) * 60 + parseFloat(m[2])) * 1000 + 2000;
          }
          console.log(`[RATE LIMIT] Waiting ${waitTime}ms...`);
          await new Promise(r => setTimeout(r, waitTime));
        } else {
          throw e;
        }
      }
    }
  }

  console.log('--- ROUTING STRESS PASS ---');
  let totalPrompt = 0;
  let totalComp = 0;
  let totalIters = 0;
  let correctCount = 0;
  let fallbackCount = 0;
  let totalExposed = 0;
  
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
    let isFallback = exposed.length === 10;
    
    if (item.exp.includes('FALLBACK')) {
      if (isFallback) {
         isCorrect = true;
      }
    } else {
      const expectedList = item.exp.split(', ');
      for (const expTool of expectedList) {
         if (toolCalls.includes(expTool)) isCorrect = true;
      }
      if (isFallback) {
         // Fallback on a query that has a specific expected intent is a false negative in routing
         // but if it actually gets the right tool, we can still flag it as "FAIL" for routing accuracy?
         // User said: "Do not treat fallback as a failure when the query is genuinely ambiguous."
         // For high confidence queries, fallback is a false negative.
         isCorrect = false;
      }
    }
    
    if (isCorrect) correctCount++;
    if (isFallback) fallbackCount++;
    totalPrompt += tokenPrompt;
    totalComp += tokenComp;
    totalIters += iters;
    totalExposed += exposed.length;
    
    console.log(`Verdict: ${isCorrect ? 'PASS' : 'FAIL'}`);
    
    // minimal delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total Queries: ${queries.length}`);
  console.log(`Routing Accuracy: ${Math.round((correctCount/queries.length)*100)}%`);
  console.log(`Fallback Rate: ${Math.round((fallbackCount/queries.length)*100)}%`);
  console.log(`Average Exposed Tools: ${(totalExposed/queries.length).toFixed(1)}`);
  console.log(`Average Tokens per Query: ${Math.round((totalPrompt + totalComp)/queries.length)}`);
  console.log(`Average Iterations: ${(totalIters/queries.length).toFixed(1)}`);

  await mongoose.disconnect();
}

runTests().catch(console.error);
