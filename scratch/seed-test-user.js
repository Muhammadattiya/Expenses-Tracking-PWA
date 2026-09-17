import path from 'path';
import { createRequire } from 'module';
const require = createRequire('d:/expenses-tracker/backend/package.json');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'd:/expenses-tracker/backend/.env' });

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await mongoose.connection.db.collection('users').find({}, { projection: { email: 1, hasCompletedOnboarding: 1 } }).toArray();
  console.log('Found users in DB:', users);
  const res = await mongoose.connection.db.collection('users').updateOne(
    { email: { $regex: /gemini/i } },
    { $set: { hasCompletedOnboarding: true } }
  );
  console.log('Seed result regex:', res);
  console.log('Seed result:', res);
  await mongoose.disconnect();
}

seed().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
