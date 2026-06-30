/**
 * Provision the single owner account from environment variables.
 * Run once with: `npm run seed`
 *
 * Reads OWNER_USERNAME, OWNER_EMAIL, OWNER_PASSWORD (and MONGODB_URI) from the
 * environment. No public registration flow exists (single-user app).
 */
import { dbConnect } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { getEnv } from '@/lib/env';
import { User } from '@/models/User';
import mongoose from 'mongoose';

async function main(): Promise<void> {
  const username = getEnv('OWNER_USERNAME').toLowerCase().trim();
  const email = getEnv('OWNER_EMAIL').toLowerCase().trim();
  const password = getEnv('OWNER_PASSWORD');

  await dbConnect();

  const passwordHash = hashPassword(password);
  await User.findOneAndUpdate(
    { $or: [{ username }, { email }] },
    { username, email, passwordHash },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log(`Owner provisioned: ${username} <${email}>`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
