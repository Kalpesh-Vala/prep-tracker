import { type NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/http';
import { requireApiUser } from '@/lib/auth';
import { getDsaSummary } from '@/lib/dsa';

export const runtime = 'nodejs';

/** Global DSA insights (independent of list filters). */
export async function GET(req: NextRequest) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401);
    }
    const summary = await getDsaSummary();
    return ok(summary);
  } catch (error) {
    return handleRouteError(error);
  }
}
