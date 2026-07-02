import { type NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/http';
import { requireApiUser } from '@/lib/auth';
import {
  getDailyLog,
  updateDailyLog,
  DailyLogNotFoundError,
  InvalidDailyLogError,
} from '@/lib/dailyLog';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

/** Fetch a single entry by id. */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401);
    }

    const { id } = await params;
    const entry = await getDailyLog(id);
    return ok({ entry });
  } catch (error) {
    if (error instanceof DailyLogNotFoundError) {
      return fail('NOT_FOUND', 'Entry not found.', 404);
    }
    if (error instanceof InvalidDailyLogError) {
      return fail('INVALID_INPUT', error.message, 400);
    }
    return handleRouteError(error);
  }
}

/** Update an existing entry in place (date immutable). */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401);
    }

    const { id } = await params;

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return fail('INVALID_INPUT', 'Request body must be valid JSON.', 400);
    }

    const entry = await updateDailyLog(id, raw);
    return ok({ entry });
  } catch (error) {
    if (error instanceof DailyLogNotFoundError) {
      return fail('NOT_FOUND', 'Entry not found.', 404);
    }
    if (error instanceof InvalidDailyLogError) {
      return fail('INVALID_INPUT', error.message, 400);
    }
    return handleRouteError(error);
  }
}
