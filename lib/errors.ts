/**
 * Raised when the persistent datastore cannot be reached. Route handlers map
 * this to a safe 503 response rather than appearing to succeed
 * (spec Edge Cases; FR-013).
 */
export class DatastoreUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('The datastore is currently unavailable.');
    this.name = 'DatastoreUnavailableError';
    if (cause instanceof Error) {
      this.stack = cause.stack;
    }
  }
}
