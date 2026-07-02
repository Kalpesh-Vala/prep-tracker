import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { setupMongo, teardownMongo, clearCollections } from '../helpers/mongo';
import { POST, GET as LIST } from '@/app/api/daily-log/route';
import { GET as GET_ONE, PATCH } from '@/app/api/daily-log/[id]/route';
import { DailyLog } from '@/models/DailyLog';
import { User } from '@/models/User';
import { createSession, hashPassword } from '@/lib/auth';

let cookie: string;

beforeAll(async () => {
  await setupMongo();
  // Ensure the unique index on `date` is built before duplicate tests run.
  await DailyLog.init();
});
afterAll(teardownMongo);

beforeEach(async () => {
  await clearCollections();
  const user = await User.create({
    username: 'owner',
    email: 'owner@example.com',
    passwordHash: hashPassword('correct horse'),
  });
  await DailyLog.init();
  const { token } = await createSession(String(user._id));
  cookie = `pt_session=${token}`;
});

const validBody = {
  studyHours: 2.5,
  summary: 'Reviewed graph traversal',
  problemsSolved: 4,
  revisionCompleted: true,
  biggestChallenge: 'Cycle detection',
  nextDayGoal: 'Topological sort',
  energyLevel: 'high',
};

function req(method: string, body?: unknown, url = 'http://localhost/api/daily-log', authed = true) {
  return new NextRequest(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(authed ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe('POST /api/daily-log', () => {
  it('creates today\'s entry and returns 201 with the entry', async () => {
    const res = await POST(req('POST', validBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.entry.id).toBeTruthy();
    expect(body.data.entry.studyHours).toBe(2.5);
    expect(body.data.entry.energyLevel).toBe('high');
    expect(await DailyLog.countDocuments()).toBe(1);
  });

  it('rejects an invalid body with 400 and persists nothing', async () => {
    const res = await POST(req('POST', { ...validBody, studyHours: -3 }));
    expect(res.status).toBe(400);
    expect(await DailyLog.countDocuments()).toBe(0);
  });

  it('accepts a backfilled past date', async () => {
    const res = await POST(req('POST', { ...validBody, date: '2026-06-20' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.entry.date).toBe('2026-06-20T00:00:00.000Z');
  });

  it('returns 409 on a duplicate date and leaves the original intact', async () => {
    await POST(req('POST', { ...validBody, date: '2026-06-21', summary: 'first' }));
    const dup = await POST(req('POST', { ...validBody, date: '2026-06-21', summary: 'second' }));
    expect(dup.status).toBe(409);
    const body = await dup.json();
    expect(body.error.code).toBe('DUPLICATE_DATE');
    const docs = await DailyLog.find({});
    expect(docs).toHaveLength(1);
    expect(docs[0].summary).toBe('first');
  });

  it('requires authentication (401)', async () => {
    const res = await POST(req('POST', validBody, 'http://localhost/api/daily-log', false));
    expect(res.status).toBe(401);
  });
});

describe('GET /api/daily-log (list)', () => {
  it('returns an empty array when no entries exist', async () => {
    const res = await LIST(req('GET'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.entries).toEqual([]);
    expect(body.data.nextCursor).toBeNull();
  });

  it('returns entries reverse-chronologically, each once', async () => {
    for (const d of ['2026-06-18', '2026-06-20', '2026-06-19']) {
      await POST(req('POST', { ...validBody, date: d }));
    }
    const res = await LIST(req('GET'));
    const body = await res.json();
    const dates = body.data.entries.map((e: { date: string }) => e.date.slice(0, 10));
    expect(dates).toEqual(['2026-06-20', '2026-06-19', '2026-06-18']);
  });

  it('paginates with limit and cursor', async () => {
    for (const d of ['2026-06-18', '2026-06-19', '2026-06-20']) {
      await POST(req('POST', { ...validBody, date: d }));
    }
    const first = await LIST(req('GET', undefined, 'http://localhost/api/daily-log?limit=2'));
    const firstBody = await first.json();
    expect(firstBody.data.entries).toHaveLength(2);
    expect(firstBody.data.nextCursor).toBeTruthy();

    const second = await LIST(
      req('GET', undefined, `http://localhost/api/daily-log?limit=2&cursor=${firstBody.data.nextCursor}`),
    );
    const secondBody = await second.json();
    expect(secondBody.data.entries).toHaveLength(1);
    expect(secondBody.data.entries[0].date.slice(0, 10)).toBe('2026-06-18');
  });

  it('requires authentication (401)', async () => {
    const res = await LIST(req('GET', undefined, 'http://localhost/api/daily-log', false));
    expect(res.status).toBe(401);
  });
});

describe('GET /api/daily-log/[id]', () => {
  it('returns the full entry including timestamps', async () => {
    const created = await (await POST(req('POST', validBody))).json();
    const id = created.data.entry.id;
    const res = await GET_ONE(req('GET', undefined, `http://localhost/api/daily-log/${id}`), ctx(id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.entry.createdAt).toBeTruthy();
    expect(body.data.entry.updatedAt).toBeTruthy();
  });

  it('omits energy level when it was not recorded', async () => {
    const { energyLevel: _omit, ...noEnergy } = validBody;
    const created = await (await POST(req('POST', noEnergy))).json();
    const id = created.data.entry.id;
    const res = await GET_ONE(req('GET', undefined, `http://localhost/api/daily-log/${id}`), ctx(id));
    const body = await res.json();
    expect(body.data.entry.energyLevel).toBeUndefined();
  });

  it('returns 404 for an unknown id', async () => {
    const res = await GET_ONE(
      req('GET', undefined, 'http://localhost/api/daily-log/64b0c0000000000000000000'),
      ctx('64b0c0000000000000000000'),
    );
    expect(res.status).toBe(404);
  });

  it('requires authentication (401)', async () => {
    const res = await GET_ONE(
      req('GET', undefined, 'http://localhost/api/daily-log/x', false),
      ctx('64b0c0000000000000000000'),
    );
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/daily-log/[id]', () => {
  it('updates in place; updatedAt advances while date and createdAt are unchanged', async () => {
    const created = await (await POST(req('POST', { ...validBody, date: '2026-06-15' }))).json();
    const { id, date, createdAt } = created.data.entry;
    await new Promise((r) => setTimeout(r, 5));
    const res = await PATCH(
      req('PATCH', { studyHours: 8, summary: 'updated' }, `http://localhost/api/daily-log/${id}`),
      ctx(id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.entry.studyHours).toBe(8);
    expect(body.data.entry.summary).toBe('updated');
    expect(body.data.entry.date).toBe(date);
    expect(body.data.entry.createdAt).toBe(createdAt);
    expect(new Date(body.data.entry.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(createdAt).getTime(),
    );
  });

  it('does not affect any other day\'s entry', async () => {
    const a = await (await POST(req('POST', { ...validBody, date: '2026-06-10', summary: 'A' }))).json();
    const b = await (await POST(req('POST', { ...validBody, date: '2026-06-11', summary: 'B' }))).json();
    await PATCH(
      req('PATCH', { summary: 'A-edited' }, `http://localhost/api/daily-log/${a.data.entry.id}`),
      ctx(a.data.entry.id),
    );
    const untouched = await DailyLog.findById(b.data.entry.id);
    expect(untouched?.summary).toBe('B');
  });

  it('clears the energy level when sent null', async () => {
    const created = await (await POST(req('POST', validBody))).json();
    const id = created.data.entry.id;
    const res = await PATCH(
      req('PATCH', { energyLevel: null }, `http://localhost/api/daily-log/${id}`),
      ctx(id),
    );
    const body = await res.json();
    expect(body.data.entry.energyLevel).toBeUndefined();
  });

  it('rejects an invalid value with 400', async () => {
    const created = await (await POST(req('POST', validBody))).json();
    const id = created.data.entry.id;
    const res = await PATCH(
      req('PATCH', { studyHours: -1 }, `http://localhost/api/daily-log/${id}`),
      ctx(id),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await PATCH(
      req('PATCH', { summary: 'x' }, 'http://localhost/api/daily-log/64b0c0000000000000000000'),
      ctx('64b0c0000000000000000000'),
    );
    expect(res.status).toBe(404);
  });

  it('requires authentication (401)', async () => {
    const res = await PATCH(
      req('PATCH', { summary: 'x' }, 'http://localhost/api/daily-log/x', false),
      ctx('64b0c0000000000000000000'),
    );
    expect(res.status).toBe(401);
  });
});
