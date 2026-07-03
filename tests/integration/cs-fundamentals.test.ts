import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { setupMongo, teardownMongo, clearCollections } from '../helpers/mongo';
import { POST, GET as LIST } from '@/app/api/cs-fundamentals/route';
import { GET as GET_ONE, PATCH, DELETE } from '@/app/api/cs-fundamentals/[id]/route';
import { GET as SUMMARY } from '@/app/api/cs-fundamentals/summary/route';
import { CsFundamentalConcept } from '@/models/CsFundamentalConcept';
import { User } from '@/models/User';
import { createSession, hashPassword } from '@/lib/auth';

let cookie: string;

beforeAll(async () => {
  await setupMongo();
  await CsFundamentalConcept.init();
});
afterAll(teardownMongo);

beforeEach(async () => {
  await clearCollections();
  const user = await User.create({
    username: 'owner',
    email: 'owner@example.com',
    passwordHash: hashPassword('correct horse'),
  });
  await CsFundamentalConcept.init();
  const { token } = await createSession(String(user._id));
  cookie = `pt_session=${token}`;
});

const validBody = {
  domain: 'DBMS',
  title: 'Normalization',
  subtopic: 'BCNF',
  tags: ['schema'],
  stage: 'revised',
  confidence: 3,
  notes: 'transitive deps',
  interviewQuestionRefs: ['Explain BCNF vs 3NF'],
};

function req(method: string, body?: unknown, url = 'http://localhost/api/cs-fundamentals', authed = true) {
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json', ...(authed ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function create(over: Record<string, unknown> = {}) {
  const res = await POST(req('POST', { ...validBody, ...over }));
  return (await res.json()).data.concept;
}

describe('POST /api/cs-fundamentals', () => {
  it('creates a concept (201)', async () => {
    const res = await POST(req('POST', validBody));
    expect(res.status).toBe(201);
    expect((await res.json()).data.concept.id).toBeTruthy();
    expect(await CsFundamentalConcept.countDocuments()).toBe(1);
  });

  it('rejects invalid input (400), persists nothing', async () => {
    const res = await POST(req('POST', { ...validBody, confidence: 9 }));
    expect(res.status).toBe(400);
    expect(await CsFundamentalConcept.countDocuments()).toBe(0);
  });

  it('returns 409 on a duplicate (domain+title+subtopic), original intact', async () => {
    await create({ title: 'Indexes', subtopic: 'B+Tree', confidence: 2 });
    const dup = await POST(req('POST', { ...validBody, title: 'Indexes', subtopic: 'B+Tree', confidence: 5 }));
    expect(dup.status).toBe(409);
    expect((await dup.json()).error.code).toBe('DUPLICATE_CONCEPT');
    const docs = await CsFundamentalConcept.find({ title: 'Indexes' });
    expect(docs).toHaveLength(1);
    expect(docs[0].confidence).toBe(2);
  });

  it('allows the same title under a different subtopic', async () => {
    await create({ title: 'Normalization', subtopic: '1NF' });
    const res = await POST(req('POST', { ...validBody, title: 'Normalization', subtopic: 'BCNF' }));
    expect(res.status).toBe(201);
  });

  it('requires authentication (401)', async () => {
    const res = await POST(req('POST', validBody, 'http://localhost/api/cs-fundamentals', false));
    expect(res.status).toBe(401);
  });
});

describe('GET /api/cs-fundamentals (list + filters)', () => {
  it('returns empty when none exist', async () => {
    const res = await LIST(req('GET'));
    expect((await res.json()).data.items).toEqual([]);
  });

  it('filters by domain, stage, confidence range, weakOnly; excludes archived', async () => {
    await create({ domain: 'DBMS', title: 'A', stage: 'learned', confidence: 1 });
    await create({ domain: 'OS', title: 'B', stage: 'interview_ready', confidence: 5 });
    await create({ domain: 'DBMS', title: 'C', stage: 'revised', confidence: 4 });

    expect((await (await LIST(req('GET', undefined, 'http://localhost/api/cs-fundamentals?domain=DBMS'))).json()).data.total).toBe(2);
    expect((await (await LIST(req('GET', undefined, 'http://localhost/api/cs-fundamentals?stage=interview_ready'))).json()).data.total).toBe(1);
    expect((await (await LIST(req('GET', undefined, 'http://localhost/api/cs-fundamentals?confidenceMin=4'))).json()).data.total).toBe(2);
    expect((await (await LIST(req('GET', undefined, 'http://localhost/api/cs-fundamentals?notInterviewReady=true'))).json()).data.total).toBe(2);
    expect((await (await LIST(req('GET', undefined, 'http://localhost/api/cs-fundamentals?weakOnly=true'))).json()).data.total).toBe(1);
  });

  it('rejects a bad filter (400)', async () => {
    const res = await LIST(req('GET', undefined, 'http://localhost/api/cs-fundamentals?domain=AI'));
    expect(res.status).toBe(400);
  });

  it('returns createdAt/updatedAt on GET [id] (FR-015)', async () => {
    const c = await create();
    const res = await GET_ONE(req('GET', undefined, `http://localhost/api/cs-fundamentals/${c.id}`), ctx(c.id));
    const body = await res.json();
    expect(body.data.concept.createdAt).toBeTruthy();
    expect(body.data.concept.updatedAt).toBeTruthy();
  });

  it('returns 404 for unknown id', async () => {
    const res = await GET_ONE(
      req('GET', undefined, 'http://localhost/api/cs-fundamentals/64b0c0000000000000000000'),
      ctx('64b0c0000000000000000000'),
    );
    expect(res.status).toBe(404);
  });

  it('requires authentication (401)', async () => {
    const res = await LIST(req('GET', undefined, 'http://localhost/api/cs-fundamentals', false));
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/cs-fundamentals/[id]', () => {
  it('updates stage in place (no new record), others untouched', async () => {
    const a = await create({ title: 'A', stage: 'learned' });
    const b = await create({ title: 'B' });
    const res = await PATCH(req('PATCH', { stage: 'interview_ready', confidence: 5 }, `http://localhost/api/cs-fundamentals/${a.id}`), ctx(a.id));
    expect(res.status).toBe(200);
    expect((await res.json()).data.concept.stage).toBe('interview_ready');
    expect(await CsFundamentalConcept.countDocuments()).toBe(2);
    expect((await CsFundamentalConcept.findById(b.id))?.title).toBe('B');
  });

  it('returns 409 when a rename collides with an existing concept', async () => {
    await create({ title: 'Deadlocks', subtopic: 'coffman' });
    const other = await create({ title: 'Semaphores', subtopic: 'binary' });
    const res = await PATCH(
      req('PATCH', { title: 'Deadlocks', subtopic: 'coffman' }, `http://localhost/api/cs-fundamentals/${other.id}`),
      ctx(other.id),
    );
    expect(res.status).toBe(409);
  });

  it('returns 404 for unknown id', async () => {
    const res = await PATCH(
      req('PATCH', { confidence: 4 }, 'http://localhost/api/cs-fundamentals/64b0c0000000000000000000'),
      ctx('64b0c0000000000000000000'),
    );
    expect(res.status).toBe(404);
  });

  it('requires authentication (401)', async () => {
    const res = await PATCH(
      req('PATCH', { confidence: 4 }, 'http://localhost/api/cs-fundamentals/x', false),
      ctx('64b0c0000000000000000000'),
    );
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/cs-fundamentals/[id] (archive)', () => {
  it('soft-archives: excluded from list + summary, but retained', async () => {
    const c = await create();
    const res = await DELETE(req('DELETE', undefined, `http://localhost/api/cs-fundamentals/${c.id}`), ctx(c.id));
    expect(res.status).toBe(200);
    expect((await res.json()).data.archived).toBe(true);

    expect((await (await LIST(req('GET'))).json()).data.total).toBe(0);
    expect((await (await SUMMARY(req('GET', undefined, 'http://localhost/api/cs-fundamentals/summary'))).json()).data.totalConcepts).toBe(0);
    // Retained (not destroyed).
    expect(await CsFundamentalConcept.findById(c.id)).not.toBeNull();
  });

  it('returns 404 for unknown id', async () => {
    const res = await DELETE(
      req('DELETE', undefined, 'http://localhost/api/cs-fundamentals/64b0c0000000000000000000'),
      ctx('64b0c0000000000000000000'),
    );
    expect(res.status).toBe(404);
  });

  it('requires authentication (401)', async () => {
    const res = await DELETE(
      req('DELETE', undefined, 'http://localhost/api/cs-fundamentals/x', false),
      ctx('64b0c0000000000000000000'),
    );
    expect(res.status).toBe(401);
  });
});

describe('GET /api/cs-fundamentals/summary', () => {
  it('computes counts, percentages, and weak list over non-archived concepts', async () => {
    await create({ domain: 'DBMS', title: 'A', stage: 'interview_ready', confidence: 5 });
    await create({ domain: 'DBMS', title: 'B', stage: 'learned', confidence: 1 });
    await create({ domain: 'OS', title: 'C', stage: 'interview_ready', confidence: 4 });

    const res = await SUMMARY(req('GET', undefined, 'http://localhost/api/cs-fundamentals/summary'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.totalConcepts).toBe(3);
    expect(body.data.countsByDomain.DBMS).toBe(2);
    expect(body.data.interviewReadyPercentageOverall).toBe(67);
    expect(body.data.weakConcepts[0].title).toBe('B');
  });

  it('requires authentication (401)', async () => {
    const res = await SUMMARY(req('GET', undefined, 'http://localhost/api/cs-fundamentals/summary', false));
    expect(res.status).toBe(401);
  });
});
