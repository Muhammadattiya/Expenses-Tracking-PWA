require('dotenv').config();
const mongoose = require('mongoose');

async function checkAccountSchema() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.log('NO MONGO_URI');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    const db = mongoose.connection.db;
    
    // Check accounts collection
    const accounts = await db.collection('accounts').find({ cardLast4: { $type: 'string' } }).toArray();
    console.log('Accounts with cardLast4 (string): ' + accounts.length);
    
    // check schema indexing
    const indexes = await db.collection('accounts').indexes();
    console.log('Account indexes:');
    indexes.forEach(idx => {
       if (idx.key.cardLast4) {
         console.log('- Includes cardLast4: ' + JSON.stringify(idx.key));
       }
    });

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkAccountSchema();
