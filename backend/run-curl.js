require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app'); 
const User = require('./models/User');
const Account = require('./models/Account');
const Category = require('./models/Category');
const Transaction = require('./models/Transaction');

const PORT = 5555;
const TEST_TOKEN = 'YOUR_TEST_TOKEN';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finova_test_db';

async function runCurl() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    // Clear Transactions for clean state
    await Transaction.deleteMany({});
    await User.deleteMany({});
    await Account.deleteMany({});
    
    let user = new User({ name: 'Curl User', email: 'curl@test.com', password: 'password', googleId: 'curl-id', smsWebhookToken: TEST_TOKEN });
    await user.save();

    let account = new Account({ user: user._id, name: 'Curl Account', type: 'bank', balance_adjustment: 0, cardLast4: '2513', currency: 'EGP', isDefault: true });
    await account.save();

    let category = new Category({ user: user._id, name: 'Miscellaneous', type: 'expense' });
    await category.save();

    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}... Please run curl command manually in another terminal.`);
    });
  } catch (err) {
    console.error(err);
  }
}

runCurl();
