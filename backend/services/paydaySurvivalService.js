const ForecastEngine = require('./forecastEngine');
const IncomeProfile = require('../models/IncomeProfile');

class PaydaySurvivalService {
  /**
   * Calculates the Payday Survival Risk based on Forecast Engine output and Financial Buffer
   * @param {string} userId
   * @param {string} targetProfileId (optional)
   * @returns {Object} Survival metrics
   */
  static async calculateSurvival(userId, targetProfileId = null) {
    // 1. Fetch active income profiles
    const activeProfiles = await IncomeProfile.find({ user: userId, isActive: true }).populate('account').lean();
    
    if (!activeProfiles || activeProfiles.length === 0) {
      return {
        hasIncomeProfile: false,
        risk: 'Unknown',
        message: 'No active Income Profile found.',
        availableProfiles: []
      };
    }

    // Helper to simulate days until next execution for a profile
    const getNextExecutionDays = (profile) => {
       const today = new Date();
       today.setHours(0,0,0,0);
       for(let i=0; i<=90; i++) {
          let d = new Date(today);
          d.setDate(d.getDate() + i);
          
          if (profile.frequency === 'weekly' && profile.weekDay === d.getDay()) {
              if (i === 0 && profile.lastExecutionDate) {
                 const lastExec = new Date(profile.lastExecutionDate);
                 if (lastExec.toDateString() === d.toDateString()) continue;
              }
              return i;
          }
          if (profile.frequency === 'monthly') {
             const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
             const targetDay = Math.min(profile.monthDay, lastDay);
             if (d.getDate() === targetDay) {
                if (i === 0 && profile.lastExecutionDate) {
                   const lastExec = new Date(profile.lastExecutionDate);
                   if (lastExec.toDateString() === d.toDateString()) continue;
                }
                return i;
             }
          }
       }
       return 90;
    };

    const profilesWithDates = activeProfiles.map(p => ({
        ...p,
        daysRemaining: getNextExecutionDays(p)
    }));

    // 2. Select Target Profile
    let selectedProfile = null;
    if (targetProfileId) {
        selectedProfile = profilesWithDates.find(p => p._id.toString() === targetProfileId);
    }
    if (!selectedProfile) {
        selectedProfile = profilesWithDates.sort((a, b) => a.daysRemaining - b.daysRemaining)[0];
    }

    const availableProfiles = profilesWithDates.map(p => {
       const d = new Date();
       d.setDate(d.getDate() + p.daysRemaining);
       return {
         id: p._id.toString(),
         name: p.name,
         amount: p.amount,
         frequency: p.frequency,
         accountName: p.account?.name || 'Unknown',
         daysRemaining: p.daysRemaining,
         nextDate: d.toISOString()
       };
    });

    const accountId = selectedProfile.account?._id?.toString();
    if (!accountId) {
      return {
        hasIncomeProfile: false,
        risk: 'Unknown',
        message: 'Income profile has no linked account.',
        availableProfiles
      };
    }

    // 3. Run forecast STRICTLY on the selected profile's account
    const forecast = await ForecastEngine.runForecast(userId, accountId, 90);
    const { dailyForecast, expectedDailySpending, currentBalance } = forecast;

    // 4. Find the NEXT income event for this specific profile
    let nextIncomeDay = null;
    let incomeAmount = selectedProfile.amount;
    let incomeName = selectedProfile.name;
    let daysRemaining = -1;

    for (let i = 1; i < dailyForecast.length; i++) {
      const day = dailyForecast[i];
      const incomeEvent = day.events.find(e => e.type === 'income_profile' && e.title === incomeName);
      if (incomeEvent) {
        nextIncomeDay = day;
        daysRemaining = i;
        break;
      }
    }

    if (!nextIncomeDay && dailyForecast[0].events.some(e => e.type === 'income_profile' && e.title === incomeName)) {
      nextIncomeDay = dailyForecast[0];
      daysRemaining = 0;
    }

    if (!nextIncomeDay) {
      // Fallback if not found in forecast, use mathematical simulation
      daysRemaining = selectedProfile.daysRemaining;
      nextIncomeDay = dailyForecast[daysRemaining] || dailyForecast[dailyForecast.length - 1];
    }

    if (daysRemaining === 0) {
      return {
        hasIncomeProfile: true,
        risk: 'Safe',
        currentBalance: dailyForecast[0].balance,
        nextIncomeDate: nextIncomeDay.date,
        incomeAmount,
        incomeName,
        daysUntilIncome: 0,
        estimatedBalanceBeforeIncome: dailyForecast[0].balance,
        financialBuffer: Infinity,
        runOutDate: null,
        remainingSurvivalDays: null,
        predictedDeficit: 0,
        explanations: ["Today is payday! Your money has successfully survived."],
        actionableInsights: ["No action required."],
        timeline: [
          { label: 'Today', type: 'start' },
          { label: incomeName, amount: incomeAmount, type: 'end' }
        ],
        availableProfiles,
        selectedProfileId: selectedProfile._id.toString()
      };
    }

    // 5. Analyze strictly between Today and Next Expected Income
    let totalBills = 0;
    let totalRecurring = 0;
    let totalVariable = 0;
    let minBalanceBeforeIncome = Infinity;
    let runOutDate = null;
    let remainingSurvivalDays = daysRemaining;
    let predictedDeficit = 0;

    for (let i = 0; i < daysRemaining; i++) {
      const day = dailyForecast[i];
      const b = day.balance;

      if (b < minBalanceBeforeIncome) {
        minBalanceBeforeIncome = b;
      }

      if (b < 0 && !runOutDate) {
        runOutDate = day.date;
        remainingSurvivalDays = i;
        predictedDeficit = b;
      }

      for (const e of day.events) {
        if (e.amount < 0) {
          if (e.type === 'bill') {
            totalBills += Math.abs(e.amount);
          } else if (e.type === 'expense' || e.type === 'recurring') {
            totalRecurring += Math.abs(e.amount);
          }
        }
      }

      if (i > 0) {
        totalVariable += expectedDailySpending;
      }
    }

    // 6. Calculate Financial Buffer
    // Prevent division by zero if they have literally zero expected daily spending
    const dailySpendToUse = expectedDailySpending > 0 ? expectedDailySpending : 1; 
    let financialBuffer = minBalanceBeforeIncome / dailySpendToUse;
    if (minBalanceBeforeIncome < 0) financialBuffer = 0; // if negative, buffer is 0

    // 7. Deterministic Risk Calculation
    let risk = 'Safe';
    if (runOutDate) {
      risk = 'High Risk';
    } else if (financialBuffer <= 2) {
      risk = 'Medium Risk';
    } else if (financialBuffer <= 5) {
      risk = 'Low Risk';
    }

    // 8. Explanations & Actionable Insights
    const explanations = [];
    const actionableInsights = [];
    
    const totalExpenses = totalBills + totalRecurring + totalVariable;
    const billPct = totalExpenses > 0 ? Math.round((totalBills / totalExpenses) * 100) : 0;
    const recurringPct = totalExpenses > 0 ? Math.round((totalRecurring / totalExpenses) * 100) : 0;
    const varPct = totalExpenses > 0 ? Math.round((totalVariable / totalExpenses) * 100) : 0;

    if (totalExpenses > 0) {
      explanations.push(`Bills represent ${billPct}% of your projected expenses before payday.`);
      explanations.push(`Recurring transactions account for ${recurringPct}%.`);
      explanations.push(`Variable spending represents ${varPct}%.`);
    }

    if (risk === 'High Risk') {
      const daysEarly = daysRemaining - remainingSurvivalDays;
      explanations.push(`Your account balance is expected to become negative ${daysEarly} day${daysEarly !== 1 ? 's' : ''} before your next income.`);
      
      const deficitAbs = Math.abs(predictedDeficit);
      actionableInsights.push(`Reducing variable spending by approximately ${Math.ceil(deficitAbs)} EGP before your next income would allow your balance to survive until payday.`);
    } else if (risk === 'Medium Risk' || risk === 'Low Risk') {
      explanations.push(`Your balance will remain positive, but only enough for approximately ${financialBuffer.toFixed(1)} additional days.`);
      actionableInsights.push(`Slightly reducing daily spending will create a safer buffer for your upcoming payday.`);
    } else {
      explanations.push(`Your balance is expected to last ${financialBuffer.toFixed(1)} extra days after covering all projected expenses.`);
      actionableInsights.push(`No action is required. Your current balance is expected to comfortably reach your next income.`);
    }

    // Timeline Generation
    const timeline = [];
    timeline.push({ label: 'Today', type: 'start' });
    if (totalBills > 0) timeline.push({ label: 'Bills', amount: totalBills, type: 'event' });
    if (totalRecurring > 0) timeline.push({ label: 'Recurring', amount: totalRecurring, type: 'event' });
    if (runOutDate) timeline.push({ label: 'Balance drops below zero', date: runOutDate, type: 'danger' });
    timeline.push({ label: 'Next Income', amount: incomeAmount, type: 'end' });

    return {
      hasIncomeProfile: true,
      risk,
      currentBalance,
      nextIncomeDate: nextIncomeDay.date,
      incomeAmount,
      incomeName,
      daysUntilIncome: daysRemaining,
      estimatedBalanceBeforeIncome: minBalanceBeforeIncome,
      financialBuffer: financialBuffer > 1000 ? '999+' : financialBuffer.toFixed(1), // cap at 999+ for UI
      runOutDate,
      remainingSurvivalDays,
      predictedDeficit,
      explanations,
      actionableInsights,
      timeline,
      availableProfiles,
      selectedProfileId: selectedProfile._id.toString()
    };
  }
}

module.exports = PaydaySurvivalService;
