require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

async function run() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('No MONGO_URI');

    console.log('--- STEP 1: DB IDENTITY ---');
    const parsedUri = new URL(uri);
    const dbName = parsedUri.pathname.replace(/^\//, '') || 'test';
    console.log(`Database Name: ${dbName}`);
    if (dbName !== 'finova') throw new Error('Database is NOT finova');

    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    const collections = await db.listCollections().toArray();
    const hasTransactions = collections.some(c => c.name === 'transactions');
    console.log(`Collection "transactions" exists: ${hasTransactions}`);
    if (!hasTransactions) throw new Error('No transactions collection');

    const collection = db.collection('transactions');

    console.log('\n--- STEP 2: CHECK EXISTING DUPLICATES ---');
    const duplicateGroups = await collection.aggregate([
      { $match: { smsHash: { $type: "string" } } },
      { $group: { _id: { user: "$user", smsHash: "$smsHash" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    const numGroups = duplicateGroups.length;
    const affectedDocs = duplicateGroups.reduce((acc, curr) => acc + curr.count, 0);
    console.log(`Duplicate valid (user, smsHash) groups: ${numGroups}`);
    console.log(`Affected documents: ${affectedDocs}`);

    console.log('\n--- STEP 3: CHECK NULL / MISSING smsHash ---');
    const totalDocs = await collection.countDocuments({});
    const missingHash = await collection.countDocuments({ smsHash: { $exists: false } });
    const nullHash = await collection.countDocuments({ smsHash: null });
    const stringHash = await collection.countDocuments({ smsHash: { $type: "string" } });
    const nonStringHash = totalDocs - (missingHash + nullHash + stringHash);

    console.log(`Total transactions: ${totalDocs}`);
    console.log(`smsHash missing: ${missingHash}`);
    console.log(`smsHash null: ${nullHash}`);
    console.log(`smsHash non-string: ${nonStringHash}`);
    console.log(`smsHash string: ${stringHash}`);

    console.log('\n--- STEP 4: INSPECT EXISTING INDEXES ---');
    const initialIndexes = await collection.indexes();
    let oldUserSmsIndex = null;
    let oldSmsIndex = null;
    initialIndexes.forEach(idx => {
      const keyStr = JSON.stringify(idx.key);
      if (keyStr === '{"user":1,"smsHash":1}' && !idx.unique) {
         oldUserSmsIndex = idx;
      }
      if (keyStr === '{"smsHash":1}') {
         oldSmsIndex = idx;
      }
    });
    console.log(`Found non-unique {user:1, smsHash:1}: ${!!oldUserSmsIndex}`);
    console.log(`Found {smsHash:1}: ${!!oldSmsIndex}`);

    if (numGroups > 0) {
      console.log('\nCannot proceed: Duplicates exist.');
      process.exit(0);
    }

    console.log('\n--- STEP 5: SAFE DEPLOYMENT ---');
    console.log('Creating unique partial index...');
    await collection.createIndex(
      { user: 1, smsHash: 1 },
      { name: "user_1_smsHash_1_unique", unique: true, partialFilterExpression: { smsHash: { $type: "string" } } }
    );
    console.log('Index created.');

    console.log('\n--- STEP 6: HANDLE EXISTING CONFLICTING INDEXES ---');
    console.log('Evaluating redundancy:');
    if (oldUserSmsIndex) {
      console.log(`- Index ${oldUserSmsIndex.name} (user:1, smsHash:1) is redundant because we just created a unique version covering the exact same keys (though unique is partial). Wait, if the new index is partial (only strings), it does NOT index missing/null smsHash values! Therefore, dropping the old non-partial index might affect queries that query {user: userId, smsHash: null}. Are there such queries? Probably not, since smsHash is only used for deduplication of strings. But we should ask for confirmation.`);
    }
    if (oldSmsIndex) {
      console.log(`- Index ${oldSmsIndex.name} (smsHash:1) might be redundant for deduplication, but could be used if querying purely by smsHash without user. The app always queries with user. We should ask for confirmation.`);
    }

    console.log('\n--- STEP 7: FINAL VERIFICATION ---');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(idx => {
      const keyStr = JSON.stringify(idx.key);
      if (keyStr === '{"user":1,"smsHash":1}') {
        console.log(`- Name: ${idx.name}`);
        console.log(`  Unique: ${!!idx.unique}`);
        console.log(`  Partial: ${JSON.stringify(idx.partialFilterExpression)}`);
      }
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
