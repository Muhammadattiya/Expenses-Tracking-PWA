const cron = require('node-cron');
const RecurringTransaction = require('../models/RecurringTransaction');
const Transaction = require('../models/Transaction');
const Bill = require('../models/Bill');
const Subscription = require('../models/Subscription');
const SmartBudgetPlan = require('../models/SmartBudgetPlan');
const IncomeProfile = require('../models/IncomeProfile');
const { createTransaction } = require('./transactionService');
const notificationService = require('./notificationService');

const sendPushNotification = async (sub, payload, stats) => {
  const result = await notificationService.sendToSubscription(sub, payload);
  if (stats) {
    stats.pushSuccess += Number(result.delivered);
    stats.pushFailed += Number(!result.delivered);
  }
  return result;
};

const initCronJobs = () => {
  console.log('[CRON] Initialized');

  cron.schedule('* * * * *', async () => {
    const cronStartTime = Date.now();
    console.log(`[CRON] Started`);

    const stats = {
      billsProcessed: 0,
      recurringExecuted: 0,
      pushSuccess: 0,
      pushFailed: 0,
      budgetsChecked: 0,
      incomeProfilesExecuted: 0
    };

    await processRecurringTransactions(stats);
    await processBills(stats);
    await processIncomeProfiles(stats);
    await processBudgetThresholds(stats);

    const executionTime = Date.now() - cronStartTime;
    console.log(`[CRON] Bills Processed: ${stats.billsProcessed}`);
    console.log(`[CRON] Recurring Transactions Executed: ${stats.recurringExecuted}`);
    console.log(`[CRON] Income Profiles Executed: ${stats.incomeProfilesExecuted}`);
    console.log(`[CRON] Budgets Checked: ${stats.budgetsChecked}`);
    console.log(`[CRON] Notifications Sent: ${stats.pushSuccess}`);
    console.log(`[CRON] Finished`);
    console.log(`Execution Time: ${executionTime} ms`);
  });

  cron.schedule('0 20 * * *', async () => {
    console.log('[CRON] Daily job started (sendDailyReminder)');
    await sendDailyReminder();
    await processSmartBudgetReminders();
    await processPaydaySurvivalNotifications();
    console.log('[CRON] Daily job finished');
  }, {
    timezone: "Africa/Cairo"
  });

};

const processBudgetThresholds = async (stats) => {
  try {
    const { checkBudgetThresholds } = require('./budgetEngine');
    const uniqueUsers = await Subscription.distinct('user');
    for (let userId of uniqueUsers) {
      await checkBudgetThresholds(userId, stats);
    }
  } catch (error) {
    console.error('[ERROR] Operation Name: processBudgetThresholds');
    console.error(`[ERROR] message:`, error.message);
    console.error(`[ERROR] stack trace:`, error.stack);
  }
};

const checkPaydaySurvivalRisk = async (userId) => {
  try {
    const User = require('../models/User');
    const PaydaySurvivalService = require('./paydaySurvivalService');
    const user = await User.findById(userId);
    if (!user) return;

    const survival = await PaydaySurvivalService.calculateSurvival(userId, null);
    if (!survival.hasIncomeProfile || survival.risk === 'Unknown') return;

    const currentRisk = survival.risk;
    const lastRisk = user.lastSurvivalRisk || 'Safe';

    if (currentRisk !== lastRisk) {
      user.lastSurvivalRisk = currentRisk;
      await user.save();

      if (currentRisk === 'High Risk' || currentRisk === 'Medium Risk') {
        const subscriptions = await Subscription.find({ user: userId });
        const payload = JSON.stringify({
          title: `⚠️ Payday Survival Alert: ${currentRisk}`,
          body: `Your balance might drop below zero before your next income on ${new Date(survival.nextIncomeDate).toLocaleDateString()}. Tap to review insights.`,
          url: '/analytics?tab=insights&focus=payday'
        });

        for (let sub of subscriptions) {
          await sendPushNotification(sub, payload, null);
        }
      }
    }
  } catch (error) {
    console.error('[ERROR] Operation Name: checkPaydaySurvivalRisk');
    console.error(`[ERROR] message:`, error.message);
    console.error(`[ERROR] stack trace:`, error.stack);
  }
};

const processPaydaySurvivalNotifications = async () => {
  try {
    const uniqueUsers = await Subscription.distinct('user');
    for (let userId of uniqueUsers) {
      await checkPaydaySurvivalRisk(userId);
    }
  } catch (error) {
    console.error('[ERROR] Operation Name: processPaydaySurvivalNotifications');
    console.error(`[ERROR] message:`, error.message);
    console.error(`[ERROR] stack trace:`, error.stack);
  }
};

const sendDailyReminder = async () => {
  try {
    const subscriptions = await Subscription.find({});
    if (subscriptions.length > 0) {
      const payload = JSON.stringify({
        title: `Time to log your transactions! 📝`,
        body: `Don't forget to track your expenses and income for today in Finova. Keep your finances in check! 💸✨`,
        url: '/'
      });

      for (let sub of subscriptions) {
        await sendPushNotification(sub, payload, null);
      }
    }
  } catch (error) {
    console.error('[ERROR] Operation Name: sendDailyReminder');
    console.error(`[ERROR] message:`, error.message);
    console.error(`[ERROR] stack trace:`, error.stack);
  }
};

const processRecurringTransactions = async (stats) => {
  try {
    const now = new Date();

    const recurrings = await RecurringTransaction.find({
      isActive: true,
      nextExecutionDate: { $lte: now }
    });

    const recurringReminders = await RecurringTransaction.find({
      isActive: true,
      reminderEnabled: true
    });

    for (let r of recurringReminders) {
      const reminderDate = new Date(r.nextExecutionDate);
      reminderDate.setDate(reminderDate.getDate() - (r.reminderDaysBefore || 1));
      reminderDate.setHours(0, 0, 0, 0);

      const lastNotifiedDay = r.lastNotified ? new Date(r.lastNotified) : null;
      if (lastNotifiedDay) lastNotifiedDay.setHours(0, 0, 0, 0);

      const currentDay = new Date(now);
      currentDay.setHours(0, 0, 0, 0);

      let shouldNotify = false;

      if (reminderDate.getTime() <= now.getTime()) {
        if (!lastNotifiedDay || lastNotifiedDay.getTime() < currentDay.getTime()) {
          shouldNotify = true;
        }
      }

      if (shouldNotify) {
        const subscriptions = await Subscription.find({ user: r.user });

        if (subscriptions.length > 0) {
          const payload = JSON.stringify({
            title: `تذكير بمعاملة متكررة: ${r.title}`,
            body: `سيتم تنفيذ معاملة "${r.title}" بقيمة ${r.amount} قريباً.`,
            url: '/settings'
          });

          for (let sub of subscriptions) {
            await sendPushNotification(sub, payload, stats);
          }
        }
        r.lastNotified = new Date();
        await r.save();
      }
    }

    for (let r of recurrings) {
      try {
        await createTransaction(r.user, {
          title: r.title,
          amount: r.amount,
          type: r.type,
          account: r.account,
          category: r.category,
          from_account: r.from_account,
          to_account: r.to_account,
          notes: r.notes,
          date: r.nextExecutionDate,
          status: 'completed',
          source: 'manual'
        });

        r.currentOccurrences += 1;
        stats.recurringExecuted++;

        if (!r.neverEnds) {
          if ((r.maxOccurrences && r.currentOccurrences >= r.maxOccurrences) ||
            (r.endDate && r.nextExecutionDate >= r.endDate)) {
            r.isActive = false;
          }
        }

        if (r.isActive) {
          const nextDate = new Date(r.nextExecutionDate);
          if (r.repeatType === 'daily') {
            nextDate.setDate(nextDate.getDate() + 1);
          } else if (r.repeatType === 'weekly') {
            nextDate.setDate(nextDate.getDate() + 7);
          } else if (r.repeatType === 'monthly') {
            nextDate.setMonth(nextDate.getMonth() + 1);
          } else if (r.repeatType === 'yearly') {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
          } else if (r.repeatType === 'custom') {
            nextDate.setDate(nextDate.getDate() + (r.interval || 1));
          }
          r.nextExecutionDate = nextDate;
        }

        await r.save();
      } catch (err) {
        console.error('[ERROR] Operation Name: Execute Recurring Transaction');
        console.error(`[ERROR] Recurring ID: ${r._id}`);
        console.error(`[ERROR] User ID: ${r.user}`);
        console.error(`[ERROR] message:`, err.message);
        console.error(`[ERROR] stack trace:`, err.stack);
      }
    }
  } catch (error) {
    console.error('[ERROR] Operation Name: processRecurringTransactions');
    console.error(`[ERROR] message:`, error.message);
    console.error(`[ERROR] stack trace:`, error.stack);
  }
};

const processBills = async (stats) => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const activeBills = await Bill.find({ 
      isActive: true, 
      $or: [
        { status: { $ne: 'paid' } },
        { status: 'paid', repeat: { $ne: 'never' } }
      ]
    });

    for (let bill of activeBills) {
      stats.billsProcessed++;
      try {
        const due = new Date(bill.dueDate);
        due.setHours(0, 0, 0, 0);

        if (bill.status === 'paid' && bill.repeat !== 'never') {
          if (now.getTime() > due.getTime()) {
             let nextDate = new Date(bill.dueDate);
             while (nextDate.getTime() <= now.getTime()) {
                 if (bill.repeat === 'weekly') {
                   nextDate.setDate(nextDate.getDate() + 7);
                 } else if (bill.repeat === 'monthly') {
                   nextDate.setMonth(nextDate.getMonth() + 1);
                 } else if (bill.repeat === 'yearly') {
                   nextDate.setFullYear(nextDate.getFullYear() + 1);
                 } else {
                   break;
                 }
             }
             bill.dueDate = nextDate;
             bill.status = 'upcoming';
             bill.transactionId = undefined; 
             await bill.save();
          }
          continue;
        }

        let newStatus = 'upcoming';
        if (due.getTime() === now.getTime()) {
          newStatus = 'due_today';
        } else if (due.getTime() < now.getTime()) {
          newStatus = 'overdue';
        }

        if (bill.status !== newStatus) {
          bill.status = newStatus;
          await bill.save();
        }

        if (bill.reminderEnabled && bill.notificationEnabled) {
          const reminderDate = new Date(bill.dueDate);
          reminderDate.setDate(reminderDate.getDate() - bill.reminderDaysBefore);
          reminderDate.setHours(0, 0, 0, 0);

          const lastNotifiedDay = bill.lastNotified ? new Date(bill.lastNotified) : null;
          if (lastNotifiedDay) lastNotifiedDay.setHours(0, 0, 0, 0);

          const currentDay = new Date(now);
          currentDay.setHours(0, 0, 0, 0);

          let shouldNotify = false;

          if (reminderDate.getTime() <= now.getTime()) {
            if (!lastNotifiedDay || lastNotifiedDay.getTime() < currentDay.getTime()) {
              shouldNotify = true;
            }
          }

          if (shouldNotify) {
            const subscriptions = await Subscription.find({ user: bill.user });

            if (subscriptions.length > 0) {
              const payload = JSON.stringify({
                title: `تذكير بالفاتورة: ${bill.name}`,
                body: `فاتورة "${bill.name}" بقيمة ${bill.expectedAmount} حان موعدها قريباً.`,
                url: '/bills'
              });

              for (let sub of subscriptions) {
                await sendPushNotification(sub, payload, stats);
              }
            }

            bill.lastNotified = new Date();
            await bill.save();
          }
        }
      } catch (err) {
        console.error('[ERROR] Operation Name: Evaluate Bill');
        console.error(`[ERROR] Bill ID: ${bill._id}`);
        console.error(`[ERROR] User ID: ${bill.user}`);
        console.error(`[ERROR] message:`, err.message);
        console.error(`[ERROR] stack trace:`, err.stack);
      }
    }
  } catch (error) {
    console.error('[ERROR] Operation Name: processBills');
    console.error(`[ERROR] message:`, error.message);
    console.error(`[ERROR] stack trace:`, error.stack);
  }
};

const processSmartBudgetReminders = async () => {
  try {
    const now = new Date();
    const User = require('../models/User');
    const { getBudgetPeriodDates } = require('./budgetEngine');
    const users = await User.find({});

    for (const user of users) {
      const prefs = user.preferences || {};
      const subs = await Subscription.find({ user: user._id });
      if (!subs.length) continue;

      // 1. Planning Reminder
      // Check if user has a confirmed plan for current month
      const dummyMonthly = { period: 'monthly' };
      const { startDate: mStart, endDate: mEnd } = getBudgetPeriodDates(dummyMonthly, prefs, now);
      
      const currentPlan = await SmartBudgetPlan.findOne({
        user: user._id,
        status: 'confirmed',
        period: 'monthly',
        startDate: { $lte: now },
        endDate: { $gte: now }
      });

      // If no plan, and we are in the first 3 days of the period
      const msInDay = 24 * 60 * 60 * 1000;
      if (!currentPlan && (now - mStart) < (3 * msInDay) && (now - mStart) >= 0) {
        const payload = JSON.stringify({
          title: 'Planning Reminder',
          body: 'Your new budget period has started. Create your Smart Budget Plan.',
          url: '/budgets/smart-planner'
        });
        for (let sub of subs) await sendPushNotification(sub, payload, null);
      }

      // 2. Allocation Reminder (Draft > 24h)
      const draftPlans = await SmartBudgetPlan.find({
        user: user._id,
        status: 'draft',
        updatedAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      });
      if (draftPlans.length > 0) {
        const payload = JSON.stringify({
          title: 'Allocation Reminder',
          body: 'You have a draft Smart Budget Plan. Don\'t forget to confirm it.',
          url: '/budgets/smart-planner'
        });
        for (let sub of subs) await sendPushNotification(sub, payload, null);
      }

      // 4. Plan Expiring (Confirmed, ends in ~3 days)
      if (currentPlan) {
        const daysLeft = (currentPlan.endDate - now) / msInDay;
        if (daysLeft > 2 && daysLeft <= 3) {
          const payload = JSON.stringify({
            title: 'Plan Expiring',
            body: 'Your current Smart Budget period is ending soon.',
            url: '/budgets/smart-planner'
          });
          for (let sub of subs) await sendPushNotification(sub, payload, null);
        }
      }
      
      // 5. Custom Plan Reminders
      const customPlans = await SmartBudgetPlan.find({
        user: user._id,
        status: 'confirmed',
        period: 'custom',
        endDate: { $gte: now }
      });

      for (const cp of customPlans) {
        const daysSinceStart = (now - cp.startDate) / msInDay;
        if (daysSinceStart >= 0 && daysSinceStart < 1) {
          const payload = JSON.stringify({
            title: 'Custom Budget Started',
            body: `Your custom budget "${cp.name || 'Untitled'}" has officially started today!`,
            url: '/budgets'
          });
          for (let sub of subs) await sendPushNotification(sub, payload, null);
        }

        const daysLeft = (cp.endDate - now) / msInDay;
        if (daysLeft > 2 && daysLeft <= 3) {
          const payload = JSON.stringify({
            title: 'Custom Budget Expiring',
            body: `Your custom budget "${cp.name || 'Untitled'}" is ending in a few days.`,
            url: '/budgets'
          });
          for (let sub of subs) await sendPushNotification(sub, payload, null);
        }
      }
    }
  } catch (error) {
    console.error('[ERROR] Operation Name: processSmartBudgetReminders');
    console.error(`[ERROR] message:`, error.message);
  }
};

const processIncomeProfiles = async (stats) => {
  try {
    const now = new Date();
    // Use Africa/Cairo time to determine current day accurately
    const egyptNowStr = now.toLocaleString("en-US", { timeZone: "Africa/Cairo" });
    const egyptNow = new Date(egyptNowStr);
    
    const currentDayOfWeek = egyptNow.getDay();
    const currentDayOfMonth = egyptNow.getDate();
    const todayEgyptStr = egyptNow.toDateString();

    const profiles = await IncomeProfile.find({ isActive: true });
    
    for (const profile of profiles) {
      let shouldExecute = false;
      if (profile.frequency === 'weekly' && profile.weekDay === currentDayOfWeek) {
         shouldExecute = true;
      } else if (profile.frequency === 'monthly') {
         const lastDayOfMonth = new Date(egyptNow.getFullYear(), egyptNow.getMonth() + 1, 0).getDate();
         const targetDay = Math.min(profile.monthDay, lastDayOfMonth);
         if (currentDayOfMonth === targetDay) {
            shouldExecute = true;
         }
      }
      
      if (shouldExecute) {
         let lastExecEgyptStr = null;
         if (profile.lastExecutionDate) {
             const lastExecLocal = new Date(profile.lastExecutionDate).toLocaleString("en-US", { timeZone: "Africa/Cairo" });
             lastExecEgyptStr = new Date(lastExecLocal).toDateString();
         }
         
         if (!lastExecEgyptStr || lastExecEgyptStr !== todayEgyptStr) {
             // Generate automated transaction
             await createTransaction(profile.user, {
                title: profile.name,
                amount: profile.amount,
                type: 'income',
                account: profile.account,
                category: profile.category || undefined,
                date: now,
                status: 'completed',
                source: 'system'
             });
             profile.lastExecutionDate = now;
             await profile.save();
             stats.incomeProfilesExecuted++;

             // Send Push Notification
             const subscriptions = await Subscription.find({ user: profile.user });
             const payload = JSON.stringify({
               title: '🎉 Payday Arrived!',
               body: `Your automated income of ${profile.amount} EGP from ${profile.name} has been deposited.`,
               url: '/'
             });
             for (let sub of subscriptions) {
               await sendPushNotification(sub, payload, stats);
             }
         }
      }
    }
  } catch (error) {
    console.error('[ERROR] Operation Name: processIncomeProfiles');
    console.error(`[ERROR] message:`, error.message);
    console.error(`[ERROR] stack trace:`, error.stack);
  }
};

module.exports = { initCronJobs, processRecurringTransactions, processBills, sendPushNotification, processSmartBudgetReminders, processIncomeProfiles, checkPaydaySurvivalRisk };
