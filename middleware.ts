import { type NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/constants';

/**
 * Edge middleware performs a cheap cookie-presence check and redirects
 * unauthenticated requests to /signin. Authoritative session validation
 * happens server-side (Node runtime) in the (app) layout and API routes.
 */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has(SESSION_COOKIE);
  if (hasSession) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = '/signin';
  return NextResponse.redirect(url);
}

// Protect app pages only. /signin, /api, and static assets stay public.
export const config = {
  matcher: ['/', '/dashboard/:path*', '/daily-log/:path*', '/dsa/:path*', '/weekly-review/:path*'],
};
