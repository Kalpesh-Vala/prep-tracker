import { z } from 'zod';
import { Types } from 'mongoose';
import { dbConnect } from './db';
import {
  CS_DOMAINS,
  CS_STAGES,
  CS_STALE_DAYS,
  CS_WEAK_CONFIDENCE_WEIGHT,
  CS_TITLE_MAX_LEN,
  CS_TAG_MAX_LEN,
  CS_REF_MAX_LEN,
  CS_NOTES_MAX_LEN,
  CS_DEFAULT_LIMIT,
  CS_MAX_LIMIT,
} from './constants';
import { CsFundamentalConcept, type CsFundamentalConceptDoc } from '@/models/CsFundamentalConcept';
import type { CsConceptDTO, CsDomain, CsStage, CsSummaryDTO } from '@/types';

const DAY_MS = 24 * 60 * 60 * 1000;

// --- Errors -----------------------------------------------------------------

export class InvalidConceptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidConceptError';
  }
}

export class ConceptNotFoundError extends Error {
  constructor() {
    super('CS concept not found.');
    this.name = 'ConceptNotFoundError';
  }
}

export class DuplicateConceptError extends Error {
  constructor() {
    super('This concept already exists.');
    this.name = 'DuplicateConceptError';
  }
}

// --- Normalization ----------------------------------------------------------

const normalize = (s: string | undefined) => (s ?? '').trim().toLowerCase();

/** Concept identity key: domain + normalized title + normalized subtopic. */
export function conceptKey(domain: string, title: string, subtopic?: string): string {
  return `${domain}|${normalize(title)}|${normalize(subtopic)}`;
}

function normalizeList(items: string[] | undefined): string[] {
  return (items ?? []).map((s) => s.trim()).filter((s) => s.length > 0);
}

export function normalizeDate(input: Date): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

export function startOfTodayUTC(): Date {
  return normalizeDate(new Date());
}

/** Resolve/validate a last-revised date: defaults today, past allowed, future rejected. */
function resolveLastRevised(dateInput?: string): Date {
  const base = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(base.getTime())) {
    throw new InvalidConceptError('A valid last-revised date is required.');
  }
  const normalized = normalizeDate(base);
  if (normalized.getTime() > startOfTodayUTC().getTime()) {
    throw new InvalidConceptError('Last-revised date cannot be in the future.');
  }
  return normalized;
}

// --- Zod schemas ------------------------------------------------------------

const domain = z.enum(CS_DOMAINS, {
  errorMap: () => ({ message: 'Domain must be DBMS, OS, NETWORKS, or OOP.' }),
});
const stage = z.enum(CS_STAGES, {
  errorMap: () => ({ message: 'Stage must be learned, revised, can_explain, or interview_ready.' }),
});
const confidence = z
  .number({ invalid_type_error: 'Confidence must be a number.' })
  .int('Confidence must be a whole number.')
  .min(1, 'Confidence must be at least 1.')
  .max(5, 'Confidence must be at most 5.');
const title = z
  .string({ required_error: 'Title is required.' })
  .trim()
  .min(1, 'Title is required.')
  .max(CS_TITLE_MAX_LEN, 'Title is too long.');
const tags = z.array(z.string().trim().max(CS_TAG_MAX_LEN)).default([]);
const refs = z.array(z.string().trim().max(CS_REF_MAX_LEN)).default([]);

const baseFields = {
  subtopic: z.string().trim().max(CS_TITLE_MAX_LEN).optional(),
  tags,
  confidence,
  lastRevisedAt: z.string().optional(),
  notes: z.string().trim().max(CS_NOTES_MAX_LEN).optional(),
  interviewQuestionRefs: refs,
};

export const createConceptSchema = z
  .object({ domain, title, stage, ...baseFields })
  .strict();

export const updateConceptSchema = z
  .object({
    domain: domain.optional(),
    title: title.optional(),
    subtopic: z.string().trim().max(CS_TITLE_MAX_LEN).optional(),
    tags: tags.optional(),
    stage: stage.optional(),
    confidence: confidence.optional(),
    lastRevisedAt: z.string().optional(),
    notes: z.string().trim().max(CS_NOTES_MAX_LEN).optional(),
    interviewQuestionRefs: refs.optional(),
  })
  .strict();

export const csFilterSchema = z.object({
  domain: domain.optional(),
  stage: stage.optional(),
  confidenceMin: z.coerce.number().int().min(1).max(5).optional(),
  confidenceMax: z.coerce.number().int().min(1).max(5).optional(),
  interviewReady: z.enum(['true', 'false']).optional(),
  notInterviewReady: z.enum(['true', 'false']).optional(),
  weakOnly: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(CS_MAX_LIMIT).default(CS_DEFAULT_LIMIT),
});

// --- Serialization ----------------------------------------------------------

export function toCsConceptDTO(doc: CsFundamentalConceptDoc): CsConceptDTO {
  return {
    id: String(doc._id),
    domain: doc.domain as CsDomain,
    title: doc.title,
    ...(doc.subtopic ? { subtopic: doc.subtopic } : {}),
    tags: doc.tags ?? [],
    stage: doc.stage as CsStage,
    confidence: doc.confidence,
    lastRevisedAt: doc.lastRevisedAt.toISOString(),
    ...(doc.notes ? { notes: doc.notes } : {}),
    interviewQuestionRefs: doc.interviewQuestionRefs ?? [],
    isArchived: doc.isArchived ?? false,
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

// --- Weak-concept logic (pure) ----------------------------------------------

function daysSince(dateISO: string, now: Date): number {
  const then = normalizeDate(new Date(dateISO)).getTime();
  const today = normalizeDate(now).getTime();
  return Math.max(0, Math.floor((today - then) / DAY_MS));
}

/** A concept is weak if low-confidence (≤2) or stale (> CS_STALE_DAYS). */
export function isWeakConcept(c: CsConceptDTO, now: Date = new Date()): boolean {
  return c.confidence <= 2 || daysSince(c.lastRevisedAt, now) > CS_STALE_DAYS;
}

/** Combined weakness score; higher = weaker. Confidence dominates, staleness orders within. */
export function weaknessScore(c: CsConceptDTO, now: Date = new Date()): number {
  return (5 - c.confidence) * CS_WEAK_CONFIDENCE_WEIGHT + daysSince(c.lastRevisedAt, now);
}

// --- Summary (pure) ---------------------------------------------------------

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Compute insights from a set of (non-archived) concepts. Exposed for unit tests. */
export function computeCsSummary(concepts: CsConceptDTO[], now: Date = new Date()): CsSummaryDTO {
  const countsByDomain: Record<CsDomain, number> = { DBMS: 0, OS: 0, NETWORKS: 0, OOP: 0 };
  const readyByDomain: Record<CsDomain, number> = { DBMS: 0, OS: 0, NETWORKS: 0, OOP: 0 };
  const countsByStage: Record<CsStage, number> = {
    learned: 0,
    revised: 0,
    can_explain: 0,
    interview_ready: 0,
  };

  for (const c of concepts) {
    countsByDomain[c.domain] += 1;
    countsByStage[c.stage] += 1;
    if (c.stage === 'interview_ready') readyByDomain[c.domain] += 1;
  }

  const totalReady = countsByStage.interview_ready;
  const interviewReadyPercentageByDomain = {
    DBMS: pct(readyByDomain.DBMS, countsByDomain.DBMS),
    OS: pct(readyByDomain.OS, countsByDomain.OS),
    NETWORKS: pct(readyByDomain.NETWORKS, countsByDomain.NETWORKS),
    OOP: pct(readyByDomain.OOP, countsByDomain.OOP),
  };

  const weakConcepts = concepts
    .filter((c) => isWeakConcept(c, now))
    .sort(
      (a, b) =>
        weaknessScore(b, now) - weaknessScore(a, now) ||
        a.domain.localeCompare(b.domain) ||
        a.title.localeCompare(b.title),
    );

  return {
    totalConcepts: concepts.length,
    countsByDomain,
    countsByStage,
    interviewReadyPercentageOverall: pct(totalReady, concepts.length),
    interviewReadyPercentageByDomain,
    weakConcepts,
  };
}

// --- Operations -------------------------------------------------------------

/** Create a concept. Never overwrites; duplicate identity → DuplicateConceptError. */
export async function createConcept(input: unknown): Promise<CsConceptDTO> {
  const parsed = createConceptSchema.safeParse(input);
  if (!parsed.success) {
    throw new InvalidConceptError(firstIssue(parsed.error));
  }
  const { lastRevisedAt, tags: t, interviewQuestionRefs: refList, subtopic, ...rest } = parsed.data;
  const resolved = resolveLastRevised(lastRevisedAt);
  const trimmedSubtopic = subtopic?.trim();

  await dbConnect();
  try {
    const doc = await CsFundamentalConcept.create({
      ...rest,
      ...(trimmedSubtopic ? { subtopic: trimmedSubtopic } : {}),
      conceptKey: conceptKey(rest.domain, rest.title, trimmedSubtopic),
      tags: normalizeList(t),
      interviewQuestionRefs: normalizeList(refList),
      lastRevisedAt: resolved,
    });
    return toCsConceptDTO(doc);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new DuplicateConceptError();
    throw error;
  }
}

/** List non-archived concepts with AND-combined filters and pagination. */
export async function listConcepts(query: unknown): Promise<{
  items: CsConceptDTO[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}> {
  const parsed = csFilterSchema.safeParse(query);
  if (!parsed.success) {
    throw new InvalidConceptError(firstIssue(parsed.error));
  }
  const f = parsed.data;

  const filter: Record<string, unknown> = { isArchived: { $ne: true } };
  if (f.domain) filter.domain = f.domain;
  if (f.stage) filter.stage = f.stage;
  if (f.confidenceMin !== undefined || f.confidenceMax !== undefined) {
    filter.confidence = {
      ...(f.confidenceMin !== undefined ? { $gte: f.confidenceMin } : {}),
      ...(f.confidenceMax !== undefined ? { $lte: f.confidenceMax } : {}),
    };
  }
  if (f.interviewReady === 'true') filter.stage = 'interview_ready';
  if (f.notInterviewReady === 'true') filter.stage = { $ne: 'interview_ready' };
  if (f.weakOnly === 'true') {
    const staleThreshold = new Date(startOfTodayUTC().getTime() - CS_STALE_DAYS * DAY_MS);
    filter.$or = [{ confidence: { $lte: 2 } }, { lastRevisedAt: { $lt: staleThreshold } }];
  }

  await dbConnect();
  const total = await CsFundamentalConcept.countDocuments(filter);
  const items = await CsFundamentalConcept.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip((f.page - 1) * f.limit)
    .limit(f.limit);

  return {
    items: items.map(toCsConceptDTO),
    page: f.page,
    limit: f.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / f.limit)),
  };
}

/** Fetch a single concept by id. */
export async function getConcept(id: string): Promise<CsConceptDTO> {
  if (!Types.ObjectId.isValid(id)) {
    throw new InvalidConceptError('Invalid concept id.');
  }
  await dbConnect();
  const doc = await CsFundamentalConcept.findById(id);
  if (!doc) throw new ConceptNotFoundError();
  return toCsConceptDTO(doc);
}

/** Update a concept in place; recomputes conceptKey if identity changes. */
export async function updateConcept(id: string, patch: unknown): Promise<CsConceptDTO> {
  if (!Types.ObjectId.isValid(id)) {
    throw new InvalidConceptError('Invalid concept id.');
  }
  const parsed = updateConceptSchema.safeParse(patch);
  if (!parsed.success) {
    throw new InvalidConceptError(firstIssue(parsed.error));
  }
  if (Object.keys(parsed.data).length === 0) {
    throw new InvalidConceptError('No fields provided to update.');
  }

  await dbConnect();
  const doc = await CsFundamentalConcept.findById(id);
  if (!doc) throw new ConceptNotFoundError();

  const data = parsed.data;
  const update: Record<string, unknown> = { ...data };
  if (data.tags) update.tags = normalizeList(data.tags);
  if (data.interviewQuestionRefs) update.interviewQuestionRefs = normalizeList(data.interviewQuestionRefs);
  if (data.lastRevisedAt) update.lastRevisedAt = resolveLastRevised(data.lastRevisedAt);

  const identityChanged =
    data.domain !== undefined || data.title !== undefined || data.subtopic !== undefined;
  if (identityChanged) {
    const d = data.domain ?? doc.domain;
    const t = data.title ?? doc.title;
    const s = data.subtopic !== undefined ? data.subtopic : doc.subtopic ?? undefined;
    update.conceptKey = conceptKey(d, t, s ?? undefined);
  }

  try {
    const updated = await CsFundamentalConcept.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true },
    );
    if (!updated) throw new ConceptNotFoundError();
    return toCsConceptDTO(updated);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new DuplicateConceptError();
    throw error;
  }
}

/** Soft-delete (archive) a concept. Data is retained. */
export async function archiveConcept(id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) {
    throw new InvalidConceptError('Invalid concept id.');
  }
  await dbConnect();
  const doc = await CsFundamentalConcept.findByIdAndUpdate(id, { $set: { isArchived: true } });
  if (!doc) throw new ConceptNotFoundError();
}

/** Compute insights over non-archived concepts. */
export async function getCsSummary(now: Date = new Date()): Promise<CsSummaryDTO> {
  await dbConnect();
  const docs = await CsFundamentalConcept.find({ isArchived: { $ne: true } });
  return computeCsSummary(docs.map(toCsConceptDTO), now);
}
