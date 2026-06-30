import crypto from 'node:crypto';
import { dbConnect } from './db';
import { getEnv, isProduction } from './env';
import { SESSION_COOKIE } from './constants';
import { User, type UserDoc } from '@/models/User';
import { Session } from '@/models/Session';
import type { SessionUser } from '@/types';

const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;
const TOKEN_BYTES = 32;

/** Re-exported for convenience; canonical definition lives in lib/constants. */
export { SESSION_COOKIE };

/** Rolling session lifetime: ~30 days, refreshed on each authenticated request. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// --- Password hashing (scrypt, no third-party dependency) -------------------

/** Hash a plaintext password as `salt:derivedKey` (hex). */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${derived}`;
}

/** Constant-time verification of a password against a stored `salt:derivedKey`. */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':');
  if (!salt || !key) {
    return false;
  }
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== derived.length) {
    return false;
  }
  return crypto.timingSafeEqual(keyBuffer, derived);
}

// --- Session tokens ---------------------------------------------------------

/** Keyed hash (HMAC-SHA-256 with AUTH_SECRET) of a session token for storage. */
function hashToken(token: string): string {
  return crypto.createHmac('sha256', getEnv('AUTH_SECRET')).update(token).digest('hex');
}

function toSessionUser(user: UserDoc): SessionUser {
  return { id: String(user._id), username: user.username, email: user.email };
}

/** Create a persisted session for a user and return its raw token + expiry. */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  await dbConnect();
  const token = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await Session.create({ tokenHash: hashToken(token), userId, expiresAt });
  return { token, expiresAt };
}

/**
 * Resolve the authenticated user for a session token. Returns null when the
 * token is absent, unknown, or expired. Rolls the expiry forward (sliding
 * window) for valid sessions.
 */
export async function getSessionUser(token: string | undefined): Promise<SessionUser | null> {
  if (!token) {
    return null;
  }
  await dbConnect();
  const session = await Session.findOne({ tokenHash: hashToken(token) });
  if (!session) {
    return null;
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    await Session.deleteOne({ _id: session._id });
    return null;
  }
  // Rolling refresh.
  session.expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await session.save();

  const user = await User.findById(session.userId);
  return user ? toSessionUser(user) : null;
}

/** Invalidate (delete) the session for a token. Idempotent. */
export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) {
    return;
  }
  await dbConnect();
  await Session.deleteOne({ tokenHash: hashToken(token) });
}

/** Look up the single owner by username OR email (normalized). */
export async function findUserByIdentifier(identifier: string): Promise<UserDoc | null> {
  await dbConnect();
  const normalized = identifier.toLowerCase().trim();
  return User.findOne({ $or: [{ username: normalized }, { email: normalized }] });
}

// --- Cookie options ---------------------------------------------------------

export interface SessionCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  expires?: Date;
  maxAge?: number;
}

/** Cookie options for issuing/refreshing the session cookie. */
export function sessionCookieOptions(expiresAt: Date): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  };
}

/** Cookie options for clearing the session cookie on sign-out. */
export function clearedCookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  };
}
