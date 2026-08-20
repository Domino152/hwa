import { connectDB, disconnectDB } from './database/index.js';
import mongoose from 'mongoose';

async function cleanup() {
  try {
    await connectDB();
    const result = await mongoose.connection.db!.collection('schedules').deleteMany({});
    console.log(`Deleted ${result.deletedCount} schedule documents`);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

cleanup();
