require('dotenv').config();
const mongoose = require('mongoose');
const { calculateRecommendation } = require('./services/budgetEngine');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const userId = '6a6136c1ca1b30cf1ce55cb2'; // user id from first tx
  const categoryId = '6a651b3b16df8facbfc17fa9'; // Uber category
  
  const recWeekly = await calculateRecommendation(userId, categoryId, 'weekly');
  console.log('Recommendation for Uber (Weekly):', recWeekly);
  
  const recMonthly = await calculateRecommendation(userId, categoryId, 'monthly');
  console.log('Recommendation for Uber (Monthly):', recMonthly);

  // let's try for the user with id 6a60639cca1b30cf1ce4ff9e
  const userId2 = '6a60639cca1b30cf1ce4ff9e';
  const categoryId2 = '6a6598b8df8126e24d3acffb'; // Transportation
  
  const recWeekly2 = await calculateRecommendation(userId2, categoryId2, 'weekly');
  console.log('Recommendation for Transportation (Weekly):', recWeekly2);
  
  const recMonthly2 = await calculateRecommendation(userId2, categoryId2, 'monthly');
  console.log('Recommendation for Transportation (Monthly):', recMonthly2);

  process.exit(0);
});
