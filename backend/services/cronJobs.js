const cron = require('node-cron');
const RecurringTransaction = require('../models/RecurringTransaction');
const Transaction = require('../models/Transaction');
const Bill = require('../models/Bill');
const Subscription = require('../models/Subscription');
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
    };

    await processRecurringTransactions(stats);
    await processBills(stats);

    const executionTime = Date.now() - cronStartTime;
    console.log(`[CRON] Bills Processed: ${stats.billsProcessed}`);
    console.log(`[CRON] Recurring Transactions Executed: ${stats.recurringExecuted}`);
    console.log(`[CRON] Notifications Sent: ${stats.pushSuccess}`);
    console.log(`[CRON] Finished`);
    console.log(`Execution Time: ${executionTime} ms`);
  });

  cron.schedule('0 20 * * *', async () => {
    console.log('[CRON] Daily job started (sendDailyReminder)');
    await sendDailyReminder();
    console.log('[CRON] Daily job finished');
  }, {
    timezone: "Africa/Cairo"
  });
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

module.exports = { initCronJobs, processRecurringTransactions, processBills };
