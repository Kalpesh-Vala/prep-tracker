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

// --- DSA tracker ------------------------------------------------------------

/** Allowed difficulty values for a DSA problem. */
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

/** Allowed attempt types for a DSA problem. */
export const ATTEMPT_TYPES = ['first_attempt', 'revisit'] as const;

/** Inclusive confidence bounds (integer). */
export const CONFIDENCE_MIN = 1;
export const CONFIDENCE_MAX = 5;

/** Maximum lengths for DSA free-text fields. */
export const DSA_TITLE_MAX_LEN = 300;
export const DSA_TEXT_MAX_LEN = 100;
export const DSA_COMPLEXITY_MAX_LEN = 60;

/** Upper sanity bound for time taken (minutes). */
export const DSA_TIME_TAKEN_MAX = 100000;

/** Default and maximum page size for the DSA problem list. */
export const DSA_DEFAULT_LIMIT = 20;
export const DSA_MAX_LIMIT = 100;

/** How many weakest topics the summary surfaces. */
export const WEAK_TOPICS_COUNT = 5;

// --- Weekly review ----------------------------------------------------------

/**
 * Fixed prep start date (a Monday) anchoring week 1. Week N spans
 * [PREP_START_DATE + (N-1)*7d, +6d] in UTC (Monday–Sunday). Documented config;
 * change here to re-anchor the 26-week cycle.
 */
export const PREP_START_DATE = '2026-01-05';

/** Total number of weeks in the preparation cycle. */
export const PREP_TOTAL_WEEKS = 26;

/** Maximum lengths for Weekly Review text fields. */
export const WEEKLY_REVIEW_TEXT_MAX_LEN = 4000;
export const WEEKLY_REVIEW_TOPIC_MAX_LEN = 100;

/** Default and maximum page size for the Weekly Review list. */
export const WEEKLY_REVIEW_DEFAULT_LIMIT = 26;
export const WEEKLY_REVIEW_MAX_LIMIT = 100;
