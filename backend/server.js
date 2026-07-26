require("dotenv").config();
const compression = require("compression");

const app = require("./app");
const connectDB = require("./config/db");
const { initCronJobs } = require('./services/cronJobs');

connectDB();
initCronJobs();

app.use(compression());

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});