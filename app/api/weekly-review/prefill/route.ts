import { type NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/http';
import { requireApiUser } from '@/lib/auth';
import { getWeeklyPrefill, InvalidWeeklyReviewError } from '@/lib/weeklyReview';

export const runtime = 'nodejs';

/** Suggested totals for a week, derived from Daily Log + DSA data. Read-only. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401);
    }

    const { searchParams } = new URL(req.url);
    const prefill = await getWeeklyPrefill(searchParams.get('weekNumber') ?? undefined);
    return ok(prefill);
  } catch (error) {
    if (error instanceof InvalidWeeklyReviewError) {
      return fail('INVALID_INPUT', error.message, 400);
    }
    return handleRouteError(error);
  }
}
