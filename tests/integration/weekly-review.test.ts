import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { setupMongo, teardownMongo, clearCollections } from '../helpers/mongo';
import { POST, GET as LIST } from '@/app/api/weekly-review/route';
import { GET as GET_ONE, PATCH } from '@/app/api/weekly-review/[id]/route';
import { GET as PREFILL } from '@/app/api/weekly-review/prefill/route';
import { WeeklyReview } from '@/models/WeeklyReview';
import { DailyLog } from '@/models/DailyLog';
import { DsaProblem } from '@/models/DsaProblem';
import { User } from '@/models/User';
import { createSession, hashPassword } from '@/lib/auth';
import { weekRange } from '@/lib/weeklyReview';

let cookie: string;

beforeAll(async () => {
  await setupMongo();
  await WeeklyReview.init();
});
afterAll(teardownMongo);

beforeEach(async () => {
  await clearCollections();
  const user = await User.create({
    username: 'owner',
    email: 'owner@example.com',
    passwordHash: hashPassword('correct horse'),
  });
  await WeeklyReview.init();
  const { token } = await createSession(String(user._id));
  cookie = `pt_session=${token}`;
});

const validBody = {
  weekNumber: 5,
  plannedWork: 'Finish graphs',
  completedWork: 'Graphs done',
  totalStudyHours: 18.5,
  problemsSolved: 16,
  dsaAccuracyPercent: 80,
  weakTopics: ['DP', 'Tries'],
  wins: 'First hard graph solved',
  nextWeekAdjustments: 'More DP',
};

function req(method: string, body?: unknown, url = 'http://localhost/api/weekly-review', authed = true) {
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json', ...(authed ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function create(over: Record<string, unknown> = {}) {
  const res = await POST(req('POST', { ...validBody, ...over }));
  return (await res.json()).data.review;
}

describe('POST /api/weekly-review', () => {
  it('creates a review and returns 201 with derived dates', async () => {
    const res = await POST(req('POST', validBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.review.weekNumber).toBe(5);
    expect(body.data.review.weekStartDate).toBe(weekRange(5).start.toISOString());
    expect(await WeeklyReview.countDocuments()).toBe(1);
  });

  it('rejects an invalid body with 400 and persists nothing', async () => {
    const res = await POST(req('POST', { ...validBody, weekNumber: 99 }));
    expect(res.status).toBe(400);
    expect(await WeeklyReview.countDocuments()).toBe(0);
  });

  it('returns 409 on a duplicate week and leaves the original intact', async () => {
    await create({ weekNumber: 7, wins: 'first' });
    const dup = await POST(req('POST', { ...validBody, weekNumber: 7, wins: 'second' }));
    expect(dup.status).toBe(409);
    expect((await dup.json()).error.code).toBe('DUPLICATE_WEEK');
    const docs = await WeeklyReview.find({ weekNumber: 7 });
    expect(docs).toHaveLength(1);
    expect(docs[0].wins).toBe('first');
  });

  it('requires authentication (401)', async () => {
    const res = await POST(req('POST', validBody, 'http://localhost/api/weekly-review', false));
    expect(res.status).toBe(401);
  });
});

describe('GET /api/weekly-review (list)', () => {
  it('returns an empty list when none exist', async () => {
    const res = await LIST(req('GET'));
    const body = await res.json();
    expect(body.data.items).toEqual([]);
    expect(body.data.total).toBe(0);
  });

  it('lists newest-week first', async () => {
    await create({ weekNumber: 3 });
    await create({ weekNumber: 8 });
    await create({ weekNumber: 5 });
    const res = await LIST(req('GET'));
    const weeks = (await res.json()).data.items.map((r: { weekNumber: number }) => r.weekNumber);
    expect(weeks).toEqual([8, 5, 3]);
  });

  it('paginates', async () => {
    for (const w of [1, 2, 3]) await create({ weekNumber: w });
    const p1 = await LIST(req('GET', undefined, 'http://localhost/api/weekly-review?limit=2&page=1'));
    expect((await p1.json()).data.items).toHaveLength(2);
    const p2 = await LIST(req('GET', undefined, 'http://localhost/api/weekly-review?limit=2&page=2'));
    expect((await p2.json()).data.items).toHaveLength(1);
  });

  it('requires authentication (401)', async () => {
    const res = await LIST(req('GET', undefined, 'http://localhost/api/weekly-review', false));
    expect(res.status).toBe(401);
  });
});

describe('GET /api/weekly-review/[id]', () => {
  it('returns the review with timestamps', async () => {
    const created = await create();
    const res = await GET_ONE(req('GET', undefined, `http://localhost/api/weekly-review/${created.id}`), ctx(created.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.review.createdAt).toBeTruthy();
  });

  it('returns 404 for unknown id', async () => {
    const res = await GET_ONE(
      req('GET', undefined, 'http://localhost/api/weekly-review/64b0c0000000000000000000'),
      ctx('64b0c0000000000000000000'),
    );
    expect(res.status).toBe(404);
  });

  it('requires authentication (401)', async () => {
    const res = await GET_ONE(
      req('GET', undefined, 'http://localhost/api/weekly-review/x', false),
      ctx('64b0c0000000000000000000'),
    );
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/weekly-review/[id]', () => {
  it('updates in place and leaves other reviews untouched', async () => {
    const a = await create({ weekNumber: 1, wins: 'A' });
    const b = await create({ weekNumber: 2, wins: 'B' });
    const res = await PATCH(
      req('PATCH', { wins: 'A-edited', totalStudyHours: 20 }, `http://localhost/api/weekly-review/${a.id}`),
      ctx(a.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.review.wins).toBe('A-edited');
    expect(body.data.review.totalStudyHours).toBe(20);
    const other = await WeeklyReview.findById(b.id);
    expect(other?.wins).toBe('B');
  });

  it('rejects an attempt to change the week number (400)', async () => {
    const created = await create();
    const res = await PATCH(
      req('PATCH', { weekNumber: 9 }, `http://localhost/api/weekly-review/${created.id}`),
      ctx(created.id),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown id', async () => {
    const res = await PATCH(
      req('PATCH', { wins: 'x' }, 'http://localhost/api/weekly-review/64b0c0000000000000000000'),
      ctx('64b0c0000000000000000000'),
    );
    expect(res.status).toBe(404);
  });

  it('requires authentication (401)', async () => {
    const res = await PATCH(
      req('PATCH', { wins: 'x' }, 'http://localhost/api/weekly-review/x', false),
      ctx('64b0c0000000000000000000'),
    );
    expect(res.status).toBe(401);
  });
});

describe('GET /api/weekly-review/prefill', () => {
  async function seedWeek5() {
    const { start } = weekRange(5);
    const inWeek = new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000); // a day inside week 5
    await DailyLog.create({
      date: inWeek,
      studyHours: 3,
      summary: 's',
      problemsSolved: 2,
      revisionCompleted: true,
      biggestChallenge: 'c',
      nextDayGoal: 'g',
    });
    await DailyLog.create({
      date: start,
      studyHours: 1.5,
      summary: 's',
      problemsSolved: 1,
      revisionCompleted: false,
      biggestChallenge: 'c',
      nextDayGoal: 'g',
    });
    await DsaProblem.create({
      title: 'P1',
      topic: 'DP',
      topicKey: 'dp',
      difficulty: 'hard',
      platform: 'LC',
      timeTakenMinutes: 40,
      attemptType: 'first_attempt',
      solvedWithoutHints: false,
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
      confidence: 2,
      needsRevision: true,
      interviewWorthy: true,
      solvedOn: inWeek,
    });
  }

  it('derives study hours and DSA counts from the week range', async () => {
    await seedWeek5();
    const res = await PREFILL(req('GET', undefined, 'http://localhost/api/weekly-review/prefill?weekNumber=5'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.suggestedTotalStudyHours).toBe(4.5);
    expect(body.data.suggestedDsaSolvedCount).toBe(1);
    expect(body.data.suggestedDsaAccuracyPercent).toBeNull();
    expect(body.data.suggestedWeakTopics).toContain('DP');
    expect(body.data.coverage.hasData).toBe(true);
  });

  it('returns zeros/empty with coverage note for a week with no data', async () => {
    const res = await PREFILL(req('GET', undefined, 'http://localhost/api/weekly-review/prefill?weekNumber=12'));
    const body = await res.json();
    expect(body.data.suggestedTotalStudyHours).toBe(0);
    expect(body.data.suggestedDsaSolvedCount).toBe(0);
    expect(body.data.coverage.hasData).toBe(false);
    expect(body.data.coverage.notes.length).toBeGreaterThan(0);
  });

  it('rejects an invalid week number (400)', async () => {
    const res = await PREFILL(req('GET', undefined, 'http://localhost/api/weekly-review/prefill?weekNumber=99'));
    expect(res.status).toBe(400);
  });

  it('requires authentication (401)', async () => {
    const res = await PREFILL(
      req('GET', undefined, 'http://localhost/api/weekly-review/prefill?weekNumber=5', false),
    );
    expect(res.status).toBe(401);
  });
});

describe('snapshot integrity (FR-016)', () => {
  it('does not change a saved review when the week\'s source data later changes', async () => {
    const created = await create({ weekNumber: 5, totalStudyHours: 10, problemsSolved: 4 });
    // Add source data for the same week after saving.
    const { start } = weekRange(5);
    await DailyLog.create({
      date: start,
      studyHours: 20,
      summary: 's',
      problemsSolved: 50,
      revisionCompleted: true,
      biggestChallenge: 'c',
      nextDayGoal: 'g',
    });
    const res = await GET_ONE(
      req('GET', undefined, `http://localhost/api/weekly-review/${created.id}`),
      ctx(created.id),
    );
    const body = await res.json();
    expect(body.data.review.totalStudyHours).toBe(10);
    expect(body.data.review.problemsSolved).toBe(4);
  });
});
