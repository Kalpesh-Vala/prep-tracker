import { type NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/http';
import { requireApiUser } from '@/lib/auth';
import {
  createConcept,
  listConcepts,
  DuplicateConceptError,
  InvalidConceptError,
} from '@/lib/csFundamentals';

export const runtime = 'nodejs';

/** Create a CS concept. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401);
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return fail('INVALID_INPUT', 'Request body must be valid JSON.', 400);
    }

    const concept = await createConcept(raw);
    return ok({ concept }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateConceptError) {
      return fail('DUPLICATE_CONCEPT', 'This concept already exists. Update it instead.', 409);
    }
    if (error instanceof InvalidConceptError) {
      return fail('INVALID_INPUT', error.message, 400);
    }
    return handleRouteError(error);
  }
}

/** List non-archived concepts with filters and pagination. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401);
    }

    const { searchParams } = new URL(req.url);
    const result = await listConcepts({
      domain: searchParams.get('domain') ?? undefined,
      stage: searchParams.get('stage') ?? undefined,
      confidenceMin: searchParams.get('confidenceMin') ?? undefined,
      confidenceMax: searchParams.get('confidenceMax') ?? undefined,
      interviewReady: searchParams.get('interviewReady') ?? undefined,
      notInterviewReady: searchParams.get('notInterviewReady') ?? undefined,
      weakOnly: searchParams.get('weakOnly') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });
    return ok(result);
  } catch (error) {
    if (error instanceof InvalidConceptError) {
      return fail('INVALID_INPUT', error.message, 400);
    }
    return handleRouteError(error);
  }
}
