require('dotenv').config();
const mongoose = require('mongoose');

async function checkIndexes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const indexes = await db.collection('transactions').indexes();
    console.log(JSON.stringify(indexes, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkIndexes();
