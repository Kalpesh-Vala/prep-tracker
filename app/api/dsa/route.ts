import { type NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/http';
import { requireApiUser } from '@/lib/auth';
import { createDsaProblem, listDsaProblems, InvalidDsaError } from '@/lib/dsa';

export const runtime = 'nodejs';

/** Create a new DSA problem record. */
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

    const problem = await createDsaProblem(raw);
    return ok({ problem }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidDsaError) {
      return fail('INVALID_INPUT', error.message, 400);
    }
    return handleRouteError(error);
  }
}

/** List problems newest-first with filters and pagination. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401);
    }

    const { searchParams } = new URL(req.url);
    const result = await listDsaProblems({
      topic: searchParams.get('topic') ?? undefined,
      difficulty: searchParams.get('difficulty') ?? undefined,
      needsRevision: searchParams.get('needsRevision') ?? undefined,
      interviewWorthy: searchParams.get('interviewWorthy') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });
    return ok(result);
  } catch (error) {
    if (error instanceof InvalidDsaError) {
      return fail('INVALID_INPUT', error.message, 400);
    }
    return handleRouteError(error);
  }
}
