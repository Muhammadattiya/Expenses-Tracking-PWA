const analyticsService = require('./analyticsService');
const advancedAnalyticsService = require('./advancedAnalyticsService');
const PaydaySurvivalService = require('./paydaySurvivalService');
const ForecastEngine = require('./forecastEngine');
const SimulationEngine = require('./simulation/simulationEngine');
const accountService = require('./accountService');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const Account = require('../models/Account');

async function resolveEntityName(Model, userId, name, entityType) {
  if (!name) return null;
  // Case-insensitive exact match
  const matches = await Model.find({ 
    user: userId, 
    name: new RegExp('^' + name + '$', 'i') 
  }).select('_id name').lean();

  if (matches.length === 0) {
    return { found: false, entity: entityType, requestedName: name };
  }
  if (matches.length > 1) {
    return { found: false, ambiguous: true, entity: entityType, matches: matches.map(m => m.name) };
  }
  return { found: true, id: matches[0]._id.toString() };
}


// Define tools for the Groq LLM
const agentToolsDefinition = [
  {
    type: 'function',
    function: {
      name: 'get_financial_summary',
      description: 'Get aggregated summary (income, expenses, balance) and top categories/accounts.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Start date in YYYY-MM-DD format (optional)' },
          to: { type: 'string', description: 'End date in YYYY-MM-DD format (optional)' },
          categoryName: { type: 'string', description: 'Optional category name to filter by' },
          accountName: { type: 'string', description: 'Optional account name to filter by' }
        },
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_accounts',
      description: 'Get all user accounts and balances.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_budgets',
      description: 'Get user budgets and their status.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_payday_survival',
      description: 'Check if current balance will survive until next payday.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'forecast_balance',
      description: 'Project balance and future transactions.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Number of days to forecast into the future (default 30)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'simulate_purchase',
      description: 'Simulate impact of hypothetical purchase.',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'The cost of the hypothetical purchase' },
          categoryName: { type: 'string', description: 'Optional category name for the purchase (e.g., Food)' },
          accountName: { type: 'string', description: 'Optional account name to purchase from' }
        },
        required: ['amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'compare_periods',
      description: 'Compare overall financial metrics between two periods, optionally filtered by a specific category or account.',
      parameters: {
        type: 'object',
        properties: {
          currentFrom: { type: 'string', description: 'Start date of current period (YYYY-MM-DD)' },
          currentTo: { type: 'string', description: 'End date of current period (YYYY-MM-DD)' },
          previousFrom: { type: 'string', description: 'Start date of previous period (YYYY-MM-DD)' },
          previousTo: { type: 'string', description: 'End date of previous period (YYYY-MM-DD)' },
          categoryName: { type: 'string', description: 'Optional category name' },
          accountName: { type: 'string', description: 'Optional account name' }
        },
        required: ['currentFrom', 'currentTo', 'previousFrom', 'previousTo']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'spending_by_category',
      description: 'Rank spending by category to see where most of the money went.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          accountName: { type: 'string', description: 'Optional account name' },
          limit: { type: 'number', description: 'Max items (default 5)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'spending_trend',
      description: 'Analyze whether overall spending is increasing, decreasing, or stable over time.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          groupBy: { type: 'string', description: 'Group by week or month' },
          categoryName: { type: 'string', description: 'Optional category name' },
          accountName: { type: 'string', description: 'Optional account name' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'category_comparison',
      description: 'Identify which spending categories increased or decreased between periods.',
      parameters: {
        type: 'object',
        properties: {
          currentFrom: { type: 'string', description: 'Start date of current period (YYYY-MM-DD)' },
          currentTo: { type: 'string', description: 'End date of current period (YYYY-MM-DD)' },
          previousFrom: { type: 'string', description: 'Start date of previous period (YYYY-MM-DD)' },
          previousTo: { type: 'string', description: 'End date of previous period (YYYY-MM-DD)' },
          limit: { type: 'number', description: 'Max items (default 5)' }
        },
        required: ['currentFrom', 'currentTo', 'previousFrom', 'previousTo']
      }
    }
  }
];

// Handlers for tool execution
const agentToolHandlers = {
  get_financial_summary: async (userId, args) => {
    const query = { ...args };
    
    if (args.categoryName) {
      const resolved = await resolveEntityName(Category, userId, args.categoryName, 'category');
      if (!resolved.found) return resolved;
      query.category = resolved.id;
      delete query.categoryName;
    }
    
    if (args.accountName) {
      const resolved = await resolveEntityName(Account, userId, args.accountName, 'account');
      if (!resolved.found) return resolved;
      query.account = resolved.id;
      delete query.accountName;
    }

    const result = await analyticsService.getAnalytics(userId, query);
    return {
      summary: result.summary,
      categories: result.categories.slice(0, 3).map(c => ({ name: c.name, amount: c.amount })), // top 3 only
      accounts: result.accounts.slice(0, 3).map(a => ({ name: a.name, amount: a.amount })) // top 3 only
    };
  },

  get_accounts: async (userId, args) => {
    const accounts = await accountService.getAccounts(userId);
    // Minimize data payload
    return accounts.map(a => ({
      name: a.name,
      balance: a.balance_adjustment,
      excludeFromTotal: a.excludeFromTotal
    }));
  },

  get_budgets: async (userId, args) => {
    const budgets = await Budget.find({ user: userId, isActive: true }).populate('category', 'name').lean();
    return budgets.map(b => ({
      categoryName: b.category ? b.category.name : 'Unknown',
      amount: b.amount,
      period: b.period
    }));
  },
  
  check_payday_survival: async (userId, args) => {
    return await PaydaySurvivalService.calculateSurvival(userId);
  },
  
  forecast_balance: async (userId, args) => {
    const days = args.days || 30;
    const result = await ForecastEngine.runForecast(userId, null, days);
    return {
      currentBalance: result.currentBalance,
      forecastPeriod: result.forecastPeriod,
      finalBalance: result.finalBalance,
      minBalance: result.minBalance,
      maxBalance: result.maxBalance,
      expectedDailySpending: result.expectedDailySpending,
      insights: result.insights
    };
  },
  
  simulate_purchase: async (userId, args) => {
    let categoryId, accountId;
    
    if (args.categoryName) {
      const resolved = await resolveEntityName(Category, userId, args.categoryName, 'category');
      if (!resolved.found) return resolved;
      categoryId = resolved.id;
    }
    
    if (args.accountName) {
      const resolved = await resolveEntityName(Account, userId, args.accountName, 'account');
      if (!resolved.found) return resolved;
      accountId = resolved.id;
    }

    const action = {
      type: 'purchase',
      payload: {
        amount: args.amount,
        categoryId: categoryId,
        accountId: accountId
      }
    };
    const result = await SimulationEngine.runSimulation(userId, [action]);
    return {
      difference: result.difference,
      decision: result.decision,
      insights: result.insights
    };
  },

  compare_periods: async (userId, args) => {
    let categoryId, accountId;
    if (args.categoryName) {
      const resolved = await resolveEntityName(Category, userId, args.categoryName, 'category');
      if (!resolved.found) return resolved;
      categoryId = resolved.id;
    }
    if (args.accountName) {
      const resolved = await resolveEntityName(Account, userId, args.accountName, 'account');
      if (!resolved.found) return resolved;
      accountId = resolved.id;
    }
    return await advancedAnalyticsService.comparePeriods(userId, { ...args, categoryId, accountId });
  },

  spending_by_category: async (userId, args) => {
    let accountId;
    if (args.accountName) {
      const resolved = await resolveEntityName(Account, userId, args.accountName, 'account');
      if (!resolved.found) return resolved;
      accountId = resolved.id;
    }
    return await advancedAnalyticsService.spendingByCategory(userId, { ...args, accountId });
  },

  spending_trend: async (userId, args) => {
    let categoryId, accountId;
    if (args.categoryName) {
      const resolved = await resolveEntityName(Category, userId, args.categoryName, 'category');
      if (!resolved.found) return resolved;
      categoryId = resolved.id;
    }
    if (args.accountName) {
      const resolved = await resolveEntityName(Account, userId, args.accountName, 'account');
      if (!resolved.found) return resolved;
      accountId = resolved.id;
    }
    return await advancedAnalyticsService.spendingTrend(userId, { ...args, categoryId, accountId });
  },

  category_comparison: async (userId, args) => {
    return await advancedAnalyticsService.categoryComparison(userId, args);
  }
};

const selectRelevantTools = (message, allTools) => {
  const msg = message.toLowerCase();
  const relevantNames = new Set();
  
  // 1. Trend
  if (/(increas|decreas|trend|spending more lately|spending less lately|over time|going up|going down|getting higher|getting lower|changed recently|زادت مصاريفي مؤخراً|مصاريفي بتزيد|هل مصاريفي بتزيد|هل صرفي بيزيد|صرفي بيزيد|مصاريفي بتقل|اتجاه مصاريفي)/.test(msg)) {
    relevantNames.add('spending_trend');
  }

  // 2. Category comparison
  if (/(which category.*increas|which category.*decreas|which categories changed|what categories are costing me more|category changed|biggest category increase|changed in my spending|أنهي فئة زادت|أي فئة زادت|الفئات اللي زادت|الفئات اللي قلت|الفئات اللي اتغيرت|أكتر فئة زادت)/.test(msg)) {
    relevantNames.add('category_comparison');
  }

  // 3. Period comparison
  if (/(more.*than|less.*than|compared to|compared with|versus|vs|cheaper than|higher than|lower than|how much more|how much less|compare|مقارنة|أكثر من|اقل من|أكتر من|أقل من|مقارنة بالشهر الماضي|مقارنة بالشهر اللي فات|مقارنة مع|الفرق بين)/.test(msg)) {
    relevantNames.add('compare_periods');
  }

  // 4. Spending distribution (category)
  if (/(where am i spending|what categories cost|biggest spending categories|most money on|top spending|where did my money go|most of my money|what categories|فين صرفت أكتر|أكتر حاجة بصرف عليها|أكتر فئة|أكتر الفئات|فئات الإنفاق|صرفت فين)/.test(msg)) {
    relevantNames.add('spending_by_category');
  }

  // 5. Simulate purchase
  if (/(afford|should i buy|buy a|purchase|what happens if i spend|أقدر أشتري|اقدر اشتري|لو اشتريت|هل أقدر أشتري)/.test(msg)) {
    relevantNames.add('simulate_purchase');
  }

  // 6. Forecast
  if (/(forecast|predict|future balance|next \d+ days|what will my balance be|توقع الرصيد|الرصيد هيبقى كام|الرصيد في المستقبل|بعد كام يوم الرصيد|توقع)/.test(msg)) {
    relevantNames.add('forecast_balance');
  }

  // 7. Financial summary (Generic Fallback)
  if (/(how much did i spend|how much did i earn|income|expenses|balance|spent from|total|رصيدي كام|مصاريفي كام|دخلي كام|إجمالي مصاريفي|ملخص مالي)/.test(msg)) {
    relevantNames.add('get_financial_summary');
  }

  // Accounts
  if (/(accounts|list accounts|what accounts do i have|حسابات|حساباتي)/.test(msg)) {
    relevantNames.add('get_accounts');
  }
  
  // Budgets
  if (/(budget|exceeded budget|budget status|ميزانية)/.test(msg)) {
    relevantNames.add('get_budgets');
  }

  // Fallback: If we didn't confidently match anything, return all tools
  if (relevantNames.size === 0) {
    return allTools;
  }
  
  return allTools.filter(tool => relevantNames.has(tool.function.name));
};

module.exports = {
  agentToolsDefinition,
  agentToolHandlers,
  selectRelevantTools
};
