import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { setupMongo, teardownMongo, clearCollections } from '../helpers/mongo';
import { GET as SUMMARY } from '@/app/api/dashboard/summary/route';
import { DailyLog } from '@/models/DailyLog';
import { DsaProblem } from '@/models/DsaProblem';
import { WeeklyReview } from '@/models/WeeklyReview';
import { User } from '@/models/User';
import { createSession, hashPassword } from '@/lib/auth';
import { currentWeekNumber, weekRange } from '@/lib/weeklyReview';

const DAY = 24 * 60 * 60 * 1000;
let cookie: string;

beforeAll(setupMongo);
afterAll(teardownMongo);

beforeEach(async () => {
  await clearCollections();
  const user = await User.create({
    username: 'owner',
    email: 'owner@example.com',
    passwordHash: hashPassword('correct horse'),
  });
  const { token } = await createSession(String(user._id));
  cookie = `pt_session=${token}`;
});

function req(authed = true) {
  return new NextRequest('http://localhost/api/dashboard/summary', {
    headers: authed ? { cookie } : {},
  });
}

function todayUTC(): number {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
}

async function seedDailyLog(date: Date, studyHours: number) {
  await DailyLog.create({
    date,
    studyHours,
    summary: 's',
    problemsSolved: 0,
    revisionCompleted: false,
    biggestChallenge: 'c',
    nextDayGoal: 'g',
  });
}

async function seedDsa(solvedOn: Date) {
  await DsaProblem.create({
    title: 'P',
    topic: 'DP',
    topicKey: 'dp',
    difficulty: 'medium',
    platform: 'LC',
    timeTakenMinutes: 30,
    attemptType: 'first_attempt',
    solvedWithoutHints: true,
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    confidence: 3,
    needsRevision: false,
    interviewWorthy: true,
    solvedOn,
  });
}

describe('GET /api/dashboard/summary', () => {
  it('requires authentication (401)', async () => {
    const res = await SUMMARY(req(false));
    expect(res.status).toBe(401);
  });

  it('returns zero/empty state with no data', async () => {
    const res = await SUMMARY(req());
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.totalWeeks).toBe(26);
    expect(data.currentWeek).toBe(currentWeekNumber(new Date()));
    expect(data.totalHoursLogged).toBe(0);
    expect(data.currentStreakDays).toBe(0);
    expect(data.dsaTotalSolved).toBe(0);
    expect(data.dsaSolvedThisWeek).toBe(0);
    expect(data.weeklyGoals).toBeNull();
    expect(data.weeklyGoalsStatus).toBe('not_set');
  });

  it('computes hours, streak, DSA figures, and weekly goals from seeded data', async () => {
    const week = currentWeekNumber(new Date());
    const { start, end } = weekRange(week);

    // 3-day streak ending today, totalling 9.5 hours.
    await seedDailyLog(new Date(todayUTC()), 3);
    await seedDailyLog(new Date(todayUTC() - DAY), 4);
    await seedDailyLog(new Date(todayUTC() - 2 * DAY), 2.5);
    // A zero-hours day three days back does not extend the streak.
    await seedDailyLog(new Date(todayUTC() - 3 * DAY), 0);

    // Two DSA solved this week, plus one before the week window.
    await seedDsa(new Date(todayUTC()));
    await seedDsa(start);
    await seedDsa(new Date(start.getTime() - 5 * DAY));

    await WeeklyReview.create({
      weekNumber: week,
      weekStartDate: start,
      weekEndDate: end,
      plannedWork: 'Finish graphs',
      completedWork: 'x',
      totalStudyHours: 10,
      problemsSolved: 2,
      weakTopics: [],
      wins: 'w',
      nextWeekAdjustments: 'a',
    });

    const res = await SUMMARY(req());
    const { data } = await res.json();

    expect(data.currentWeek).toBe(week);
    expect(data.totalHoursLogged).toBe(9.5);
    expect(data.targetHours).toBe(936);
    expect(data.currentStreakDays).toBe(3);
    expect(data.dsaTotalSolved).toBe(3);
    expect(data.dsaSolvedThisWeek).toBe(2);
    expect(data.weeklyGoals).toBe('Finish graphs');
    expect(data.weeklyGoalsStatus).toBe('set');
    expect(data.lastUpdated).toBeTruthy();
  });

  it('reflects underlying data changes on the next request (fresh, no cache)', async () => {
    const first = await (await SUMMARY(req())).json();
    expect(first.data.totalHoursLogged).toBe(0);

    await seedDailyLog(new Date(todayUTC()), 5);

    const second = await (await SUMMARY(req())).json();
    expect(second.data.totalHoursLogged).toBe(5);
    expect(second.data.currentStreakDays).toBe(1);
  });
});
