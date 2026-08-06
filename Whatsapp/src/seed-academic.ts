import { connectDB, disconnectDB } from './database/index.js';
import { seedAcademic } from './database/seeders/academic.seed.js';

async function runSeed(): Promise<void> {
  try {
    await connectDB();
    await seedAcademic();
  } catch (err) {
    console.error('✗ Seeding failed:', err);
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

runSeed();
