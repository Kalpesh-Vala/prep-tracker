import { type NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/http';
import { requireApiUser } from '@/lib/auth';
import {
  getDsaProblem,
  updateDsaProblem,
  deleteDsaProblem,
  DsaNotFoundError,
  InvalidDsaError,
} from '@/lib/dsa';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

/** Fetch a single problem by id. */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401);
    }
    const { id } = await params;
    const problem = await getDsaProblem(id);
    return ok({ problem });
  } catch (error) {
    if (error instanceof DsaNotFoundError) {
      return fail('NOT_FOUND', 'Problem not found.', 404);
    }
    if (error instanceof InvalidDsaError) {
      return fail('INVALID_INPUT', error.message, 400);
    }
    return handleRouteError(error);
  }
}

/** Update a problem in place. */
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

    const problem = await updateDsaProblem(id, raw);
    return ok({ problem });
  } catch (error) {
    if (error instanceof DsaNotFoundError) {
      return fail('NOT_FOUND', 'Problem not found.', 404);
    }
    if (error instanceof InvalidDsaError) {
      return fail('INVALID_INPUT', error.message, 400);
    }
    return handleRouteError(error);
  }
}

/** Permanently delete a problem by id. */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401);
    }
    const { id } = await params;
    await deleteDsaProblem(id);
    return ok({ deleted: true, id });
  } catch (error) {
    if (error instanceof DsaNotFoundError) {
      return fail('NOT_FOUND', 'Problem not found.', 404);
    }
    if (error instanceof InvalidDsaError) {
      return fail('INVALID_INPUT', error.message, 400);
    }
    return handleRouteError(error);
  }
}
