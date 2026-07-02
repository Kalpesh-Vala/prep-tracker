/**
 * Edge-safe constants. This module MUST NOT import Node-only code (crypto,
 * mongoose) so it can be used from `middleware.ts` (Edge runtime).
 */

/** Name of the cookie carrying the opaque session token. */
export const SESSION_COOKIE = 'pt_session';

/** Allowed energy-level values for a daily log entry (low → high). */
export const ENERGY_LEVELS = ['low', 'medium', 'high'] as const;

/** Maximum total study hours recordable for a single day. */
export const STUDY_HOURS_MAX = 24;

/** Maximum length for free-text daily-log fields (summary, challenge, goal). */
export const TEXT_FIELD_MAX_LEN = 2000;

/** Default and maximum page size for the daily-log history list. */
export const DAILY_LOG_DEFAULT_LIMIT = 30;
export const DAILY_LOG_MAX_LIMIT = 100;
