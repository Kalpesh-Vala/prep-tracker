/**
 * Edge-safe constants. This module MUST NOT import Node-only code (crypto,
 * mongoose) so it can be used from `middleware.ts` (Edge runtime).
 */

/** Name of the cookie carrying the opaque session token. */
export const SESSION_COOKIE = 'pt_session';
