import { type NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/http';
import { requireApiUser } from '@/lib/auth';
import { getCsSummary } from '@/lib/csFundamentals';

export const runtime = 'nodejs';

/** CS readiness insights over non-archived concepts. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401);
    }
    const summary = await getCsSummary();
    return ok(summary);
  } catch (error) {
    return handleRouteError(error);
  }
}
