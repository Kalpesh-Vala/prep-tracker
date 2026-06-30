import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { setupMongo, teardownMongo, clearCollections } from '../helpers/mongo';
import { POST as signin } from '@/app/api/auth/signin/route';
import { GET as session } from '@/app/api/auth/session/route';
import { POST as signout } from '@/app/api/auth/signout/route';
import { User } from '@/models/User';
import { hashPassword } from '@/lib/auth';

beforeAll(setupMongo);
afterAll(teardownMongo);
beforeEach(async () => {
  await clearCollections();
  await User.create({
    username: 'owner',
    email: 'owner@example.com',
    passwordHash: hashPassword('correct horse'),
  });
});

function withCookie(url: string, token: string, method = 'GET'): NextRequest {
  return new NextRequest(url, { method, headers: { cookie: `pt_session=${token}` } });
}

describe('session persistence', () => {
  it('persists across reload/revisit and is rejected after sign-out', async () => {
    const inRes = await signin(
      new NextRequest('http://localhost/api/auth/signin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: 'owner', password: 'correct horse' }),
      }),
    );
    const token = inRes.cookies.get('pt_session')?.value;
    expect(token).toBeTruthy();

    // Reload.
    const s1 = await session(withCookie('http://localhost/api/auth/session', token!));
    expect((await s1.json()).data.authenticated).toBe(true);

    // Revisit.
    const s2 = await session(withCookie('http://localhost/api/auth/session', token!));
    expect((await s2.json()).data.authenticated).toBe(true);

    // Sign out.
    const out = await signout(withCookie('http://localhost/api/auth/signout', token!, 'POST'));
    expect(out.status).toBe(204);

    // Rejected afterwards.
    const s3 = await session(withCookie('http://localhost/api/auth/session', token!));
    expect((await s3.json()).data.authenticated).toBe(false);
  });
});
