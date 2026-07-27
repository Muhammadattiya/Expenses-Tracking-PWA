require("dotenv").config();
const compression = require("compression");

const app = require("./app");
const connectDB = require("./config/db");
const { initCronJobs } = require('./services/cronJobs');

connectDB();
initCronJobs();

console.log('[VAPID] VAPID Public Key Loaded:', process.env.VAPID_PUBLIC_KEY ? 'YES' : 'NO');
console.log('[VAPID] VAPID Private Key Loaded:', process.env.VAPID_PRIVATE_KEY ? 'YES' : 'NO');

app.use(compression());

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});