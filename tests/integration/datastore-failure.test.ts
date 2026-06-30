import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Force the datastore to be unreachable.
vi.mock('@/lib/db', async () => {
  const { DatastoreUnavailableError } = await import('@/lib/errors');
  return {
    dbConnect: vi.fn().mockRejectedValue(new DatastoreUnavailableError()),
  };
});

import { POST as signin } from '@/app/api/auth/signin/route';
import { GET as session } from '@/app/api/auth/session/route';

describe('datastore unreachable (fail safe)', () => {
  it('signin returns a safe 503 instead of appearing to succeed', async () => {
    const res = await signin(
      new NextRequest('http://localhost/api/auth/signin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: 'owner', password: 'pw' }),
      }),
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe('DATASTORE_UNAVAILABLE');
    expect(res.cookies.get('pt_session')?.value).toBeFalsy();
  });

  it('session validation with a token fails safe with 503', async () => {
    const res = await session(
      new NextRequest('http://localhost/api/auth/session', {
        headers: { cookie: 'pt_session=abc' },
      }),
    );
    expect(res.status).toBe(503);
  });
});
