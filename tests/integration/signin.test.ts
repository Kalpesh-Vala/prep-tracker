import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { setupMongo, teardownMongo, clearCollections } from '../helpers/mongo';
import { POST } from '@/app/api/auth/signin/route';
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

function signinReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/signin', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/signin', () => {
  it('signs in with a valid username and sets a session cookie', async () => {
    const res = await POST(signinReq({ identifier: 'owner', password: 'correct horse' }));
    expect(res.status).toBe(200);
    expect(res.cookies.get('pt_session')?.value).toBeTruthy();
  });

  it('signs in with the email identifier', async () => {
    const res = await POST(
      signinReq({ identifier: 'owner@example.com', password: 'correct horse' }),
    );
    expect(res.status).toBe(200);
  });

  it('rejects invalid credentials with 401 and a generic message', async () => {
    const res = await POST(signinReq({ identifier: 'owner', password: 'nope' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.message).toBe('Invalid username/email or password.');
    expect(res.cookies.get('pt_session')?.value).toBeFalsy();
  });

  it('returns 400 when fields are missing', async () => {
    const res = await POST(signinReq({ identifier: 'owner' }));
    expect(res.status).toBe(400);
  });

  it('locks out after 5 consecutive failures (429), even with correct credentials', async () => {
    for (let i = 0; i < 5; i++) {
      await POST(signinReq({ identifier: 'owner', password: 'nope' }));
    }
    const res = await POST(signinReq({ identifier: 'owner', password: 'correct horse' }));
    expect(res.status).toBe(429);
  });
});
