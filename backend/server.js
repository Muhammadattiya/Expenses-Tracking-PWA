require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const { initCronJobs } = require('./services/cronJobs');

const PORT = process.env.PORT || 5000;
let server;

const shutdown = async (signal) => {
  console.log(`[SERVER] ${signal} received; shutting down gracefully.`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await require('mongoose').disconnect();
  process.exit(0);
};

const start = async () => {
  await connectDB();
  if (process.env.RUN_CRON_JOBS !== 'false') initCronJobs();
  console.log('[VAPID] VAPID Public Key Loaded:', process.env.VAPID_PUBLIC_KEY ? 'YES' : 'NO');
  console.log('[VAPID] VAPID Private Key Loaded:', process.env.VAPID_PRIVATE_KEY ? 'YES' : 'NO');
  server = app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((error) => {
  console.error('[SERVER] Failed to start', error);
  process.exit(1);
});
