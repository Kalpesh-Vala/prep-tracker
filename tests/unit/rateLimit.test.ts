import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupMongo, teardownMongo, clearCollections } from '../helpers/mongo';
import { isLocked, recordFailure, clearFailures, MAX_ATTEMPTS } from '@/lib/rateLimit';

beforeAll(setupMongo);
afterAll(teardownMongo);
beforeEach(clearCollections);

describe('rate limiting', () => {
  it('is not locked below the threshold', async () => {
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
      await recordFailure('owner');
    }
    expect(await isLocked('owner')).toBe(false);
  });

  it('locks after the threshold of failures', async () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await recordFailure('owner');
    }
    expect(await isLocked('owner')).toBe(true);
  });

  it('clears failures (e.g. on a successful sign-in)', async () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await recordFailure('owner');
    }
    await clearFailures('owner');
    expect(await isLocked('owner')).toBe(false);
  });

  it('normalizes keys (case-insensitive)', async () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await recordFailure('OWNER');
    }
    expect(await isLocked('owner')).toBe(true);
  });
});
