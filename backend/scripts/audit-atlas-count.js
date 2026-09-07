require('dotenv').config();
const mongoose = require('mongoose');

async function auditAtlasCount() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_URI is missing');
    process.exit(1);
  }

  try {
    console.log(`Connecting to: ${uri.split('@')[1] || uri}`);
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    const categoriesCollection = db.collection('categories');
    const allCategories = await categoriesCollection.find({}).toArray();

    const count = allCategories.length;
    console.log(`\nExact Category Count in DB: ${count}`);

    const withIntentId = allCategories.filter(c => c.intentId !== undefined).length;
    console.log(`Categories with intentId (migrated): ${withIntentId}`);
    console.log(`Categories missing intentId: ${count - withIntentId}`);
    
    // Check for duplicates (same name and userId)
    const duplicates = [];
    const nameUserMap = new Map();
    for (const c of allCategories) {
      const key = `${c.userId}_${c.name}`;
      if (nameUserMap.has(key)) {
        duplicates.push(c);
      } else {
        nameUserMap.set(key, c);
      }
    }
    console.log(`Duplicates found: ${duplicates.length}`);

    // Check for orphans (categories where the user does not exist)
    const usersCollection = db.collection('users');
    const userIds = [...new Set(allCategories.map(c => c.userId.toString()))];
    const users = await usersCollection.find({ _id: { $in: userIds.map(id => new mongoose.Types.ObjectId(id)) } }).toArray();
    const existingUserIds = new Set(users.map(u => u._id.toString()));
    
    const orphans = allCategories.filter(c => !existingUserIds.has(c.userId.toString()));
    console.log(`Orphaned categories found: ${orphans.length}`);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

auditAtlasCount();
