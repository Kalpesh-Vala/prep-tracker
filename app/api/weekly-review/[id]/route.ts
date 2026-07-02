import { type NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/http';
import { requireApiUser } from '@/lib/auth';
import {
  getWeeklyReview,
  updateWeeklyReview,
  WeeklyReviewNotFoundError,
  InvalidWeeklyReviewError,
} from '@/lib/weeklyReview';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

/** Fetch a single review by id. */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401);
    }
    const { id } = await params;
    const review = await getWeeklyReview(id);
    return ok({ review });
  } catch (error) {
    if (error instanceof WeeklyReviewNotFoundError) {
      return fail('NOT_FOUND', 'Review not found.', 404);
    }
    if (error instanceof InvalidWeeklyReviewError) {
      return fail('INVALID_INPUT', error.message, 400);
    }
    return handleRouteError(error);
  }
}

/** Update a review in place (week identity immutable). */
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

    const review = await updateWeeklyReview(id, raw);
    return ok({ review });
  } catch (error) {
    if (error instanceof WeeklyReviewNotFoundError) {
      return fail('NOT_FOUND', 'Review not found.', 404);
    }
    if (error instanceof InvalidWeeklyReviewError) {
      return fail('INVALID_INPUT', error.message, 400);
    }
    return handleRouteError(error);
  }
}
