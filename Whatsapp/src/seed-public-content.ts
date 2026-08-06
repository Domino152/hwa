import { connectDB, disconnectDB } from './database/index.js';
import { seedPublicContent } from './database/seeders/public-content.seed.js';

async function runSeed(): Promise<void> {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Connected.\n');

    console.log('Seeding public content...');
    await seedPublicContent();
    console.log('Done.\n');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

runSeed();
