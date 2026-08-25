const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
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
const budgetsRoutes = require('./routes/budgets');
const smartBudgetsRoutes = require('./routes/smartBudgets');
const debtsRoutes = require('./routes/debts');
const simulationRoutes = require('./routes/simulationRoutes');
const forecastRoutes = require('./routes/forecastRoutes');
const incomeProfileRoutes = require('./routes/incomeProfileRoutes');

const app = express();

// ─── Security Headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS — restrict to known frontend origins ─────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server (no origin) and explicitly listed origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Blocked by CORS policy'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
  maxAge: 86400,
}));

app.use(compression());

// ─── Global rate limiting ──────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', globalLimiter);

// Auth rate limiting moved to auth routes

app.get('/healthz', (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? 'ok' : 'degraded',
    database: databaseReady ? 'connected' : 'disconnected',
  });
});

// Mount SMS Webhook route BEFORE global JSON middleware
app.use('/api/sms/webhook', require('./routes/smsWebhook'));

app.use(
  express.json({
    limit: "256kb",
  })
);

app.use(
  express.urlencoded({
    limit: "256kb",
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
app.use('/api/budgets', budgetsRoutes);
app.use('/api/smart-budgets', smartBudgetsRoutes);
app.use('/api/debts', debtsRoutes);
app.use('/api/sandbox', simulationRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/income-profiles', incomeProfileRoutes);
app.use('/api/quick-add', require('./routes/quickAddRoutes'));

const integrationsRoutes = require('./routes/integrations');
app.use('/api/integrations', integrationsRoutes);

app.use(errorHandler);
module.exports = app;
