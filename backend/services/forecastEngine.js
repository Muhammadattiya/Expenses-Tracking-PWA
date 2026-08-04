const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Bill = require('../models/Bill');
const RecurringTransaction = require('../models/RecurringTransaction');
const IncomeProfile = require('../models/IncomeProfile');

class ForecastEngine {
  /**
   * Run the deterministic financial simulation
   * @param {string} userId - User ID
   * @param {string} accountId - Specific Account ID (optional)
   * @param {number} days - Forecast horizon (default 30)
   * @returns {Object} Structured forecast data
   */
  static async runForecast(userId, accountId, days = 30) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    // 1. Fetch Accounts
    let accountFilter = { user: userId };
    if (accountId) {
      accountFilter._id = accountId;
    } else {
      accountFilter.excludeFromTotal = { $ne: true };
    }
    const accounts = await Account.find(accountFilter).lean();
    if (accounts.length === 0) {
      return this.generateEmptyState();
    }
    const accountIds = accounts.map(a => a._id.toString());

    // 2. Fetch all Transactions to calculate current balance
    const transactionsFilter = { user: userId };
    if (accountId) {
      transactionsFilter.$or = [
        { account: accountId },
        { from_account: accountId },
        { to_account: accountId }
      ];
    }
    const transactions = await Transaction.find(transactionsFilter).lean();

    // 3. Calculate Current Balance
    let currentBalance = 0;
    for (const acc of accounts) {
      let accBalance = acc.balance_adjustment || 0;
      const accIdStr = acc._id.toString();
      
      for (const t of transactions) {
        if (t.type === 'income' && t.account?.toString() === accIdStr) accBalance += t.amount;
        else if (t.type === 'expense' && t.account?.toString() === accIdStr) accBalance -= t.amount;
        else if (t.type === 'settlement' && t.account?.toString() === accIdStr) accBalance += t.amount;
        else if (t.type === 'transfer') {
          if (t.from_account?.toString() === accIdStr) accBalance -= t.amount;
          if (t.to_account?.toString() === accIdStr) accBalance += t.amount;
        }
      }
      currentBalance += accBalance;
    }

    // 4. Calculate Expected Daily Spending (Weighted Average)
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let sumLast30 = 0;
    let sumDays31to90 = 0;

    for (const t of transactions) {
      if (t.type === 'expense' && accountIds.includes(t.account?.toString())) {
        const tDate = new Date(t.date);
        if (tDate >= ninetyDaysAgo && tDate <= today) {
          if (tDate >= thirtyDaysAgo) {
            sumLast30 += t.amount;
          } else {
            sumDays31to90 += t.amount;
          }
        }
      }
    }

    const avgDaily90 = (sumLast30 + sumDays31to90) / 90;
    // Base expected daily spending (includes both fixed and variable)
    let expectedDailySpending = avgDaily90;

    // 5. Fetch Future Bills
    const billsFilter = { user: userId, isActive: true };
    if (accountId) {
      billsFilter.account = accountId;
    } else {
      billsFilter.account = { $in: accountIds };
    }
    const bills = await Bill.find(billsFilter).lean();

    // 6. Fetch Recurring Transactions
    const recurringFilter = { user: userId, isActive: true };
    if (accountId) {
      recurringFilter.$or = [
        { account: accountId },
        { from_account: accountId },
        { to_account: accountId }
      ];
    } else {
      recurringFilter.$or = [
        { account: { $in: accountIds } },
        { from_account: { $in: accountIds } },
        { to_account: { $in: accountIds } }
      ];
    }
    const recurring = await RecurringTransaction.find(recurringFilter).lean();

    // 6.5 Fetch Income Profiles
    const incomeFilter = { user: userId, isActive: true };
    if (accountId) {
      incomeFilter.account = accountId;
    }
    const incomeProfiles = await IncomeProfile.find(incomeFilter).lean();

    // Generate upcoming events for bills and recurrings
    const events = [];

    // Process Bills (Due today, overdue, and future)
    for (const b of bills) {
      if (b.status === 'due_today' || b.status === 'overdue' || b.status === 'upcoming') {
        const dDate = new Date(b.dueDate);
        dDate.setHours(0,0,0,0);
        
        if (b.status === 'overdue' || dDate <= today) {
          // Force overdue and due_today bills to happen on day 1 of forecast
          events.push({
            date: today.toISOString().split('T')[0],
            amount: -b.expectedAmount, // Expense
            title: b.name,
            type: 'bill'
          });
        }
        
        // Loop future occurrences
        let currentDate = new Date(dDate);
        if (currentDate <= today) {
           this.incrementDateByRepeat(currentDate, b.repeat);
        }

        while (currentDate <= endDate && b.repeat !== 'never') {
          events.push({
            date: currentDate.toISOString().split('T')[0],
            amount: -b.expectedAmount,
            title: b.name,
            type: 'bill'
          });
          this.incrementDateByRepeat(currentDate, b.repeat);
        }
      }
    }

    // Process Recurring
    for (const r of recurring) {
      let currentDate = new Date(r.nextExecutionDate);
      currentDate.setHours(0,0,0,0);
      
      while (currentDate <= endDate) {
        if (currentDate >= today) {
          let amount = r.amount;
          if (r.type === 'expense') amount = -amount;
          else if (r.type === 'income') amount = amount;
          else if (r.type === 'transfer') {
             if (accountId) {
                if (r.from_account?.toString() === accountId) amount = -amount;
                else if (r.to_account?.toString() === accountId) amount = amount;
                else amount = 0;
             } else {
                amount = 0; // Transfers between tracked accounts net out to 0
             }
          }

          if (amount !== 0) {
            events.push({
              date: currentDate.toISOString().split('T')[0],
              amount: amount,
              title: r.title,
              type: r.type
            });
          }
        }

        this.incrementDateByRecurring(currentDate, r.repeatType, r.interval || 1);
      }
    }

    // Process Income Profiles
    for (const profile of incomeProfiles) {
      let currentDate = new Date(today);
      currentDate.setHours(0,0,0,0);
      
      while (currentDate <= endDate) {
        let isMatch = false;
        
        if (profile.frequency === 'weekly') {
          if (currentDate.getDay() === profile.weekDay) {
            isMatch = true;
          }
        } else if (profile.frequency === 'monthly') {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();
          const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
          const targetDay = Math.min(profile.monthDay, lastDayOfMonth);
          
          if (currentDate.getDate() === targetDay) {
            isMatch = true;
          }
        }
        
        if (isMatch) {
          let skip = false;
          if (currentDate.getTime() === today.getTime()) {
             // Check if user already logged an income today with the same amount
             const hasTransactionToday = transactions.some(t => 
                t.type === 'income' && 
                new Date(t.date).toDateString() === today.toDateString() &&
                t.amount === profile.amount
             );
             if (hasTransactionToday) skip = true;
          }
          
          if (!skip) {
            events.push({
              date: currentDate.toISOString().split('T')[0],
              amount: profile.amount,
              title: profile.name,
              type: 'income_profile'
            });
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // 6.7 Adjust expectedDailySpending to isolate Variable Spending
    // Since expectedDailySpending includes past fixed bills/recurrings,
    // we subtract the daily rate of FUTURE fixed events to avoid double counting them.
    let totalFixedFutureExpenses = 0;
    for (const e of events) {
      if (e.amount < 0 && (e.type === 'bill' || e.type === 'expense')) {
        totalFixedFutureExpenses += Math.abs(e.amount);
      }
    }
    const avgFixedDailyFuture = totalFixedFutureExpenses / (days || 1);
    expectedDailySpending = Math.max(0, expectedDailySpending - avgFixedDailyFuture);

    // 7. Simulation Engine
    const dailyForecast = [];
    let runningBalance = currentBalance;
    let minBalance = currentBalance;
    let maxBalance = currentBalance;
    let minDay = today.toISOString().split('T')[0];
    let maxDay = today.toISOString().split('T')[0];

    const currentLoopDate = new Date(today);

    for (let i = 0; i <= days; i++) {
      const dateStr = currentLoopDate.toISOString().split('T')[0];
      const dayEvents = events.filter(e => e.date === dateStr);

      let dayIncome = 0;
      let dayExpense = 0;

      // Apply Events
      for (const e of dayEvents) {
        if (e.amount > 0) dayIncome += e.amount;
        else dayExpense += Math.abs(e.amount);
        runningBalance += e.amount;
      }

      // Apply expected daily spending
      // Don't apply daily spending on day 0 (today) if we already lived part of it? 
      // We will apply it completely to simplify and stay conservative
      if (i > 0) {
        dayExpense += expectedDailySpending;
        runningBalance -= expectedDailySpending;
      }

      if (runningBalance < minBalance) {
        minBalance = runningBalance;
        minDay = dateStr;
      }
      if (runningBalance > maxBalance) {
        maxBalance = runningBalance;
        maxDay = dateStr;
      }

      dailyForecast.push({
        date: dateStr,
        balance: runningBalance,
        income: dayIncome,
        expense: dayExpense,
        events: dayEvents.map(e => ({ title: e.title, amount: e.amount, type: e.type }))
      });

      currentLoopDate.setDate(currentLoopDate.getDate() + 1);
    }

    const finalBalance = runningBalance;
    const averageBalance = dailyForecast.reduce((sum, d) => sum + d.balance, 0) / dailyForecast.length;

    // 8. Generate Insights
    const insights = this.generateInsights({
      currentBalance,
      finalBalance,
      minBalance,
      events,
      expectedDailySpending,
      days
    });

    return {
      currentBalance,
      forecastPeriod: days,
      finalBalance,
      minBalance,
      maxBalance,
      averageBalance,
      lowestForecastDay: minDay,
      highestForecastDay: maxDay,
      expectedDailySpending,
      dailyForecast,
      insights
    };
  }

  static generateInsights({ currentBalance, finalBalance, minBalance, events, expectedDailySpending, days }) {
    const insights = [];
    
    // Trend Insight
    const difference = finalBalance - currentBalance;
    if (difference > 0) {
      insights.push({ type: 'positive', key: 'insight_increasing', fallback: 'Your balance is expected to increase steadily over this period.' });
    } else if (difference < 0) {
      insights.push({ type: 'negative', key: 'insight_decreasing', fallback: 'Your balance is expected to decrease steadily.' });
    } else {
      insights.push({ type: 'neutral', key: 'insight_stable', fallback: 'Your forecast remains stable throughout the selected period.' });
    }

    // Min Balance Insight
    if (minBalance < 0) {
       insights.push({ type: 'critical', key: 'insight_negative_balance', fallback: 'Warning: Your balance is projected to fall below zero during this period.' });
    }

    // Bills/Recurring vs Daily
    let totalBillsAndRecurring = 0;
    events.forEach(e => {
      if (e.amount < 0) totalBillsAndRecurring += Math.abs(e.amount);
    });

    const totalExpectedDaily = expectedDailySpending * days;

    if (totalBillsAndRecurring > totalExpectedDaily && totalBillsAndRecurring > 0) {
       insights.push({ type: 'warning', key: 'insight_high_fixed', fallback: 'Fixed obligations (Bills & Subscriptions) represent a significant portion of your future expenses.' });
    } else if (totalExpectedDaily > totalBillsAndRecurring && totalExpectedDaily > 0) {
       insights.push({ type: 'warning', key: 'insight_high_variable', fallback: 'Daily variable spending is the biggest factor reducing your balance.' });
    }

    return insights;
  }

  static generateEmptyState() {
    return {
      isEmpty: true,
      currentBalance: 0,
      finalBalance: 0,
      dailyForecast: [],
      insights: [{ type: 'neutral', key: 'insight_empty', fallback: 'Not enough data to generate a forecast. Try adding more transactions and accounts.' }]
    };
  }

  static incrementDateByRepeat(date, repeat) {
    if (repeat === 'monthly') date.setMonth(date.getMonth() + 1);
    else if (repeat === 'weekly') date.setDate(date.getDate() + 7);
    else if (repeat === 'yearly') date.setFullYear(date.getFullYear() + 1);
  }

  static incrementDateByRecurring(date, repeatType, interval) {
    if (repeatType === 'daily') date.setDate(date.getDate() + interval);
    else if (repeatType === 'weekly') date.setDate(date.getDate() + (7 * interval));
    else if (repeatType === 'monthly') date.setMonth(date.getMonth() + interval);
    else if (repeatType === 'yearly') date.setFullYear(date.getFullYear() + interval);
    else date.setFullYear(date.getFullYear() + 100); // Custom or unknown, push far ahead
  }
}

module.exports = ForecastEngine;
