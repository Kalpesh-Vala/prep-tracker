import { z } from 'zod';
import { Types } from 'mongoose';
import { dbConnect } from './db';
import {
  ENERGY_LEVELS,
  STUDY_HOURS_MAX,
  TEXT_FIELD_MAX_LEN,
  DAILY_LOG_DEFAULT_LIMIT,
  DAILY_LOG_MAX_LIMIT,
} from './constants';
import { DailyLog, type DailyLogDoc } from '@/models/DailyLog';
import type { DailyLogDTO, EnergyLevel } from '@/types';

// --- Errors -----------------------------------------------------------------

/** Raised when a create would violate the one-entry-per-calendar-day rule. */
export class DuplicateDateError extends Error {
  constructor() {
    super('An entry for this date already exists.');
    this.name = 'DuplicateDateError';
  }
}

/** Raised when no entry matches the requested id. */
export class DailyLogNotFoundError extends Error {
  constructor() {
    super('Daily log entry not found.');
    this.name = 'DailyLogNotFoundError';
  }
}

/** Raised when input fails validation; `message` is safe to show the user. */
export class InvalidDailyLogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDailyLogError';
  }
}

// --- Date helpers -----------------------------------------------------------

/** Normalize any Date to midnight UTC of its calendar day. */
export function normalizeDate(input: Date): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

/** Midnight UTC of the current calendar day. */
export function startOfTodayUTC(): Date {
  return normalizeDate(new Date());
}

/**
 * Resolve and validate the calendar date for a new entry: defaults to today,
 * accepts a past date (backfill), rejects an invalid or future date.
 */
function resolveCreateDate(dateInput?: string): Date {
  const base = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(base.getTime())) {
    throw new InvalidDailyLogError('A valid date is required.');
  }
  const normalized = normalizeDate(base);
  if (normalized.getTime() > startOfTodayUTC().getTime()) {
    throw new InvalidDailyLogError('Cannot log an entry for a future date.');
  }
  return normalized;
}

// --- Zod schemas ------------------------------------------------------------

const oneDecimalPlace = (n: number) => Math.abs(n * 10 - Math.round(n * 10)) < 1e-9;

const requiredText = (label: string) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(TEXT_FIELD_MAX_LEN, `${label} must be at most ${TEXT_FIELD_MAX_LEN} characters.`);

const studyHours = z
  .number({ invalid_type_error: 'Study hours must be a number.' })
  .min(0, 'Study hours cannot be negative.')
  .max(STUDY_HOURS_MAX, `Study hours cannot exceed ${STUDY_HOURS_MAX}.`)
  .refine(oneDecimalPlace, 'Study hours allow at most one decimal place.');

const problemsSolved = z
  .number({ invalid_type_error: 'Problems solved must be a number.' })
  .int('Problems solved must be a whole number.')
  .min(0, 'Problems solved cannot be negative.');

const energyLevel = z.enum(ENERGY_LEVELS, {
  errorMap: () => ({ message: 'Energy level must be low, medium, or high.' }),
});

export const createDailyLogSchema = z
  .object({
    date: z.string().optional(),
    studyHours,
    summary: requiredText('Summary'),
    problemsSolved,
    revisionCompleted: z.boolean({ required_error: 'Revision completed is required.' }),
    biggestChallenge: requiredText('Biggest challenge'),
    nextDayGoal: requiredText('Next-day goal'),
    energyLevel: energyLevel.optional(),
  })
  .strict();

export const updateDailyLogSchema = z
  .object({
    studyHours: studyHours.optional(),
    summary: requiredText('Summary').optional(),
    problemsSolved: problemsSolved.optional(),
    revisionCompleted: z.boolean().optional(),
    biggestChallenge: requiredText('Biggest challenge').optional(),
    nextDayGoal: requiredText('Next-day goal').optional(),
    // `null` explicitly clears the optional energy level.
    energyLevel: energyLevel.nullable().optional(),
  })
  .strict();

export const listQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(DAILY_LOG_MAX_LIMIT)
    .default(DAILY_LOG_DEFAULT_LIMIT),
  cursor: z.string().optional(),
});

// --- Serialization ----------------------------------------------------------

/** Map a persisted document to the API DTO (dates as ISO strings). */
export function toDailyLogDTO(doc: DailyLogDoc): DailyLogDTO {
  return {
    id: String(doc._id),
    date: doc.date.toISOString(),
    studyHours: doc.studyHours,
    summary: doc.summary,
    problemsSolved: doc.problemsSolved,
    revisionCompleted: doc.revisionCompleted,
    biggestChallenge: doc.biggestChallenge,
    nextDayGoal: doc.nextDayGoal,
    ...(doc.energyLevel ? { energyLevel: doc.energyLevel as EnergyLevel } : {}),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input.';
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

// --- Operations -------------------------------------------------------------

/** Create a new entry for the resolved date. Never overwrites an existing day. */
export async function createDailyLog(input: unknown): Promise<DailyLogDTO> {
  const parsed = createDailyLogSchema.safeParse(input);
  if (!parsed.success) {
    throw new InvalidDailyLogError(firstIssue(parsed.error));
  }
  const { date, energyLevel: energy, ...rest } = parsed.data;
  const normalized = resolveCreateDate(date);

  await dbConnect();
  try {
    const doc = await DailyLog.create({
      date: normalized,
      ...(energy ? { energyLevel: energy } : {}),
      ...rest,
    });
    return toDailyLogDTO(doc);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new DuplicateDateError();
    }
    throw error;
  }
}

/** List entries newest-first with keyset pagination by date. */
export async function listDailyLogs(
  query: unknown,
): Promise<{ entries: DailyLogDTO[]; nextCursor: string | null }> {
  const parsed = listQuerySchema.safeParse(query);
  if (!parsed.success) {
    throw new InvalidDailyLogError(firstIssue(parsed.error));
  }
  const { limit, cursor } = parsed.data;

  let cursorDate: Date | undefined;
  if (cursor) {
    cursorDate = new Date(cursor);
    if (Number.isNaN(cursorDate.getTime())) {
      throw new InvalidDailyLogError('Invalid pagination cursor.');
    }
  }

  await dbConnect();
  const filter = cursorDate ? { date: { $lt: cursorDate } } : {};
  const docs = await DailyLog.find(filter)
    .sort({ date: -1 })
    .limit(limit + 1);

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;
  const nextCursor = hasMore ? page[page.length - 1].date.toISOString() : null;
  return { entries: page.map(toDailyLogDTO), nextCursor };
}

/** Fetch a single entry by id. */
export async function getDailyLog(id: string): Promise<DailyLogDTO> {
  if (!Types.ObjectId.isValid(id)) {
    throw new InvalidDailyLogError('Invalid entry id.');
  }
  await dbConnect();
  const doc = await DailyLog.findById(id);
  if (!doc) {
    throw new DailyLogNotFoundError();
  }
  return toDailyLogDTO(doc);
}

/** Update an existing entry in place. The date is immutable; other days are untouched. */
export async function updateDailyLog(id: string, patch: unknown): Promise<DailyLogDTO> {
  if (!Types.ObjectId.isValid(id)) {
    throw new InvalidDailyLogError('Invalid entry id.');
  }
  const parsed = updateDailyLogSchema.safeParse(patch);
  if (!parsed.success) {
    throw new InvalidDailyLogError(firstIssue(parsed.error));
  }
  if (Object.keys(parsed.data).length === 0) {
    throw new InvalidDailyLogError('No fields provided to update.');
  }

  const set: Record<string, unknown> = {};
  const unset: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (key === 'energyLevel' && value === null) {
      unset.energyLevel = '';
    } else {
      set[key] = value;
    }
  }
  const ops: Record<string, unknown> = {};
  if (Object.keys(set).length) ops.$set = set;
  if (Object.keys(unset).length) ops.$unset = unset;

  await dbConnect();
  const doc = await DailyLog.findByIdAndUpdate(id, ops, { new: true, runValidators: true });
  if (!doc) {
    throw new DailyLogNotFoundError();
  }
  return toDailyLogDTO(doc);
}
