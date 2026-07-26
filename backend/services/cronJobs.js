const cron = require('node-cron');
const RecurringTransaction = require('../models/RecurringTransaction');
const Transaction = require('../models/Transaction');
const Bill = require('../models/Bill');
const Subscription = require('../models/Subscription');
const webpush = require('web-push');

// Run every minute to process recurring transactions precisely at their execution time
const initCronJobs = () => {
  cron.schedule('* * * * *', async () => {
    console.log('Running cron jobs for Recurring Transactions and Bills...');
    await processRecurringTransactions();
    await processBills();
  });
  cron.schedule('0 20 * * *', async () => {
    console.log('Running daily general reminder...');
    await sendDailyReminder();
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

      const sendPromises = subscriptions.map(sub => 
        webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
        .catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            return Subscription.findByIdAndDelete(sub._id);
          }
        })
      );
      await Promise.all(sendPromises);
    }
  } catch (error) {
    console.error('Error sending daily reminder:', error);
  }
};

const processRecurringTransactions = async () => {
  try {
    const now = new Date();
    // Find active recurring transactions where nextExecutionDate is in the past or now
    const recurrings = await RecurringTransaction.find({
      isActive: true,
      nextExecutionDate: { $lte: now }
    });

    // Reminders logic
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

      if (reminderDate.getTime() <= now.getTime() && (!lastNotifiedDay || lastNotifiedDay.getTime() < now.getTime())) {
        const subscriptions = await Subscription.find({ user: r.user });
        if (subscriptions.length > 0) {
          const payload = JSON.stringify({
            title: `تذكير بمعاملة متكررة: ${r.title}`,
            body: `سيتم تنفيذ معاملة "${r.title}" بقيمة ${r.amount} قريباً.`,
            url: '/settings'
          });

          const sendPromises = subscriptions.map(sub => 
            webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
            .catch(err => {
              if (err.statusCode === 410 || err.statusCode === 404) {
                return Subscription.findByIdAndDelete(sub._id);
              }
            })
          );
          await Promise.all(sendPromises);
        }
        r.lastNotified = new Date();
        await r.save();
      }
    }

    for (let r of recurrings) {
      // Create a transaction
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

      // Check if it ends
      if (!r.neverEnds) {
        if ((r.maxOccurrences && r.currentOccurrences >= r.maxOccurrences) ||
            (r.endDate && r.nextExecutionDate >= r.endDate)) {
          r.isActive = false;
        }
      }

      // Calculate next execution date
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
    }
  } catch (error) {
    console.error('Error processing recurring transactions:', error);
  }
};

const processBills = async () => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Update statuses for all active unpaid bills
    const activeBills = await Bill.find({ isActive: true, status: { $ne: 'paid' } });
    
    for (let bill of activeBills) {
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

      // Reminder logic
      if (bill.reminderEnabled && bill.notificationEnabled) {
        // Calculate reminder date
        const reminderDate = new Date(bill.dueDate);
        reminderDate.setDate(reminderDate.getDate() - bill.reminderDaysBefore);
        reminderDate.setHours(0, 0, 0, 0);

        const lastNotifiedDay = bill.lastNotified ? new Date(bill.lastNotified) : null;
        if (lastNotifiedDay) lastNotifiedDay.setHours(0, 0, 0, 0);

        if (reminderDate.getTime() <= now.getTime() && (!lastNotifiedDay || lastNotifiedDay.getTime() < now.getTime())) {
          // Send notification
          const subscriptions = await Subscription.find({ user: bill.user });
          if (subscriptions.length > 0) {
            const payload = JSON.stringify({
              title: `تذكير بالفاتورة: ${bill.name}`,
              body: `فاتورة "${bill.name}" بقيمة ${bill.expectedAmount} حان موعدها قريباً.`,
              url: '/bills'
            });

            const sendPromises = subscriptions.map(sub => 
              webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
              .catch(err => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                  return Subscription.findByIdAndDelete(sub._id);
                }
              })
            );
            await Promise.all(sendPromises);
          }

          bill.lastNotified = new Date();
          await bill.save();
        }
      }
    }
  } catch (error) {
    console.error('Error processing bills:', error);
  }
};

module.exports = { initCronJobs, processRecurringTransactions, processBills };
