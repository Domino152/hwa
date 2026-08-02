import { connectDB, disconnectDB } from './database/index.js';
import { seedUsers } from './database/seeders/users.seed.js';

async function runSeed(): Promise<void> {
  try {
    await connectDB();
    await seedUsers();
  } catch (err) {
    console.error('✗ Seeding failed:', err);
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

runSeed();
