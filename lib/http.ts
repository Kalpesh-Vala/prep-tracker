import { NextResponse } from 'next/server';
import { DatastoreUnavailableError } from './errors';

/** Build a consistent success response: `{ data: ... }`. */
export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

/** Build a consistent error response: `{ error: { code, message } }`. */
export function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Map thrown errors to safe, consistent responses. */
export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof DatastoreUnavailableError) {
    return fail('DATASTORE_UNAVAILABLE', 'The service is temporarily unavailable.', 503);
  }
  // Avoid leaking internals; log server-side for diagnostics.
  console.error('Unexpected route error:', error);
  return fail('INTERNAL_ERROR', 'Something went wrong.', 500);
}
