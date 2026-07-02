import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { setupMongo, teardownMongo, clearCollections } from '../helpers/mongo';
import { POST, GET as LIST } from '@/app/api/dsa/route';
import { GET as GET_ONE, PATCH, DELETE } from '@/app/api/dsa/[id]/route';
import { GET as SUMMARY } from '@/app/api/dsa/summary/route';
import { DsaProblem } from '@/models/DsaProblem';
import { User } from '@/models/User';
import { createSession, hashPassword } from '@/lib/auth';

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

const validBody = {
  title: 'Course Schedule',
  topic: 'Graphs',
  subtopic: 'Topological Sort',
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

function req(method: string, body?: unknown, url = 'http://localhost/api/dsa', authed = true) {
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json', ...(authed ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function create(over: Record<string, unknown> = {}) {
  const res = await POST(req('POST', { ...validBody, ...over }));
  return (await res.json()).data.problem;
}

describe('POST /api/dsa', () => {
  it('creates a problem and returns 201', async () => {
    const res = await POST(req('POST', validBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.problem.id).toBeTruthy();
    expect(body.data.problem.topic).toBe('Graphs');
    expect(await DsaProblem.countDocuments()).toBe(1);
  });

  it('rejects an invalid body with 400 and persists nothing', async () => {
    const res = await POST(req('POST', { ...validBody, confidence: 9 }));
    expect(res.status).toBe(400);
    expect(await DsaProblem.countDocuments()).toBe(0);
  });

  it('requires authentication (401)', async () => {
    const res = await POST(req('POST', validBody, 'http://localhost/api/dsa', false));
    expect(res.status).toBe(401);
  });
});

describe('GET /api/dsa (list + filters)', () => {
  it('returns an empty list when none exist', async () => {
    const res = await LIST(req('GET'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.items).toEqual([]);
    expect(body.data.total).toBe(0);
  });

  it('lists newest-first by solvedOn', async () => {
    await create({ solvedOn: '2026-06-10', title: 'A' });
    await create({ solvedOn: '2026-06-12', title: 'B' });
    await create({ solvedOn: '2026-06-11', title: 'C' });
    const res = await LIST(req('GET'));
    const body = await res.json();
    expect(body.data.items.map((p: { title: string }) => p.title)).toEqual(['B', 'C', 'A']);
  });

  it('filters by difficulty and combines filters (AND)', async () => {
    await create({ difficulty: 'easy', topic: 'Arrays', needsRevision: false });
    await create({ difficulty: 'medium', topic: 'Graphs', needsRevision: true });
    await create({ difficulty: 'medium', topic: 'Graphs', needsRevision: false });

    const byDiff = await LIST(req('GET', undefined, 'http://localhost/api/dsa?difficulty=medium'));
    expect((await byDiff.json()).data.total).toBe(2);

    const combined = await LIST(
      req('GET', undefined, 'http://localhost/api/dsa?difficulty=medium&needsRevision=true'),
    );
    expect((await combined.json()).data.total).toBe(1);
  });

  it('filters by topic case-insensitively (normalized)', async () => {
    await create({ topic: 'Dynamic Programming' });
    const res = await LIST(
      req('GET', undefined, 'http://localhost/api/dsa?topic=dynamic%20programming'),
    );
    expect((await res.json()).data.total).toBe(1);
  });

  it('paginates', async () => {
    for (let i = 0; i < 3; i++) await create({ solvedOn: `2026-06-1${i}` });
    const p1 = await LIST(req('GET', undefined, 'http://localhost/api/dsa?limit=2&page=1'));
    const p1body = await p1.json();
    expect(p1body.data.items).toHaveLength(2);
    expect(p1body.data.totalPages).toBe(2);
    const p2 = await LIST(req('GET', undefined, 'http://localhost/api/dsa?limit=2&page=2'));
    expect((await p2.json()).data.items).toHaveLength(1);
  });

  it('rejects a bad filter with 400', async () => {
    const res = await LIST(req('GET', undefined, 'http://localhost/api/dsa?difficulty=nope'));
    expect(res.status).toBe(400);
  });

  it('requires authentication (401)', async () => {
    const res = await LIST(req('GET', undefined, 'http://localhost/api/dsa', false));
    expect(res.status).toBe(401);
  });
});

describe('GET /api/dsa/[id]', () => {
  it('returns the problem with timestamps', async () => {
    const created = await create();
    const res = await GET_ONE(req('GET', undefined, `http://localhost/api/dsa/${created.id}`), ctx(created.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.problem.createdAt).toBeTruthy();
    expect(body.data.problem.updatedAt).toBeTruthy();
  });

  it('returns 404 for unknown id', async () => {
    const res = await GET_ONE(
      req('GET', undefined, 'http://localhost/api/dsa/64b0c0000000000000000000'),
      ctx('64b0c0000000000000000000'),
    );
    expect(res.status).toBe(404);
  });

  it('requires authentication (401)', async () => {
    const res = await GET_ONE(
      req('GET', undefined, 'http://localhost/api/dsa/x', false),
      ctx('64b0c0000000000000000000'),
    );
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/dsa/[id]', () => {
  it('updates in place and leaves other records untouched', async () => {
    const a = await create({ title: 'A' });
    const b = await create({ title: 'B' });
    const res = await PATCH(
      req('PATCH', { needsRevision: false, confidence: 5 }, `http://localhost/api/dsa/${a.id}`),
      ctx(a.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.problem.needsRevision).toBe(false);
    expect(body.data.problem.confidence).toBe(5);
    const other = await DsaProblem.findById(b.id);
    expect(other?.title).toBe('B');
  });

  it('recomputes topicKey when topic changes', async () => {
    const created = await create({ topic: 'Graphs' });
    await PATCH(req('PATCH', { topic: 'TREES' }, `http://localhost/api/dsa/${created.id}`), ctx(created.id));
    const doc = await DsaProblem.findById(created.id);
    expect(doc?.topicKey).toBe('trees');
  });

  it('rejects invalid values with 400', async () => {
    const created = await create();
    const res = await PATCH(
      req('PATCH', { difficulty: 'nope' }, `http://localhost/api/dsa/${created.id}`),
      ctx(created.id),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown id', async () => {
    const res = await PATCH(
      req('PATCH', { confidence: 4 }, 'http://localhost/api/dsa/64b0c0000000000000000000'),
      ctx('64b0c0000000000000000000'),
    );
    expect(res.status).toBe(404);
  });

  it('requires authentication (401)', async () => {
    const res = await PATCH(
      req('PATCH', { confidence: 4 }, 'http://localhost/api/dsa/x', false),
      ctx('64b0c0000000000000000000'),
    );
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/dsa/[id]', () => {
  it('deletes the record and leaves others untouched', async () => {
    const a = await create({ title: 'A' });
    const b = await create({ title: 'B' });
    const res = await DELETE(req('DELETE', undefined, `http://localhost/api/dsa/${a.id}`), ctx(a.id));
    expect(res.status).toBe(200);
    expect((await res.json()).data.deleted).toBe(true);
    expect(await DsaProblem.findById(a.id)).toBeNull();
    expect(await DsaProblem.findById(b.id)).not.toBeNull();
  });

  it('returns 404 for unknown id', async () => {
    const res = await DELETE(
      req('DELETE', undefined, 'http://localhost/api/dsa/64b0c0000000000000000000'),
      ctx('64b0c0000000000000000000'),
    );
    expect(res.status).toBe(404);
  });

  it('requires authentication (401)', async () => {
    const res = await DELETE(
      req('DELETE', undefined, 'http://localhost/api/dsa/x', false),
      ctx('64b0c0000000000000000000'),
    );
    expect(res.status).toBe(401);
  });
});

describe('GET /api/dsa/summary', () => {
  it('computes totals, counts, and weak topics over all records', async () => {
    await create({ topic: 'Graphs', difficulty: 'easy', confidence: 5, needsRevision: false });
    await create({ topic: 'DP', difficulty: 'hard', confidence: 2, needsRevision: true });
    await create({ topic: 'DP', difficulty: 'medium', confidence: 2, needsRevision: true });

    const res = await SUMMARY(req('GET', undefined, 'http://localhost/api/dsa/summary'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.totalSolved).toBe(3);
    expect(body.data.countsByDifficulty).toEqual({ easy: 1, medium: 1, hard: 1 });
    expect(body.data.weakTopics[0].topic).toBe('DP');
  });

  it('requires authentication (401)', async () => {
    const res = await SUMMARY(req('GET', undefined, 'http://localhost/api/dsa/summary', false));
    expect(res.status).toBe(401);
  });
});
