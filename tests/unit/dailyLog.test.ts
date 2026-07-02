import { describe, it, expect } from 'vitest';
import {
  createDailyLogSchema,
  updateDailyLogSchema,
  normalizeDate,
  startOfTodayUTC,
  createDailyLog,
  InvalidDailyLogError,
} from '@/lib/dailyLog';

const validBody = {
  studyHours: 2.5,
  summary: 'Reviewed graph traversal',
  problemsSolved: 4,
  revisionCompleted: true,
  biggestChallenge: 'Cycle detection',
  nextDayGoal: 'Topological sort',
};

describe('date normalization & one-entry-per-day rule', () => {
  it('normalizes any time to midnight UTC of the same calendar day', () => {
    const a = normalizeDate(new Date('2026-06-29T23:59:00Z'));
    const b = normalizeDate(new Date('2026-06-29T00:01:00Z'));
    expect(a.toISOString()).toBe('2026-06-29T00:00:00.000Z');
    expect(a.getTime()).toBe(b.getTime());
  });

  it('maps two different calendar days to different normalized values', () => {
    const d1 = normalizeDate(new Date('2026-06-29T23:59:00Z'));
    const d2 = normalizeDate(new Date('2026-06-30T00:01:00Z'));
    expect(d1.getTime()).not.toBe(d2.getTime());
  });

  it('startOfTodayUTC has no time component', () => {
    const t = startOfTodayUTC();
    expect(t.getUTCHours()).toBe(0);
    expect(t.getUTCMinutes()).toBe(0);
  });
});

describe('createDailyLogSchema validation', () => {
  it('accepts a valid body without energy level', () => {
    expect(createDailyLogSchema.safeParse(validBody).success).toBe(true);
  });

  it('accepts zero hours and zero problems', () => {
    const parsed = createDailyLogSchema.safeParse({ ...validBody, studyHours: 0, problemsSolved: 0 });
    expect(parsed.success).toBe(true);
  });

  it('rejects negative study hours', () => {
    expect(createDailyLogSchema.safeParse({ ...validBody, studyHours: -1 }).success).toBe(false);
  });

  it('rejects study hours above 24', () => {
    expect(createDailyLogSchema.safeParse({ ...validBody, studyHours: 25 }).success).toBe(false);
  });

  it('rejects study hours with more than one decimal place', () => {
    expect(createDailyLogSchema.safeParse({ ...validBody, studyHours: 2.55 }).success).toBe(false);
  });

  it('rejects a negative or non-integer problems count', () => {
    expect(createDailyLogSchema.safeParse({ ...validBody, problemsSolved: -2 }).success).toBe(false);
    expect(createDailyLogSchema.safeParse({ ...validBody, problemsSolved: 1.5 }).success).toBe(false);
  });

  it('rejects blank required free-text fields', () => {
    expect(createDailyLogSchema.safeParse({ ...validBody, summary: '   ' }).success).toBe(false);
  });

  it('rejects an invalid energy level', () => {
    expect(createDailyLogSchema.safeParse({ ...validBody, energyLevel: 'extreme' }).success).toBe(false);
  });

  it('accepts each valid energy level', () => {
    for (const level of ['low', 'medium', 'high'] as const) {
      expect(createDailyLogSchema.safeParse({ ...validBody, energyLevel: level }).success).toBe(true);
    }
  });
});

describe('updateDailyLogSchema validation', () => {
  it('accepts a partial update', () => {
    expect(updateDailyLogSchema.safeParse({ studyHours: 3 }).success).toBe(true);
  });

  it('allows clearing the energy level with null', () => {
    expect(updateDailyLogSchema.safeParse({ energyLevel: null }).success).toBe(true);
  });

  it('rejects an attempt to change the immutable date', () => {
    expect(updateDailyLogSchema.safeParse({ date: '2020-01-01' }).success).toBe(false);
  });
});

describe('createDailyLog future-date guard (no DB required)', () => {
  it('rejects a future date before any persistence', async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await expect(createDailyLog({ ...validBody, date: future })).rejects.toBeInstanceOf(
      InvalidDailyLogError,
    );
  });

  it('rejects an invalid date string before any persistence', async () => {
    await expect(createDailyLog({ ...validBody, date: 'not-a-date' })).rejects.toBeInstanceOf(
      InvalidDailyLogError,
    );
  });
});
