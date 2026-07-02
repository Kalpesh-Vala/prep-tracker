import { type NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/http';
import { requireApiUser } from '@/lib/auth';
import {
  createWeeklyReview,
  listWeeklyReviews,
  DuplicateWeekError,
  InvalidWeeklyReviewError,
} from '@/lib/weeklyReview';

export const runtime = 'nodejs';

/** Create a weekly review. */
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

    const review = await createWeeklyReview(raw);
    return ok({ review }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateWeekError) {
      return fail('DUPLICATE_WEEK', 'A review for this week already exists. Edit it instead.', 409);
    }
    if (error instanceof InvalidWeeklyReviewError) {
      return fail('INVALID_INPUT', error.message, 400);
    }
    return handleRouteError(error);
  }
}

/** List reviews newest-first with pagination. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401);
    }

    const { searchParams } = new URL(req.url);
    const result = await listWeeklyReviews({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });
    return ok(result);
  } catch (error) {
    if (error instanceof InvalidWeeklyReviewError) {
      return fail('INVALID_INPUT', error.message, 400);
    }
    return handleRouteError(error);
  }
}
