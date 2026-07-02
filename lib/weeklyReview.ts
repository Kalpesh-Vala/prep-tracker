import { z } from 'zod';
import { Types } from 'mongoose';
import { dbConnect } from './db';
import {
  PREP_START_DATE,
  PREP_TOTAL_WEEKS,
  WEEKLY_REVIEW_TEXT_MAX_LEN,
  WEEKLY_REVIEW_TOPIC_MAX_LEN,
  WEEKLY_REVIEW_DEFAULT_LIMIT,
  WEEKLY_REVIEW_MAX_LIMIT,
} from './constants';
import { WeeklyReview, type WeeklyReviewDoc } from '@/models/WeeklyReview';
import { DailyLog } from '@/models/DailyLog';
import { DsaProblem } from '@/models/DsaProblem';
import { computeDsaSummary, type SummaryRecord } from './dsa';
import type { WeeklyReviewDTO, WeeklyPrefillDTO } from '@/types';

// --- Errors -----------------------------------------------------------------

export class InvalidWeeklyReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidWeeklyReviewError';
  }
}

export class WeeklyReviewNotFoundError extends Error {
  constructor() {
    super('Weekly review not found.');
    this.name = 'WeeklyReviewNotFoundError';
  }
}

export class DuplicateWeekError extends Error {
  constructor() {
    super('A review for this week already exists.');
    this.name = 'DuplicateWeekError';
  }
}

// --- Week boundary ----------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight UTC of the configured prep start date (week 1 anchor, a Monday). */
function prepStartUTC(): Date {
  const d = new Date(PREP_START_DATE);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Derive a week's Monday–Sunday date range (UTC midnight) from its number. */
export function weekRange(weekNumber: number): { start: Date; end: Date } {
  const start = new Date(prepStartUTC().getTime() + (weekNumber - 1) * 7 * DAY_MS);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  return { start, end };
}

function normalizeTopics(topics: string[] | undefined): string[] {
  return (topics ?? []).map((t) => t.trim()).filter((t) => t.length > 0);
}

// --- Zod schemas ------------------------------------------------------------

const requiredText = (label: string) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(WEEKLY_REVIEW_TEXT_MAX_LEN, `${label} is too long.`);

const weekNumber = z
  .number({ invalid_type_error: 'Week number must be a number.' })
  .int('Week number must be a whole number.')
  .min(1, 'Week number must be at least 1.')
  .max(PREP_TOTAL_WEEKS, `Week number must be at most ${PREP_TOTAL_WEEKS}.`);

const totalStudyHours = z
  .number({ invalid_type_error: 'Study hours must be a number.' })
  .min(0, 'Study hours cannot be negative.');

const problemsSolved = z
  .number({ invalid_type_error: 'Problems solved must be a number.' })
  .int('Problems solved must be a whole number.')
  .min(0, 'Problems solved cannot be negative.');

const dsaAccuracyPercent = z
  .number({ invalid_type_error: 'Accuracy must be a number.' })
  .min(0, 'Accuracy must be between 0 and 100.')
  .max(100, 'Accuracy must be between 0 and 100.');

const weakTopics = z.array(z.string().trim().max(WEEKLY_REVIEW_TOPIC_MAX_LEN)).default([]);

const baseFields = {
  plannedWork: requiredText('Planned work'),
  completedWork: requiredText('Completed work'),
  totalStudyHours,
  problemsSolved,
  dsaAccuracyPercent: dsaAccuracyPercent.optional(),
  weakTopics,
  wins: requiredText('Wins'),
  nextWeekAdjustments: requiredText('Next-week adjustments'),
  prefillSourceUsed: z.boolean().optional(),
};

export const createWeeklyReviewSchema = z.object({ weekNumber, ...baseFields }).strict();

export const updateWeeklyReviewSchema = z
  .object({
    plannedWork: requiredText('Planned work').optional(),
    completedWork: requiredText('Completed work').optional(),
    totalStudyHours: totalStudyHours.optional(),
    problemsSolved: problemsSolved.optional(),
    dsaAccuracyPercent: dsaAccuracyPercent.nullable().optional(),
    weakTopics: weakTopics.optional(),
    wins: requiredText('Wins').optional(),
    nextWeekAdjustments: requiredText('Next-week adjustments').optional(),
    prefillSourceUsed: z.boolean().optional(),
  })
  .strict();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(WEEKLY_REVIEW_MAX_LIMIT).default(WEEKLY_REVIEW_DEFAULT_LIMIT),
});

// --- Serialization ----------------------------------------------------------

export function toWeeklyReviewDTO(doc: WeeklyReviewDoc): WeeklyReviewDTO {
  return {
    id: String(doc._id),
    weekNumber: doc.weekNumber,
    weekStartDate: doc.weekStartDate.toISOString(),
    weekEndDate: doc.weekEndDate.toISOString(),
    plannedWork: doc.plannedWork,
    completedWork: doc.completedWork,
    totalStudyHours: doc.totalStudyHours,
    problemsSolved: doc.problemsSolved,
    ...(typeof doc.dsaAccuracyPercent === 'number'
      ? { dsaAccuracyPercent: doc.dsaAccuracyPercent }
      : {}),
    weakTopics: doc.weakTopics ?? [],
    wins: doc.wins,
    nextWeekAdjustments: doc.nextWeekAdjustments,
    ...(typeof doc.prefillSourceUsed === 'boolean'
      ? { prefillSourceUsed: doc.prefillSourceUsed }
      : {}),
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

/** Create a review for a week; derives dates from weekNumber. Never overwrites. */
export async function createWeeklyReview(input: unknown): Promise<WeeklyReviewDTO> {
  const parsed = createWeeklyReviewSchema.safeParse(input);
  if (!parsed.success) {
    throw new InvalidWeeklyReviewError(firstIssue(parsed.error));
  }
  const { weekNumber: n, weakTopics: topics, ...rest } = parsed.data;
  const { start, end } = weekRange(n);

  await dbConnect();
  try {
    const doc = await WeeklyReview.create({
      weekNumber: n,
      weekStartDate: start,
      weekEndDate: end,
      weakTopics: normalizeTopics(topics),
      ...rest,
    });
    return toWeeklyReviewDTO(doc);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new DuplicateWeekError();
    }
    throw error;
  }
}

/** List reviews newest-first with pagination. */
export async function listWeeklyReviews(query: unknown): Promise<{
  items: WeeklyReviewDTO[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}> {
  const parsed = listQuerySchema.safeParse(query);
  if (!parsed.success) {
    throw new InvalidWeeklyReviewError(firstIssue(parsed.error));
  }
  const { page, limit } = parsed.data;

  await dbConnect();
  const total = await WeeklyReview.countDocuments();
  const items = await WeeklyReview.find()
    .sort({ weekStartDate: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    items: items.map(toWeeklyReviewDTO),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/** Fetch a single review by id. */
export async function getWeeklyReview(id: string): Promise<WeeklyReviewDTO> {
  if (!Types.ObjectId.isValid(id)) {
    throw new InvalidWeeklyReviewError('Invalid review id.');
  }
  await dbConnect();
  const doc = await WeeklyReview.findById(id);
  if (!doc) {
    throw new WeeklyReviewNotFoundError();
  }
  return toWeeklyReviewDTO(doc);
}

/** Update a review in place. Week identity is immutable. */
export async function updateWeeklyReview(id: string, patch: unknown): Promise<WeeklyReviewDTO> {
  if (!Types.ObjectId.isValid(id)) {
    throw new InvalidWeeklyReviewError('Invalid review id.');
  }
  const parsed = updateWeeklyReviewSchema.safeParse(patch);
  if (!parsed.success) {
    throw new InvalidWeeklyReviewError(firstIssue(parsed.error));
  }
  if (Object.keys(parsed.data).length === 0) {
    throw new InvalidWeeklyReviewError('No fields provided to update.');
  }

  const set: Record<string, unknown> = {};
  const unset: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (key === 'dsaAccuracyPercent' && value === null) {
      unset.dsaAccuracyPercent = '';
    } else if (key === 'weakTopics') {
      set.weakTopics = normalizeTopics(value as string[]);
    } else {
      set[key] = value;
    }
  }
  const ops: Record<string, unknown> = {};
  if (Object.keys(set).length) ops.$set = set;
  if (Object.keys(unset).length) ops.$unset = unset;

  await dbConnect();
  const doc = await WeeklyReview.findByIdAndUpdate(id, ops, { new: true, runValidators: true });
  if (!doc) {
    throw new WeeklyReviewNotFoundError();
  }
  return toWeeklyReviewDTO(doc);
}

// --- Prefill (read-only; derives suggestions from Daily Log + DSA) ----------

/** Suggested totals for a week from existing data. Performs no writes. */
export async function getWeeklyPrefill(weekNumberInput: unknown): Promise<WeeklyPrefillDTO> {
  const parsedWeek = weekNumber.safeParse(
    typeof weekNumberInput === 'string' ? Number(weekNumberInput) : weekNumberInput,
  );
  if (!parsedWeek.success) {
    throw new InvalidWeeklyReviewError('A valid week number (1–26) is required.');
  }
  const n = parsedWeek.data;
  const { start, end } = weekRange(n);

  await dbConnect();
  const dailyLogs = await DailyLog.find(
    { date: { $gte: start, $lte: end } },
    { studyHours: 1 },
  );
  const dsaDocs = await DsaProblem.find(
    { solvedOn: { $gte: start, $lte: end } },
    { topic: 1, topicKey: 1, difficulty: 1, confidence: 1, needsRevision: 1, createdAt: 1 },
  );

  const studyHoursSum = dailyLogs.reduce((sum, d) => sum + d.studyHours, 0);
  const suggestedTotalStudyHours = Math.round(studyHoursSum * 10) / 10;

  const summaryRecords: SummaryRecord[] = dsaDocs.map((d) => ({
    topic: d.topic,
    topicKey: d.topicKey,
    difficulty: d.difficulty,
    confidence: d.confidence,
    needsRevision: d.needsRevision,
    createdAt: d.createdAt.getTime(),
  }));
  const suggestedWeakTopics = computeDsaSummary(summaryRecords).weakTopics.map((t) => t.topic);

  const notes = [
    'A DSA success rate is not derivable from stored data (only solved problems are recorded); enter it manually.',
  ];
  if (dailyLogs.length === 0 && dsaDocs.length === 0) {
    notes.push('No daily logs or DSA entries found for this week; suggestions are zero/empty.');
  }

  return {
    weekNumber: n,
    weekStartDate: start.toISOString(),
    weekEndDate: end.toISOString(),
    suggestedTotalStudyHours,
    suggestedDsaSolvedCount: dsaDocs.length,
    suggestedDsaAttemptCount: dsaDocs.length,
    suggestedDsaAccuracyPercent: null,
    suggestedWeakTopics,
    coverage: {
      dailyLogCount: dailyLogs.length,
      dsaCount: dsaDocs.length,
      hasData: dailyLogs.length > 0 || dsaDocs.length > 0,
      notes,
    },
  };
}
