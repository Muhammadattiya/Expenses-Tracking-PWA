const cron = require('node-cron');
const RecurringTransaction = require('../models/RecurringTransaction');
const Transaction = require('../models/Transaction');
const Bill = require('../models/Bill');
const Subscription = require('../models/Subscription');
const SmartBudgetPlan = require('../models/SmartBudgetPlan');
const webpush = require('web-push');

// Helper for sending push notifications
const sendPushNotification = async (sub, payload, stats) => {
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
    console.log(`[PUSH] Notification sent successfully.`);
    if (stats) stats.pushSuccess++;
  } catch (err) {
    if (stats) stats.pushFailed++;
    console.error(`[ERROR] [PUSH] Push failed`);
    console.error(`[ERROR] statusCode: ${err.statusCode}`);
    console.error(`[ERROR] headers:`, err.headers);
    console.error(`[ERROR] body:`, err.body);
    console.error(`[ERROR] message:`, err.message);
    console.error(`[ERROR] stack trace:`, err.stack);

    if (err.statusCode === 410 || err.statusCode === 404) {
      console.warn(`[WARNING] Subscription ${sub._id} expired or invalid. Deleting.`);
      await Subscription.findByIdAndDelete(sub._id);
    }
  }
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
      budgetsChecked: 0
    };

    await processRecurringTransactions(stats);
    await processBills(stats);
    await processBudgetThresholds(stats);

    const executionTime = Date.now() - cronStartTime;
    console.log(`[CRON] Bills Processed: ${stats.billsProcessed}`);
    console.log(`[CRON] Recurring Transactions Executed: ${stats.recurringExecuted}`);
    console.log(`[CRON] Budgets Checked: ${stats.budgetsChecked}`);
    console.log(`[CRON] Notifications Sent: ${stats.pushSuccess}`);
    console.log(`[CRON] Finished`);
    console.log(`Execution Time: ${executionTime} ms`);
  });

  cron.schedule('0 20 * * *', async () => {
    console.log('[CRON] Daily job started (sendDailyReminder)');
    await sendDailyReminder();
    await processSmartBudgetReminders();
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

      let shouldNotify = false;

      if (reminderDate.getTime() <= now.getTime()) {
        if (!lastNotifiedDay || lastNotifiedDay.getTime() < now.getTime()) {
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
        await Transaction.create({
          user: r.user,
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

    const activeBills = await Bill.find({ isActive: true, status: { $ne: 'paid' } });

    for (let bill of activeBills) {
      stats.billsProcessed++;
      try {
        const due = new Date(bill.dueDate);
        due.setHours(0, 0, 0, 0);

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

          let shouldNotify = false;

          if (reminderDate.getTime() <= now.getTime()) {
            if (!lastNotifiedDay || lastNotifiedDay.getTime() < now.getTime()) {
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

module.exports = { initCronJobs, processRecurringTransactions, processBills, sendPushNotification, processSmartBudgetReminders };
