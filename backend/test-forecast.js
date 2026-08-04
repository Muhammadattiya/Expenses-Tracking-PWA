require('dotenv').config();
const mongoose = require('mongoose');
const ForecastEngine = require('./services/forecastEngine');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // Get first user
  const User = require('./models/User');
  const user = await User.findOne();
  if (!user) {
    console.log("No user found.");
    process.exit(0);
  }

  console.log(`Running forecast for User: ${user.name}`);
  const forecast = await ForecastEngine.runForecast(user._id.toString(), null, 7);

  console.log("Forecast Period:", forecast.forecastPeriod, "days");
  console.log("Current Balance:", forecast.currentBalance);
  console.log("Expected Daily Spending:", forecast.expectedDailySpending);
  console.log("Final Balance:", forecast.finalBalance);
  console.log("Min Balance:", forecast.minBalance, "on", forecast.lowestForecastDay);
  console.log("Max Balance:", forecast.maxBalance, "on", forecast.highestForecastDay);
  console.log("Insights:");
  forecast.insights.forEach(i => console.log(`- [${i.type}] ${i.fallback}`));
  
  console.log("Events on day 1:");
  console.log(forecast.dailyForecast[0]?.events);

  process.exit(0);
}

test().catch(console.error);
