import { type NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/http';
import { requireApiUser } from '@/lib/auth';
import {
  createDailyLog,
  listDailyLogs,
  DuplicateDateError,
  InvalidDailyLogError,
} from '@/lib/dailyLog';

export const runtime = 'nodejs';

/** Create today's (or a backfilled past) entry. */
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

    const entry = await createDailyLog(raw);
    return ok({ entry }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateDateError) {
      return fail('DUPLICATE_DATE', 'An entry for this date already exists. Edit it instead.', 409);
    }
    if (error instanceof InvalidDailyLogError) {
      return fail('INVALID_INPUT', error.message, 400);
    }
    return handleRouteError(error);
  }
}

/** List entries newest-first with optional pagination. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401);
    }

    const { searchParams } = new URL(req.url);
    const result = await listDailyLogs({
      limit: searchParams.get('limit') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
    });
    return ok(result);
  } catch (error) {
    if (error instanceof InvalidDailyLogError) {
      return fail('INVALID_INPUT', error.message, 400);
    }
    return handleRouteError(error);
  }
}
