const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");

const transactionsRoutes = require("./routes/transactions");
const accountsRoutes = require("./routes/accounts");
const categoriesRoutes = require("./routes/categories");
const authRoutes = require('./routes/auth');
const investmentRoutes = require('./routes/investments');
const receivableRoutes = require('./routes/receivables');
const analyticsRoutes = require('./routes/analytics');
const recurringTransactionsRoutes = require('./routes/recurringTransactions');
const billsRoutes = require('./routes/bills');

const app = express();

app.use(cors());

// Mount SMS Webhook route BEFORE global JSON middleware
app.use('/api/sms/webhook', require('./routes/smsWebhook'));

app.use(
  express.json({
    limit: "50mb",
  })
);

app.use(
  express.urlencoded({
    limit: "50mb",
    extended: true,
  })
);

app.use("/api/transactions", transactionsRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/receivables', receivableRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/recurring-transactions', recurringTransactionsRoutes);
app.use('/api/bills', billsRoutes);

app.use(errorHandler);
module.exports = app;
