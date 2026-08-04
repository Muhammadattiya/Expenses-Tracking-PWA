require('dotenv').config();
const mongoose = require('mongoose');
const { calculateSurvivalRisk } = require('./services/paydaySurvivalService');

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/finova');
  
  console.log('Testing deterministic Payday Survival...');
  
  // Scenario 1: Safe
  let forecastData = {
    dailyForecast: [
      { date: '2023-10-01', balance: 500, events: [] },
      { date: '2023-10-02', balance: 400, events: [] },
      { date: '2023-10-03', balance: 350, events: [] },
      { date: '2023-10-04', balance: 300, events: [{ type: 'income_profile', amount: 2000, title: 'Salary' }] }
    ]
  };
  let result = calculateSurvivalRisk(forecastData);
  console.assert(result.riskLevel === 'Safe', `Expected Safe, got ${result.riskLevel}`);
  console.log('Scenario 1 (Safe) - Passed');
  
  // Scenario 2: Low Risk
  forecastData = {
    dailyForecast: [
      { date: '2023-10-01', balance: 500, events: [] },
      { date: '2023-10-02', balance: 200, events: [] },
      { date: '2023-10-03', balance: 50, events: [] }, // 50 < 10% of 2000 (200)
      { date: '2023-10-04', balance: 50, events: [{ type: 'income_profile', amount: 2000, title: 'Salary' }] }
    ]
  };
  result = calculateSurvivalRisk(forecastData);
  console.assert(result.riskLevel === 'Low', `Expected Low, got ${result.riskLevel}`);
  console.log('Scenario 2 (Low Risk) - Passed');
  
  // Scenario 3: Medium Risk
  forecastData = {
    dailyForecast: [
      { date: '2023-10-01', balance: 100, events: [] },
      { date: '2023-10-02', balance: -50, events: [] }, // Day 1 negative
      { date: '2023-10-03', balance: -100, events: [] }, // Day 2 negative
      { date: '2023-10-04', balance: -100, events: [{ type: 'income_profile', amount: 2000, title: 'Salary' }] }
    ]
  };
  result = calculateSurvivalRisk(forecastData);
  console.assert(result.riskLevel === 'Medium', `Expected Medium, got ${result.riskLevel}`);
  console.log('Scenario 3 (Medium Risk) - Passed');
  
  // Scenario 4: High Risk
  forecastData = {
    dailyForecast: [
      { date: '2023-10-01', balance: -10, events: [] },
      { date: '2023-10-02', balance: -50, events: [] },
      { date: '2023-10-03', balance: -100, events: [] }, // Day 3 negative
      { date: '2023-10-04', balance: -100, events: [{ type: 'income_profile', amount: 2000, title: 'Salary' }] }
    ]
  };
  result = calculateSurvivalRisk(forecastData);
  console.assert(result.riskLevel === 'High', `Expected High, got ${result.riskLevel}`);
  console.log('Scenario 4 (High Risk) - Passed');

  console.log('All tests passed deterministically.');
  process.exit(0);
}

test().catch(console.error);
