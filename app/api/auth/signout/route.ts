import { type NextRequest, NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/http';
import { destroySession, clearedCookieOptions, SESSION_COOKIE } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  try {
    await destroySession(token);
  } catch (error) {
    return handleRouteError(error);
  }

  // Idempotent: succeeds whether or not a session existed.
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE, '', clearedCookieOptions());
  return response;
}
