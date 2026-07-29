const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Transaction = require('./models/Transaction');
  const Category = require('./models/Category');
  
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

  const txs = await Transaction.aggregate([
    { 
      $match: { 
        user: new mongoose.Types.ObjectId('6a60639cca1b30cf1ce4ff9e'), 
        type: 'expense',
        date: { $gte: sixMonthsAgo } 
      } 
    },
    { 
      $group: { 
        _id: '$category', 
        count: { $sum: 1 }, 
        total: { $sum: '$amount' }
      } 
    }
  ]);
  
  for (const stat of txs) {
    const cat = await Category.findById(stat._id);
    console.log(`Category: ${cat ? cat.name : stat._id} | Count: ${stat.count} | Total: ${stat.total}`);
  }
  
  mongoose.disconnect();
}).catch(console.error);
