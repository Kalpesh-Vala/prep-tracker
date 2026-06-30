import '@testing-library/jest-dom/vitest';

// Deterministic secret for tests; never used against real infrastructure.
// NODE_ENV is set to 'test' by Vitest automatically.
process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? 'test-auth-secret';
