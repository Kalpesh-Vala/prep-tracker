import { inject } from 'vitest';
import mongoose from 'mongoose';

/** Connect Mongoose to the shared in-memory MongoDB (started in globalSetup). */
export async function setupMongo(): Promise<void> {
  process.env.MONGODB_URI = inject('mongoUri');
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
}

/** Remove all documents between tests for isolation. */
export async function clearCollections(): Promise<void> {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

/** Disconnect Mongoose (the shared server is stopped by globalSetup teardown). */
export async function teardownMongo(): Promise<void> {
  await mongoose.disconnect();
}
