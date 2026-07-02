import { z } from 'zod';
import { Types } from 'mongoose';
import { dbConnect } from './db';
import {
  DIFFICULTIES,
  ATTEMPT_TYPES,
  CONFIDENCE_MIN,
  CONFIDENCE_MAX,
  DSA_TITLE_MAX_LEN,
  DSA_TEXT_MAX_LEN,
  DSA_COMPLEXITY_MAX_LEN,
  DSA_TIME_TAKEN_MAX,
  DSA_DEFAULT_LIMIT,
  DSA_MAX_LIMIT,
  WEAK_TOPICS_COUNT,
} from './constants';
import { DsaProblem, type DsaProblemDoc } from '@/models/DsaProblem';
import type { DsaProblemDTO, DsaSummaryDTO } from '@/types';

// --- Errors -----------------------------------------------------------------

/** Raised when input fails validation; `message` is safe to show the user. */
export class InvalidDsaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDsaError';
  }
}

/** Raised when no problem matches the requested id. */
export class DsaNotFoundError extends Error {
  constructor() {
    super('DSA problem not found.');
    this.name = 'DsaNotFoundError';
  }
}

// --- Normalization helpers --------------------------------------------------

/** Normalized grouping/filter key for a topic (trimmed + lowercased). */
export function normalizeTopicKey(topic: string): string {
  return topic.trim().toLowerCase();
}

/** Normalize any Date to midnight UTC of its calendar day. */
export function normalizeDate(input: Date): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

/** Midnight UTC of the current calendar day. */
export function startOfTodayUTC(): Date {
  return normalizeDate(new Date());
}

/** Resolve/validate a solved-on date: defaults to today, past allowed, future rejected. */
function resolveSolvedOn(dateInput?: string): Date {
  const base = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(base.getTime())) {
    throw new InvalidDsaError('A valid solved-on date is required.');
  }
  const normalized = normalizeDate(base);
  if (normalized.getTime() > startOfTodayUTC().getTime()) {
    throw new InvalidDsaError('Cannot log a problem solved on a future date.');
  }
  return normalized;
}

// --- Zod schemas ------------------------------------------------------------

const requiredText = (label: string, max: number) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be at most ${max} characters.`);

const difficulty = z.enum(DIFFICULTIES, {
  errorMap: () => ({ message: 'Difficulty must be easy, medium, or hard.' }),
});
const attemptType = z.enum(ATTEMPT_TYPES, {
  errorMap: () => ({ message: 'Attempt type must be first_attempt or revisit.' }),
});
const confidence = z
  .number({ invalid_type_error: 'Confidence must be a number.' })
  .int('Confidence must be a whole number.')
  .min(CONFIDENCE_MIN, `Confidence must be at least ${CONFIDENCE_MIN}.`)
  .max(CONFIDENCE_MAX, `Confidence must be at most ${CONFIDENCE_MAX}.`);
const timeTakenMinutes = z
  .number({ invalid_type_error: 'Time taken must be a number.' })
  .int('Time taken must be whole minutes.')
  .min(1, 'Time taken must be greater than zero.')
  .max(DSA_TIME_TAKEN_MAX, 'Time taken is implausibly large.');

const baseFields = {
  title: requiredText('Title', DSA_TITLE_MAX_LEN),
  topic: requiredText('Topic', DSA_TEXT_MAX_LEN),
  subtopic: z.string().trim().max(DSA_TEXT_MAX_LEN).optional(),
  difficulty,
  platform: requiredText('Platform', DSA_TEXT_MAX_LEN),
  timeTakenMinutes,
  attemptType,
  solvedWithoutHints: z.boolean({ required_error: 'Solved-without-hints is required.' }),
  timeComplexity: requiredText('Time complexity', DSA_COMPLEXITY_MAX_LEN),
  spaceComplexity: requiredText('Space complexity', DSA_COMPLEXITY_MAX_LEN),
  confidence,
  needsRevision: z.boolean({ required_error: 'Needs-revision is required.' }),
  interviewWorthy: z.boolean({ required_error: 'Interview-worthy is required.' }),
};

export const createDsaSchema = z
  .object({ ...baseFields, solvedOn: z.string().optional() })
  .strict();

export const updateDsaSchema = z
  .object({
    title: baseFields.title.optional(),
    topic: baseFields.topic.optional(),
    subtopic: z.string().trim().max(DSA_TEXT_MAX_LEN).optional(),
    difficulty: difficulty.optional(),
    platform: baseFields.platform.optional(),
    timeTakenMinutes: timeTakenMinutes.optional(),
    attemptType: attemptType.optional(),
    solvedWithoutHints: z.boolean().optional(),
    timeComplexity: baseFields.timeComplexity.optional(),
    spaceComplexity: baseFields.spaceComplexity.optional(),
    confidence: confidence.optional(),
    needsRevision: z.boolean().optional(),
    interviewWorthy: z.boolean().optional(),
    solvedOn: z.string().optional(),
  })
  .strict();

export const dsaFilterSchema = z.object({
  topic: z.string().trim().min(1).optional(),
  difficulty: difficulty.optional(),
  needsRevision: z.enum(['true', 'false']).optional(),
  interviewWorthy: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(DSA_MAX_LIMIT).default(DSA_DEFAULT_LIMIT),
});

// --- Serialization ----------------------------------------------------------

/** Map a persisted document to the API DTO (dates as ISO strings, topicKey omitted). */
export function toDsaProblemDTO(doc: DsaProblemDoc): DsaProblemDTO {
  return {
    id: String(doc._id),
    title: doc.title,
    topic: doc.topic,
    ...(doc.subtopic ? { subtopic: doc.subtopic } : {}),
    difficulty: doc.difficulty as DsaProblemDTO['difficulty'],
    platform: doc.platform,
    timeTakenMinutes: doc.timeTakenMinutes,
    attemptType: doc.attemptType as DsaProblemDTO['attemptType'],
    solvedWithoutHints: doc.solvedWithoutHints,
    timeComplexity: doc.timeComplexity,
    spaceComplexity: doc.spaceComplexity,
    confidence: doc.confidence,
    needsRevision: doc.needsRevision,
    interviewWorthy: doc.interviewWorthy,
    solvedOn: doc.solvedOn.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input.';
}

// --- Operations -------------------------------------------------------------

/** Create a new problem record. */
export async function createDsaProblem(input: unknown): Promise<DsaProblemDTO> {
  const parsed = createDsaSchema.safeParse(input);
  if (!parsed.success) {
    throw new InvalidDsaError(firstIssue(parsed.error));
  }
  const { solvedOn, topic, ...rest } = parsed.data;
  const normalizedSolvedOn = resolveSolvedOn(solvedOn);

  await dbConnect();
  const doc = await DsaProblem.create({
    ...rest,
    topic,
    topicKey: normalizeTopicKey(topic),
    solvedOn: normalizedSolvedOn,
  });
  return toDsaProblemDTO(doc);
}

/** List problems newest-first with AND-combined filters and pagination. */
export async function listDsaProblems(query: unknown): Promise<{
  items: DsaProblemDTO[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}> {
  const parsed = dsaFilterSchema.safeParse(query);
  if (!parsed.success) {
    throw new InvalidDsaError(firstIssue(parsed.error));
  }
  const { topic, difficulty: diff, needsRevision, interviewWorthy, page, limit } = parsed.data;

  const filter: Record<string, unknown> = {};
  if (topic) filter.topicKey = normalizeTopicKey(topic);
  if (diff) filter.difficulty = diff;
  if (needsRevision) filter.needsRevision = needsRevision === 'true';
  if (interviewWorthy) filter.interviewWorthy = interviewWorthy === 'true';

  await dbConnect();
  const total = await DsaProblem.countDocuments(filter);
  const items = await DsaProblem.find(filter)
    .sort({ solvedOn: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    items: items.map(toDsaProblemDTO),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/** Fetch a single problem by id. */
export async function getDsaProblem(id: string): Promise<DsaProblemDTO> {
  if (!Types.ObjectId.isValid(id)) {
    throw new InvalidDsaError('Invalid problem id.');
  }
  await dbConnect();
  const doc = await DsaProblem.findById(id);
  if (!doc) {
    throw new DsaNotFoundError();
  }
  return toDsaProblemDTO(doc);
}

/** Update a problem in place; recomputes topicKey when the topic changes. */
export async function updateDsaProblem(id: string, patch: unknown): Promise<DsaProblemDTO> {
  if (!Types.ObjectId.isValid(id)) {
    throw new InvalidDsaError('Invalid problem id.');
  }
  const parsed = updateDsaSchema.safeParse(patch);
  if (!parsed.success) {
    throw new InvalidDsaError(firstIssue(parsed.error));
  }
  if (Object.keys(parsed.data).length === 0) {
    throw new InvalidDsaError('No fields provided to update.');
  }

  const update: Record<string, unknown> = { ...parsed.data };
  if (typeof parsed.data.topic === 'string') {
    update.topicKey = normalizeTopicKey(parsed.data.topic);
  }
  if (typeof parsed.data.solvedOn === 'string') {
    update.solvedOn = resolveSolvedOn(parsed.data.solvedOn);
  }

  await dbConnect();
  const doc = await DsaProblem.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true },
  );
  if (!doc) {
    throw new DsaNotFoundError();
  }
  return toDsaProblemDTO(doc);
}

/** Permanently delete a problem by id. */
export async function deleteDsaProblem(id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) {
    throw new InvalidDsaError('Invalid problem id.');
  }
  await dbConnect();
  const doc = await DsaProblem.findByIdAndDelete(id);
  if (!doc) {
    throw new DsaNotFoundError();
  }
}

// --- Summary (computed over all records) ------------------------------------

interface TopicAccumulator {
  label: string;
  labelAt: number;
  count: number;
  confidenceSum: number;
  needsRevisionCount: number;
}

/** Minimal record shape needed to compute the summary. */
export interface SummaryRecord {
  topic: string;
  topicKey: string;
  difficulty: string;
  confidence: number;
  needsRevision: boolean;
  createdAt: number;
}

/**
 * Pure computation of global insights from a set of records. Weak topics are
 * ranked by average confidence ascending, ties broken by needs-revision count
 * descending, then topic name ascending (deterministic). Exposed for unit tests.
 */
export function computeDsaSummary(records: SummaryRecord[]): DsaSummaryDTO {
  const countsByDifficulty = { easy: 0, medium: 0, hard: 0 };
  const byTopic = new Map<string, TopicAccumulator>();

  for (const rec of records) {
    if (rec.difficulty in countsByDifficulty) {
      countsByDifficulty[rec.difficulty as keyof typeof countsByDifficulty] += 1;
    }

    const acc = byTopic.get(rec.topicKey);
    if (!acc) {
      byTopic.set(rec.topicKey, {
        label: rec.topic,
        labelAt: rec.createdAt,
        count: 1,
        confidenceSum: rec.confidence,
        needsRevisionCount: rec.needsRevision ? 1 : 0,
      });
    } else {
      acc.count += 1;
      acc.confidenceSum += rec.confidence;
      acc.needsRevisionCount += rec.needsRevision ? 1 : 0;
      // Display label uses the most recently saved record's casing.
      if (rec.createdAt >= acc.labelAt) {
        acc.label = rec.topic;
        acc.labelAt = rec.createdAt;
      }
    }
  }

  const topics = [...byTopic.values()];

  const countsByTopic = topics
    .map((t) => ({ topic: t.label, count: t.count }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));

  const weakTopics = topics
    .map((t) => ({
      topic: t.label,
      averageConfidence: t.confidenceSum / t.count,
      needsRevisionCount: t.needsRevisionCount,
    }))
    .sort(
      (a, b) =>
        a.averageConfidence - b.averageConfidence ||
        b.needsRevisionCount - a.needsRevisionCount ||
        a.topic.localeCompare(b.topic),
    )
    .slice(0, WEAK_TOPICS_COUNT);

  return {
    totalSolved: records.length,
    countsByTopic,
    countsByDifficulty,
    weakTopics,
  };
}

/** Compute global insights: totals, per-topic/difficulty counts, weakest topics. */
export async function getDsaSummary(): Promise<DsaSummaryDTO> {
  await dbConnect();
  const docs = await DsaProblem.find(
    {},
    { topic: 1, topicKey: 1, difficulty: 1, confidence: 1, needsRevision: 1, createdAt: 1 },
  );

  return computeDsaSummary(
    docs.map((doc) => ({
      topic: doc.topic,
      topicKey: doc.topicKey,
      difficulty: doc.difficulty,
      confidence: doc.confidence,
      needsRevision: doc.needsRevision,
      createdAt: doc.createdAt.getTime(),
    })),
  );
}
