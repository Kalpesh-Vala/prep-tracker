import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { POST as signout } from '@/app/api/auth/signout/route';
import { GET as session } from '@/app/api/auth/session/route';

describe('route protection (unauthenticated)', () => {
  it('redirects unauthenticated page requests to /signin', () => {
    const res = middleware(new NextRequest('http://localhost/dashboard'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/signin');
  });

  it('allows requests that carry a session cookie (presence check)', () => {
    const res = middleware(
      new NextRequest('http://localhost/dashboard', {
        headers: { cookie: 'pt_session=abc' },
      }),
    );
    expect(res.headers.get('location')).toBeNull();
  });

  it('signout is idempotent when unauthenticated (204, clears cookie)', async () => {
    const res = await signout(
      new NextRequest('http://localhost/api/auth/signout', { method: 'POST' }),
    );
    expect(res.status).toBe(204);
  });

  it('session endpoint reports authenticated:false without a cookie', async () => {
    const res = await session(new NextRequest('http://localhost/api/auth/session'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.authenticated).toBe(false);
  });
});
