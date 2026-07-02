import { type NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/http';
import { requireApiUser } from '@/lib/auth';
import { getDashboardSummary } from '@/lib/dashboard';

export const runtime = 'nodejs';

/** Read-only aggregate of six-month progress. Computed fresh on each request. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401);
    }
    const summary = await getDashboardSummary();
    return ok(summary);
  } catch (error) {
    return handleRouteError(error);
  }
}
