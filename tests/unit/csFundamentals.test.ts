import { describe, it, expect } from 'vitest';
import {
  createConceptSchema,
  updateConceptSchema,
  csFilterSchema,
  conceptKey,
  computeCsSummary,
  isWeakConcept,
  weaknessScore,
} from '@/lib/csFundamentals';
import type { CsConceptDTO } from '@/types';

const validBody = {
  domain: 'DBMS',
  title: 'Normalization',
  subtopic: 'BCNF',
  stage: 'revised',
  confidence: 3,
};

describe('conceptKey', () => {
  it('normalizes domain + title + subtopic (case-insensitive, trimmed)', () => {
    expect(conceptKey('DBMS', ' Normalization ', ' BCNF ')).toBe('DBMS|normalization|bcnf');
    expect(conceptKey('DBMS', 'normalization', 'bcnf')).toBe(conceptKey('DBMS', 'NORMALIZATION', 'BCNF'));
  });

  it('distinguishes the same title under different subtopics', () => {
    expect(conceptKey('DBMS', 'Normalization', '1NF')).not.toBe(
      conceptKey('DBMS', 'Normalization', 'BCNF'),
    );
  });
});

describe('createConceptSchema validation', () => {
  it('accepts a valid body', () => {
    expect(createConceptSchema.safeParse(validBody).success).toBe(true);
  });

  it('rejects an unknown domain or stage', () => {
    expect(createConceptSchema.safeParse({ ...validBody, domain: 'AI' }).success).toBe(false);
    expect(createConceptSchema.safeParse({ ...validBody, stage: 'mastered' }).success).toBe(false);
  });

  it('rejects confidence outside 1..5', () => {
    expect(createConceptSchema.safeParse({ ...validBody, confidence: 0 }).success).toBe(false);
    expect(createConceptSchema.safeParse({ ...validBody, confidence: 6 }).success).toBe(false);
  });

  it('rejects a blank title and unknown keys', () => {
    expect(createConceptSchema.safeParse({ ...validBody, title: '  ' }).success).toBe(false);
    expect(createConceptSchema.safeParse({ ...validBody, hack: 1 }).success).toBe(false);
  });
});

describe('updateConceptSchema validation', () => {
  it('accepts a partial update', () => {
    expect(updateConceptSchema.safeParse({ stage: 'interview_ready' }).success).toBe(true);
  });

  it('rejects an invalid enum in a partial update', () => {
    expect(updateConceptSchema.safeParse({ stage: 'nope' }).success).toBe(false);
  });
});

describe('csFilterSchema', () => {
  it('defaults pagination and coerces filters', () => {
    const parsed = csFilterSchema.parse({ confidenceMin: '2', weakOnly: 'true' });
    expect(parsed.page).toBe(1);
    expect(parsed.confidenceMin).toBe(2);
    expect(parsed.weakOnly).toBe('true');
  });
});

// --- weak logic + summary ---------------------------------------------------

const now = new Date('2026-07-03T00:00:00Z');
const daysAgo = (n: number) => new Date(Date.UTC(2026, 6, 3) - n * 86_400_000).toISOString();

function concept(over: Partial<CsConceptDTO>): CsConceptDTO {
  return {
    id: Math.random().toString(36).slice(2),
    domain: 'DBMS',
    title: 'C',
    tags: [],
    stage: 'revised',
    confidence: 3,
    lastRevisedAt: daysAgo(1),
    interviewQuestionRefs: [],
    isArchived: false,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    ...over,
  };
}

describe('isWeakConcept', () => {
  it('is weak when confidence <= 2', () => {
    expect(isWeakConcept(concept({ confidence: 2, lastRevisedAt: daysAgo(0) }), now)).toBe(true);
  });

  it('is weak when stale beyond 14 days', () => {
    expect(isWeakConcept(concept({ confidence: 5, lastRevisedAt: daysAgo(20) }), now)).toBe(true);
  });

  it('is not weak when confident and recently revised', () => {
    expect(isWeakConcept(concept({ confidence: 4, lastRevisedAt: daysAgo(3) }), now)).toBe(false);
  });
});

describe('weaknessScore ordering', () => {
  it('ranks lower confidence as weaker (confidence dominates)', () => {
    const low = concept({ confidence: 1, lastRevisedAt: daysAgo(0) });
    const stale = concept({ confidence: 4, lastRevisedAt: daysAgo(60) });
    expect(weaknessScore(low, now)).toBeGreaterThan(weaknessScore(stale, now));
  });
});

describe('computeCsSummary', () => {
  it('counts totals, domains, stages and interview-ready percentages', () => {
    const s = computeCsSummary(
      [
        concept({ domain: 'DBMS', stage: 'interview_ready', confidence: 5, lastRevisedAt: daysAgo(1) }),
        concept({ domain: 'DBMS', stage: 'revised', confidence: 4, lastRevisedAt: daysAgo(1) }),
        concept({ domain: 'OS', stage: 'interview_ready', confidence: 5, lastRevisedAt: daysAgo(1) }),
      ],
      now,
    );
    expect(s.totalConcepts).toBe(3);
    expect(s.countsByDomain.DBMS).toBe(2);
    expect(s.countsByStage.interview_ready).toBe(2);
    expect(s.interviewReadyPercentageOverall).toBe(67);
    expect(s.interviewReadyPercentageByDomain.DBMS).toBe(50);
    expect(s.interviewReadyPercentageByDomain.OS).toBe(100);
    expect(s.interviewReadyPercentageByDomain.OOP).toBe(0);
  });

  it('lists weak concepts ranked weakest-first', () => {
    const s = computeCsSummary(
      [
        concept({ title: 'A', confidence: 5, lastRevisedAt: daysAgo(1) }), // not weak
        concept({ title: 'B', confidence: 1, lastRevisedAt: daysAgo(1) }), // weakest
        concept({ title: 'C', confidence: 2, lastRevisedAt: daysAgo(1) }),
      ],
      now,
    );
    expect(s.weakConcepts.map((c) => c.title)).toEqual(['B', 'C']);
  });
});
