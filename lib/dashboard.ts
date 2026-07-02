import { dbConnect } from './db';
import { DailyLog } from '@/models/DailyLog';
import { DsaProblem } from '@/models/DsaProblem';
import { WeeklyReview } from '@/models/WeeklyReview';
import { currentWeekNumber, weekRange } from './weeklyReview';
import { PREP_TOTAL_WEEKS, STUDY_HOURS_TARGET } from './constants';
import type { DashboardSummaryDTO } from '@/types';

const DAY_MS = 24 * 60 * 60 * 1000;

// --- Pure formulas (deterministic, unit-tested) -----------------------------

/** Elapsed program time as a whole-number percentage, clamped 0..100. */
export function completionPercentage(currentWeek: number, totalWeeks = PREP_TOTAL_WEEKS): number {
  if (totalWeeks <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((currentWeek / totalWeeks) * 100)));
}

/** Study hours as a whole-number percentage of the target, capped at 100. */
export function hoursProgressPercentage(totalHours: number, target = STUDY_HOURS_TARGET): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((totalHours / target) * 100)));
}

function startOfUTCDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Count consecutive UTC calendar days that have a qualifying daily log,
 * ending today or yesterday. Returns 0 when neither today nor yesterday
 * qualifies. `qualifyingDayTimestamps` are the dates of logs with study
 * hours > 0 (any time within the day is normalized to that day).
 */
export function computeStreak(qualifyingDayTimestamps: number[], today: Date = new Date()): number {
  const days = new Set(qualifyingDayTimestamps.map((t) => startOfUTCDay(new Date(t))));
  const todayStart = startOfUTCDay(today);
  const yesterdayStart = todayStart - DAY_MS;

  let cursor: number;
  if (days.has(todayStart)) {
    cursor = todayStart;
  } else if (days.has(yesterdayStart)) {
    cursor = yesterdayStart;
  } else {
    return 0;
  }

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

// --- Aggregation ------------------------------------------------------------

/** Compute the dashboard summary from current data. Read-only; no writes. */
export async function getDashboardSummary(now: Date = new Date()): Promise<DashboardSummaryDTO> {
  await dbConnect();

  const currentWeek = currentWeekNumber(now);
  const { start, end } = weekRange(currentWeek);

  // One pass over daily logs serves both total hours and the streak.
  const dailyLogs = await DailyLog.find({}, { date: 1, studyHours: 1 });
  let hoursSum = 0;
  const qualifyingDays: number[] = [];
  for (const log of dailyLogs) {
    hoursSum += log.studyHours;
    if (log.studyHours > 0) {
      qualifyingDays.push(log.date.getTime());
    }
  }
  const totalHoursLogged = Math.round(hoursSum * 10) / 10;

  const [dsaTotalSolved, dsaSolvedThisWeek, weekly] = await Promise.all([
    DsaProblem.countDocuments({}),
    DsaProblem.countDocuments({ solvedOn: { $gte: start, $lte: end } }),
    WeeklyReview.findOne({ weekNumber: currentWeek }, { plannedWork: 1 }),
  ]);

  const weeklyGoals = weekly?.plannedWork ?? null;

  return {
    currentWeek,
    totalWeeks: PREP_TOTAL_WEEKS,
    completionPercentage: completionPercentage(currentWeek),
    totalHoursLogged,
    targetHours: STUDY_HOURS_TARGET,
    hoursProgressPercentage: hoursProgressPercentage(totalHoursLogged),
    currentStreakDays: computeStreak(qualifyingDays, now),
    dsaTotalSolved,
    dsaSolvedThisWeek,
    weeklyGoals,
    weeklyGoalsStatus: weeklyGoals ? 'set' : 'not_set',
    lastUpdated: new Date().toISOString(),
  };
}
