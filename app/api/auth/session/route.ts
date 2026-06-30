import { type NextRequest } from 'next/server';
import { ok, handleRouteError } from '@/lib/http';
import { getSessionUser, sessionCookieOptions, SESSION_COOKIE, SESSION_TTL_MS } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  try {
    const user = await getSessionUser(token);
    if (!user) {
      return ok({ authenticated: false });
    }

    const response = ok({ authenticated: true, user });
    // Refresh the cookie's expiry to match the rolling session.
    response.cookies.set(
      SESSION_COOKIE,
      token as string,
      sessionCookieOptions(new Date(Date.now() + SESSION_TTL_MS)),
    );
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
