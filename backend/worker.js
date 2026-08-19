require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { initCronJobs } = require('./services/cronJobs');

const shutdown = async (signal) => {
  console.log(`[WORKER] ${signal} received; shutting down gracefully.`);
  await mongoose.disconnect();
  process.exit(0);
};

const start = async () => {
  await connectDB();
  initCronJobs();
  console.log('[WORKER] Scheduled jobs are running.');
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((error) => {
  console.error('[WORKER] Failed to start', error);
  process.exit(1);
});
