import { describe, it, expect } from 'vitest';
import {
  createDsaSchema,
  updateDsaSchema,
  dsaFilterSchema,
  normalizeTopicKey,
  normalizeDate,
  createDsaProblem,
  computeDsaSummary,
  type SummaryRecord,
  InvalidDsaError,
} from '@/lib/dsa';

const validBody = {
  title: 'Course Schedule',
  topic: 'Graphs',
  difficulty: 'medium',
  platform: 'LeetCode',
  timeTakenMinutes: 35,
  attemptType: 'first_attempt',
  solvedWithoutHints: false,
  timeComplexity: 'O(V + E)',
  spaceComplexity: 'O(V + E)',
  confidence: 3,
  needsRevision: true,
  interviewWorthy: true,
};

describe('topic normalization', () => {
  it('trims and lowercases the topic key', () => {
    expect(normalizeTopicKey('  Trees ')).toBe('trees');
    expect(normalizeTopicKey('trees')).toBe(normalizeTopicKey('TREES'));
  });

  it('normalizes dates to midnight UTC', () => {
    const d = normalizeDate(new Date('2026-07-01T23:30:00Z'));
    expect(d.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });
});

describe('createDsaSchema validation', () => {
  it('accepts a valid body without subtopic/solvedOn', () => {
    expect(createDsaSchema.safeParse(validBody).success).toBe(true);
  });

  it('rejects an unknown difficulty', () => {
    expect(createDsaSchema.safeParse({ ...validBody, difficulty: 'insane' }).success).toBe(false);
  });

  it('rejects an unknown attempt type', () => {
    expect(createDsaSchema.safeParse({ ...validBody, attemptType: 'third' }).success).toBe(false);
  });

  it('rejects confidence outside 1..5', () => {
    expect(createDsaSchema.safeParse({ ...validBody, confidence: 0 }).success).toBe(false);
    expect(createDsaSchema.safeParse({ ...validBody, confidence: 6 }).success).toBe(false);
    expect(createDsaSchema.safeParse({ ...validBody, confidence: 3.5 }).success).toBe(false);
  });

  it('rejects non-positive or non-integer time taken', () => {
    expect(createDsaSchema.safeParse({ ...validBody, timeTakenMinutes: 0 }).success).toBe(false);
    expect(createDsaSchema.safeParse({ ...validBody, timeTakenMinutes: -5 }).success).toBe(false);
    expect(createDsaSchema.safeParse({ ...validBody, timeTakenMinutes: 1.5 }).success).toBe(false);
  });

  it('rejects blank required text', () => {
    expect(createDsaSchema.safeParse({ ...validBody, title: '  ' }).success).toBe(false);
    expect(createDsaSchema.safeParse({ ...validBody, timeComplexity: '' }).success).toBe(false);
  });

  it('rejects unknown keys', () => {
    expect(createDsaSchema.safeParse({ ...validBody, hacker: true }).success).toBe(false);
  });
});

describe('updateDsaSchema validation', () => {
  it('accepts a partial update', () => {
    expect(updateDsaSchema.safeParse({ confidence: 5 }).success).toBe(true);
  });

  it('rejects an invalid enum in a partial update', () => {
    expect(updateDsaSchema.safeParse({ difficulty: 'nope' }).success).toBe(false);
  });
});

describe('dsaFilterSchema', () => {
  it('applies safe defaults for pagination', () => {
    const parsed = dsaFilterSchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBeGreaterThan(0);
  });

  it('coerces boolean filter strings', () => {
    const parsed = dsaFilterSchema.parse({ needsRevision: 'true', interviewWorthy: 'false' });
    expect(parsed.needsRevision).toBe('true');
    expect(parsed.interviewWorthy).toBe('false');
  });

  it('rejects a bad difficulty filter', () => {
    expect(dsaFilterSchema.safeParse({ difficulty: 'x' }).success).toBe(false);
  });
});

describe('createDsaProblem future-date guard (no DB required)', () => {
  it('rejects a future solvedOn before any persistence', async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await expect(createDsaProblem({ ...validBody, solvedOn: future })).rejects.toBeInstanceOf(
      InvalidDsaError,
    );
  });

  it('rejects an invalid payload before any persistence', async () => {
    await expect(createDsaProblem({ ...validBody, confidence: 99 })).rejects.toBeInstanceOf(
      InvalidDsaError,
    );
  });
});

describe('computeDsaSummary (weak-topic ranking)', () => {
  const rec = (over: Partial<SummaryRecord>): SummaryRecord => ({
    topic: 'Graphs',
    topicKey: 'graphs',
    difficulty: 'medium',
    confidence: 3,
    needsRevision: false,
    createdAt: 1,
    ...over,
  });

  it('counts totals, per-topic, and per-difficulty', () => {
    const s = computeDsaSummary([
      rec({ topic: 'Graphs', topicKey: 'graphs', difficulty: 'easy' }),
      rec({ topic: 'DP', topicKey: 'dp', difficulty: 'hard' }),
      rec({ topic: 'DP', topicKey: 'dp', difficulty: 'medium' }),
    ]);
    expect(s.totalSolved).toBe(3);
    expect(s.countsByDifficulty).toEqual({ easy: 1, medium: 1, hard: 1 });
    expect(s.countsByTopic).toEqual([
      { topic: 'DP', count: 2 },
      { topic: 'Graphs', count: 1 },
    ]);
  });

  it('ranks weakest by lowest average confidence first', () => {
    const s = computeDsaSummary([
      rec({ topicKey: 'graphs', topic: 'Graphs', confidence: 5 }),
      rec({ topicKey: 'dp', topic: 'DP', confidence: 2 }),
      rec({ topicKey: 'arrays', topic: 'Arrays', confidence: 4 }),
    ]);
    expect(s.weakTopics.map((t) => t.topic)).toEqual(['DP', 'Arrays', 'Graphs']);
  });

  it('breaks confidence ties by higher needs-revision count, then topic name', () => {
    const s = computeDsaSummary([
      rec({ topicKey: 'dp', topic: 'DP', confidence: 3, needsRevision: false }),
      rec({ topicKey: 'trees', topic: 'Trees', confidence: 3, needsRevision: true }),
      rec({ topicKey: 'bfs', topic: 'BFS', confidence: 3, needsRevision: false }),
    ]);
    // Trees (1 needs-revision) first; then BFS vs DP tie → alphabetical.
    expect(s.weakTopics.map((t) => t.topic)).toEqual(['Trees', 'BFS', 'DP']);
  });

  it('uses the most recently saved casing as the display label', () => {
    const s = computeDsaSummary([
      rec({ topicKey: 'trees', topic: 'trees', createdAt: 1 }),
      rec({ topicKey: 'trees', topic: 'Trees', createdAt: 2 }),
    ]);
    expect(s.countsByTopic).toEqual([{ topic: 'Trees', count: 2 }]);
  });

  it('returns zeros for an empty set', () => {
    const s = computeDsaSummary([]);
    expect(s.totalSolved).toBe(0);
    expect(s.countsByTopic).toEqual([]);
    expect(s.weakTopics).toEqual([]);
  });
});
