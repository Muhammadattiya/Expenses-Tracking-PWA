require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

async function introspect() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.log('No MONGO_URI found in environment.');
      process.exit(1);
    }
    
    // Check Database Identity safely
    const parsedUri = new URL(uri);
    // Don't log full URI
    const dbName = parsedUri.pathname.replace(/^\//, '') || 'test';
    const hostName = parsedUri.hostname;
    console.log(`Database Name: ${dbName}`);
    console.log(`Database Host: ${hostName.includes('mongodb.net') ? 'Atlas Cluster' : 'Local/Other'}`);

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Check transactions collection
    const collections = await db.listCollections().toArray();
    const hasTransactions = collections.some(c => c.name === 'transactions');
    console.log(`Collection "transactions" exists: ${hasTransactions}`);

    if (hasTransactions) {
      const collection = db.collection('transactions');
      const indexes = await collection.indexes();
      
      console.log('\n--- INDEXES ON transactions ---');
      indexes.forEach(idx => {
        console.log(`- Name: ${idx.name}`);
        console.log(`  Key: ${JSON.stringify(idx.key)}`);
        if (idx.unique) console.log(`  Unique: true`);
        if (idx.partialFilterExpression) console.log(`  Partial Filter: ${JSON.stringify(idx.partialFilterExpression)}`);
        console.log('');
      });
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

introspect();
