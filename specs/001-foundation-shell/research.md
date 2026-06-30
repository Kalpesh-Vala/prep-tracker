# Phase 0 Research: Foundation Shell

This document records the technical decisions for the foundation slice. The technology
stack (Next.js, MongoDB Atlas, Vercel, Tailwind) is fixed by the constitution; the research
below resolves the *how* within those constraints. There were no open `NEEDS CLARIFICATION`
items in the spec.

## D1. MongoDB connection on serverless (global cached Mongoose client)

- **Decision**: Implement a single `lib/db.ts` helper that caches the Mongoose connection
  on the Node global object (`globalThis`) and returns the cached promise on subsequent
  invocations. Use a single shared connection; do not call `mongoose.connect` per request.
- **Rationale**: Vercel reuses warm serverless instances; without caching, each invocation
  would open a new Atlas connection and quickly exhaust the pool (Constitution Principle
  VI). The global-cache pattern is the documented standard for Mongoose on serverless.
- **Alternatives considered**: New connection per request (rejected — exhausts pool);
  native MongoDB driver without Mongoose (rejected — constitution requires schema-validated
  models, which Mongoose provides cleanly).

## D2. Password hashing (Node built-in scrypt vs bcrypt)

- **Decision**: Hash credentials with Node's built-in `crypto.scryptSync`/`scrypt` using a
  per-password random salt; store `salt:derivedKey` (hex). Verify with `timingSafeEqual`.
- **Rationale**: `scrypt` is a memory-hard, well-regarded KDF available in the Node runtime
  with zero added dependencies, honoring Simplicity First (Principle V) while meeting the
  security bar (Principle IV). It is fully serverless-safe (pure Node, no native bindings).
- **Alternatives considered**: `bcrypt` (rejected — native bindings can complicate
  serverless builds); `bcryptjs` (viable, pure-JS, but adds a dependency that the built-in
  `scrypt` makes unnecessary); `argon2` (rejected — native dependency).

## D3. Session strategy (server-side sessions in MongoDB + cookie)

- **Decision**: On sign-in, generate a 32-byte random token (`randomBytes`), store only a
  **keyed hash** of it — HMAC-SHA-256 using `AUTH_SECRET` as the key (`crypto.createHmac`)
  — in a `sessions` collection alongside `userId` and `expiresAt` (~30 days), and set the
  raw token in an httpOnly, `Secure`, `SameSite=Lax` cookie (`pt_session`). On each
  authenticated request, re-derive the keyed hash from the cookie token, look up the
  session, reject if missing or expired, and roll the expiry forward (sliding window).
  Sign-out deletes the session record and clears the cookie.
- **Role of `AUTH_SECRET`**: it is the server-side secret key for the session-token HMAC.
  Because the stored value is keyed, an attacker who reads the database cannot derive valid
  cookie tokens without also knowing `AUTH_SECRET`; rotating `AUTH_SECRET` invalidates all
  existing sessions. `AUTH_SECRET` is sourced only from the environment (Principle IV).
- **Rationale**: The clarification mandated server-side persisted sessions (queryable
  records). Storing only a keyed (HMAC) hash of the token means a database leak does not
  expose usable sessions — forging a token additionally requires `AUTH_SECRET`. Rolling
  expiry satisfies the ~30-day rolling-session clarification and keeps an actively used app
  signed in. A MongoDB TTL index on `expiresAt` auto-purges expired sessions
  (serverless-friendly cleanup).
- **Alternatives considered**: Stateless signed JWT in a cookie (rejected — clarification
  requires queryable server-side sessions and easy server-side revocation on sign-out);
  third-party session libraries such as `iron-session`/NextAuth (rejected — heavier than
  needed and the task explicitly calls for a custom single-user implementation).

## D4. Route protection: Edge middleware + server-side validation (defense in depth)

- **Decision**: `middleware.ts` (Edge runtime) performs a cheap check for the presence of
  the `pt_session` cookie and redirects to `/signin` when absent, for all non-public paths.
  Authoritative validation (hash lookup, expiry, rolling extend) happens in the Node runtime
  inside the `(app)` group layout (for pages) and inside each protected Route Handler (for
  APIs), via `lib/auth.ts`.
- **Rationale**: Next.js middleware runs on the Edge runtime, which cannot use Mongoose or
  Node `crypto` reliably; doing DB validation there is not viable. A two-layer approach gives
  fast UX redirects at the edge plus trustworthy authorization at the data layer, so a forged
  or expired cookie that slips past the edge check is still rejected server-side (Principle
  IV).
- **Alternatives considered**: DB validation in middleware (rejected — Edge runtime
  limitation); middleware only, no server-side check (rejected — forged cookies would not be
  caught); server-side only, no middleware (rejected — loses clean redirect UX for page
  navigations).

## D5. Brute-force rate limiting (5 attempts → 15-minute lockout)

- **Decision**: Record each failed sign-in as a document in a `loginattempts` collection
  keyed by the normalized identifier (lowercased username/email). On each attempt, count
  failures in the trailing 15-minute window; if ≥ 5, reject with HTTP 429 (locked) without
  checking credentials. Clear the key's failures on successful sign-in. A TTL index expires
  attempt records automatically.
- **Rationale**: Matches the clarified policy (FR-015, SC-007), works for any submitted
  identifier (including non-existent ones, preventing the legitimate account from being a
  free target), is deterministic and unit-testable, and needs no in-memory state — suitable
  for serverless (Principle VI). Keying on identifier (not only IP) avoids false lockouts
  from shared IPs while still throttling the real target.
- **Alternatives considered**: In-memory counter (rejected — not shared across serverless
  instances, non-deterministic); IP-only keying (rejected — less precise for a single-user
  app); external rate-limit service/Redis (rejected — over-engineering for one user,
  violates Simplicity First).

## D6. Sign-in identifier accepts username OR email

- **Decision**: The sign-in form accepts one identifier field; server-side, normalize to
  lowercase and look up the single owner by `username` OR `email`. Validate the credential
  payload with Zod before any DB work.
- **Rationale**: Matches the clarification (FR-001). One owner document carries both a
  `username` and `email`; either may be used. Normalization keeps lookups and rate-limit
  keys consistent.
- **Alternatives considered**: Separate username/email fields (rejected — worse UX, no
  benefit for one user); email-only (rejected — clarification allows either).

## D7. Server-side input validation (Zod)

- **Decision**: Use Zod schemas in Route Handlers to parse and validate request bodies
  before touching the database; reject invalid input with HTTP 400 and the standard error
  envelope.
- **Rationale**: Centralized, declarative, type-inferred validation strengthens data
  integrity (Principle II) and prevents untrusted input/injection (Principle IV). Zod is a
  small, widely recognized dependency whose value (every write validated at the boundary)
  justifies its inclusion under Principle V.
- **Alternatives considered**: Hand-rolled validation (rejected — more error-prone, less
  readable); Mongoose validation alone (kept as a second layer, but boundary validation
  should reject bad input before persistence is attempted).

## D8. Test runner and isolated database (Vitest + mongodb-memory-server)

- **Decision**: Use Vitest for unit and integration tests. Integration tests spin up
  `mongodb-memory-server` (an in-process MongoDB) so Mongoose models run against a real but
  ephemeral database with no network or Atlas dependency. Unit tests for pure logic (hashing,
  rate-limit math) need no database.
- **Rationale**: Satisfies Principle III: tests are deterministic and do not depend on a
  live external database or network. Vitest is fast, TypeScript/ESM-native, and integrates
  smoothly with a Next.js TS codebase.
- **Alternatives considered**: Jest (viable but heavier ESM/TS setup); mocking Mongoose
  entirely (kept for pure-unit cases, but `mongodb-memory-server` gives higher-fidelity
  integration coverage of schema validation and queries).

## D9. Owner provisioning (seed script, no registration)

- **Decision**: Provide `scripts/seed-user.ts` that reads `OWNER_USERNAME`, `OWNER_EMAIL`,
  and `OWNER_PASSWORD` from the environment, hashes the password, and upserts the single
  owner document. No public registration route exists.
- **Rationale**: Matches the single-user, no-self-registration requirement (FR-007) and the
  spec assumption that credentials are provisioned out of band. Keeps secrets in env, never
  in code (Principle IV).
- **Alternatives considered**: Registration flow (rejected — out of scope, single-user);
  hardcoded credentials (rejected — secrets must come from env).

## D10. Consistent API envelope and error format

- **Decision**: All Route Handlers return a consistent JSON shape via `lib/http.ts`:
  success → `{ "data": <payload> }`; error → `{ "error": { "code": <string>, "message":
  <string> } }`, paired with appropriate HTTP status codes (200/204, 400, 401, 429, 500).
- **Rationale**: Consistency and predictability are explicit constitution requirements
  (Principle VII) and make the API readable to a reviewer and stable for later slices.
- **Alternatives considered**: Ad-hoc per-route shapes (rejected — inconsistent, harder to
  consume and test).

## Resolved unknowns

All Technical Context fields are concrete; no `NEEDS CLARIFICATION` markers remain. The
spec's deferred low-impact items (reliability targets, observability, accessibility) are out
of scope for this slice and noted for later.
