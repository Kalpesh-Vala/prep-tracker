import { dbConnect } from './db';
import { LoginAttempt } from '@/models/LoginAttempt';

/** Maximum consecutive failed sign-in attempts before lockout. */
export const MAX_ATTEMPTS = 5;

/** Lockout / counting window in milliseconds (15 minutes). */
export const WINDOW_MS = 15 * 60 * 1000;

function normalize(key: string): string {
  return key.toLowerCase().trim();
}

/** True when the key has reached the failed-attempt threshold within the window. */
export async function isLocked(key: string): Promise<boolean> {
  await dbConnect();
  const since = new Date(Date.now() - WINDOW_MS);
  const count = await LoginAttempt.countDocuments({
    key: normalize(key),
    createdAt: { $gte: since },
  });
  return count >= MAX_ATTEMPTS;
}

/** Record a failed attempt for the key. */
export async function recordFailure(key: string): Promise<void> {
  await dbConnect();
  await LoginAttempt.create({ key: normalize(key) });
}

/** Clear all recorded failures for the key (called on success). */
export async function clearFailures(key: string): Promise<void> {
  await dbConnect();
  await LoginAttempt.deleteMany({ key: normalize(key) });
}
