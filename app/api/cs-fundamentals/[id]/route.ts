import { type NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/http';
import { requireApiUser } from '@/lib/auth';
import {
  getConcept,
  updateConcept,
  archiveConcept,
  ConceptNotFoundError,
  DuplicateConceptError,
  InvalidConceptError,
} from '@/lib/csFundamentals';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

/** Fetch a single concept by id. */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401);
    }
    const { id } = await params;
    const concept = await getConcept(id);
    return ok({ concept });
  } catch (error) {
    if (error instanceof ConceptNotFoundError) {
      return fail('NOT_FOUND', 'Concept not found.', 404);
    }
    if (error instanceof InvalidConceptError) {
      return fail('INVALID_INPUT', error.message, 400);
    }
    return handleRouteError(error);
  }
}

/** Update a concept in place (stage/details). */
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

    const concept = await updateConcept(id, raw);
    return ok({ concept });
  } catch (error) {
    if (error instanceof ConceptNotFoundError) {
      return fail('NOT_FOUND', 'Concept not found.', 404);
    }
    if (error instanceof DuplicateConceptError) {
      return fail('DUPLICATE_CONCEPT', 'Another concept already uses that domain/title/subtopic.', 409);
    }
    if (error instanceof InvalidConceptError) {
      return fail('INVALID_INPUT', error.message, 400);
    }
    return handleRouteError(error);
  }
}

/** Soft-delete (archive) a concept. */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireApiUser(req);
    if (!user) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401);
    }
    const { id } = await params;
    await archiveConcept(id);
    return ok({ archived: true, id });
  } catch (error) {
    if (error instanceof ConceptNotFoundError) {
      return fail('NOT_FOUND', 'Concept not found.', 404);
    }
    if (error instanceof InvalidConceptError) {
      return fail('INVALID_INPUT', error.message, 400);
    }
    return handleRouteError(error);
  }
}
