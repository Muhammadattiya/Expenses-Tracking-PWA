const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");

const transactionsRoutes = require("./routes/transactions");
const accountsRoutes = require("./routes/accounts");
const categoriesRoutes = require("./routes/categories");
const authRoutes = require('./routes/auth');
const investmentRoutes = require('./routes/investments');

const app = express();

app.use(cors());

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

app.use(errorHandler);
module.exports = app;
