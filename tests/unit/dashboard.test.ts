import { describe, it, expect } from 'vitest';
import { completionPercentage, hoursProgressPercentage, computeStreak } from '@/lib/dashboard';
import { currentWeekNumber } from '@/lib/weeklyReview';

const DAY = 24 * 60 * 60 * 1000;
const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);

describe('currentWeekNumber', () => {
  it('is week 1 on the prep start date and clamps below 1 before it', () => {
    // PREP_START_DATE = 2026-01-05 (Monday).
    expect(currentWeekNumber(new Date('2026-01-05T12:00:00Z'))).toBe(1);
    expect(currentWeekNumber(new Date('2025-12-01T00:00:00Z'))).toBe(1);
  });

  it('advances one week per 7 days', () => {
    expect(currentWeekNumber(new Date('2026-01-12T00:00:00Z'))).toBe(2);
    expect(currentWeekNumber(new Date('2026-01-19T00:00:00Z'))).toBe(3);
  });

  it('clamps to 26 after the program ends', () => {
    expect(currentWeekNumber(new Date('2030-01-01T00:00:00Z'))).toBe(26);
  });
});

describe('completionPercentage', () => {
  it('rounds week/26 to a whole number', () => {
    expect(completionPercentage(1)).toBe(4);
    expect(completionPercentage(13)).toBe(50);
    expect(completionPercentage(26)).toBe(100);
  });

  it('clamps to 0..100', () => {
    expect(completionPercentage(0)).toBe(0);
    expect(completionPercentage(30)).toBe(100);
  });
});

describe('hoursProgressPercentage', () => {
  it('rounds hours/936 to a whole number', () => {
    expect(hoursProgressPercentage(0)).toBe(0);
    expect(hoursProgressPercentage(468)).toBe(50);
    expect(hoursProgressPercentage(936)).toBe(100);
  });

  it('caps at 100 when over target', () => {
    expect(hoursProgressPercentage(1200)).toBe(100);
  });
});

describe('computeStreak', () => {
  const today = new Date('2026-03-10T09:00:00Z'); // fixed reference
  const t = (offsetDays: number) => utc(2026, 3, 10) - offsetDays * DAY;

  it('counts consecutive days ending today', () => {
    expect(computeStreak([t(0), t(1), t(2)], today)).toBe(3);
  });

  it('counts a streak ending yesterday when today has no log', () => {
    expect(computeStreak([t(1), t(2), t(3)], today)).toBe(3);
  });

  it('is 0 when the most recent qualifying day is two or more days ago', () => {
    expect(computeStreak([t(2), t(3)], today)).toBe(0);
  });

  it('stops at the first gap', () => {
    expect(computeStreak([t(0), t(1), t(3), t(4)], today)).toBe(2);
  });

  it('is 0 for an empty set', () => {
    expect(computeStreak([], today)).toBe(0);
  });

  it('ignores duplicate timestamps within the same day', () => {
    const sameDayTwice = [utc(2026, 3, 10) + 1_000, utc(2026, 3, 10) + 2_000, t(1)];
    expect(computeStreak(sameDayTwice, today)).toBe(2);
  });

  it('does not extend the streak using a future-dated day', () => {
    // A future day (tomorrow) plus today+yesterday → still counts from today.
    expect(computeStreak([t(-1), t(0), t(1)], today)).toBe(2);
  });
});
