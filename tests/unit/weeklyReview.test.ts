import { describe, it, expect } from 'vitest';
import {
  createWeeklyReviewSchema,
  updateWeeklyReviewSchema,
  weekRange,
} from '@/lib/weeklyReview';

const validBody = {
  weekNumber: 5,
  plannedWork: 'Finish graphs',
  completedWork: 'Graphs done',
  totalStudyHours: 18.5,
  problemsSolved: 16,
  weakTopics: ['DP', 'Tries'],
  wins: 'First hard graph solved',
  nextWeekAdjustments: 'More DP',
};

describe('weekRange', () => {
  it('derives a 7-day Monday–Sunday UTC range from the week number', () => {
    // PREP_START_DATE = 2026-01-05 (Monday). Week 1 = Jan 5–11.
    const w1 = weekRange(1);
    expect(w1.start.toISOString()).toBe('2026-01-05T00:00:00.000Z');
    expect(w1.end.toISOString()).toBe('2026-01-11T00:00:00.000Z');
  });

  it('advances by 7 days per week number', () => {
    const w2 = weekRange(2);
    expect(w2.start.toISOString()).toBe('2026-01-12T00:00:00.000Z');
    expect(w2.end.toISOString()).toBe('2026-01-18T00:00:00.000Z');
  });
});

describe('createWeeklyReviewSchema validation', () => {
  it('accepts a valid body (accuracy + prefill flag optional)', () => {
    expect(createWeeklyReviewSchema.safeParse(validBody).success).toBe(true);
  });

  it('accepts an empty weakTopics array and zero totals', () => {
    const parsed = createWeeklyReviewSchema.safeParse({
      ...validBody,
      weakTopics: [],
      totalStudyHours: 0,
      problemsSolved: 0,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a week number outside 1–26', () => {
    expect(createWeeklyReviewSchema.safeParse({ ...validBody, weekNumber: 0 }).success).toBe(false);
    expect(createWeeklyReviewSchema.safeParse({ ...validBody, weekNumber: 27 }).success).toBe(false);
  });

  it('rejects negative study hours', () => {
    expect(createWeeklyReviewSchema.safeParse({ ...validBody, totalStudyHours: -1 }).success).toBe(
      false,
    );
  });

  it('rejects a success rate outside 0–100 when provided', () => {
    expect(createWeeklyReviewSchema.safeParse({ ...validBody, dsaAccuracyPercent: 101 }).success).toBe(
      false,
    );
  });

  it('rejects blank required text', () => {
    expect(createWeeklyReviewSchema.safeParse({ ...validBody, wins: '   ' }).success).toBe(false);
  });

  it('rejects unknown keys', () => {
    expect(createWeeklyReviewSchema.safeParse({ ...validBody, extra: 1 }).success).toBe(false);
  });
});

describe('updateWeeklyReviewSchema validation', () => {
  it('accepts a partial update', () => {
    expect(updateWeeklyReviewSchema.safeParse({ wins: 'Updated' }).success).toBe(true);
  });

  it('rejects an attempt to change the immutable week number', () => {
    expect(updateWeeklyReviewSchema.safeParse({ weekNumber: 6 }).success).toBe(false);
  });

  it('allows clearing accuracy with null', () => {
    expect(updateWeeklyReviewSchema.safeParse({ dsaAccuracyPercent: null }).success).toBe(true);
  });
});
