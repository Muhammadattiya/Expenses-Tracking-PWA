import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/expenses-tracker/backend/.env' });

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finova');
  const hash = await bcrypt.hash('Password123!', 12);
  const res = await mongoose.connection.db.collection('users').updateOne(
    { email: 'test@idempotency.com' },
    { $set: { password: hash, hasCompletedOnboarding: true } }
  );
  console.log('Seed result:', res);
  await mongoose.disconnect();
}

seed().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
