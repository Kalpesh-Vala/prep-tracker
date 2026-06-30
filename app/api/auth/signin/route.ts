import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, fail, handleRouteError } from '@/lib/http';
import {
  findUserByIdentifier,
  verifyPassword,
  createSession,
  sessionCookieOptions,
  SESSION_COOKIE,
} from '@/lib/auth';
import { isLocked, recordFailure, clearFailures } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const signInSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail('INVALID_INPUT', 'Request body must be valid JSON.', 400);
  }

  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return fail('INVALID_INPUT', 'Identifier and password are required.', 400);
  }
  const { identifier, password } = parsed.data;

  try {
    if (await isLocked(identifier)) {
      return fail('TOO_MANY_ATTEMPTS', 'Too many attempts. Try again later.', 429);
    }

    const user = await findUserByIdentifier(identifier);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      await recordFailure(identifier);
      return fail('INVALID_CREDENTIALS', 'Invalid username/email or password.', 401);
    }

    await clearFailures(identifier);
    const { token, expiresAt } = await createSession(String(user._id));

    const response = ok({
      user: { id: String(user._id), username: user.username, email: user.email },
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
