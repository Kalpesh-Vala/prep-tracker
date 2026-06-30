# Quickstart — Foundation Shell (validation guide)

This guide proves the foundation slice works end to end: deploy-ready build, secure
sign-in, navigable shell, session persistence, and sign-out. It references the
[spec](spec.md), [data model](data-model.md), and [auth API contract](contracts/auth-api.md)
rather than duplicating them.

## Prerequisites

- Node.js 20 LTS and npm.
- A MongoDB Atlas cluster (or local MongoDB) connection string.
- Environment variables configured (copy `.env.example` → `.env.local` and fill in):
  - `MONGODB_URI` — Atlas connection string.
  - `AUTH_SECRET` — random secret used as the HMAC key for hashing session tokens.
  - `OWNER_USERNAME`, `OWNER_EMAIL`, `OWNER_PASSWORD` — used once to seed the single owner.

> Secrets come only from environment variables and are never committed (Constitution
> Principle IV). `.env.example` documents the variables with no real values.

## Setup

```bash
npm install
npm run seed        # runs scripts/seed-user.ts to create/update the single owner
```

## Run locally

```bash
npm run dev
# open http://localhost:3000
```

## Run tests

```bash
npm test            # Vitest: unit + integration (uses mongodb-memory-server, no live DB)
```

Tests are deterministic and require no network or Atlas instance (Principle III).

## Validation scenarios

Map each scenario to its spec acceptance criteria.

### 1. Unauthenticated access is blocked (US1 / FR-002, SC-002)

- Visit `http://localhost:3000/dashboard` while signed out.
- **Expected**: redirected to `/signin`; no dashboard content is served.
- API check: `GET /api/auth/session` → `200 { "data": { "authenticated": false } }`.

### 2. Invalid credentials are rejected (US1 / FR-003–FR-004, SC-006)

- On `/signin`, submit a wrong password.
- **Expected**: `401` with a generic "Invalid username/email or password." message; no
  session cookie set; the page shows the error.

### 3. Rate limiting kicks in (FR-015, SC-007)

- Submit wrong credentials 5 times for the same identifier.
- **Expected**: the 6th attempt returns `429 TOO_MANY_ATTEMPTS` and is blocked for ~15
  minutes, even with correct credentials.

### 4. Successful sign-in reaches the shell (US1 + US2 / FR-001, FR-005, FR-008, SC-003)

- Sign in with the seeded owner credentials (username **or** email).
- **Expected**: redirected into the app; the persistent sidebar shows **Dashboard, Daily
  Log, DSA, Weekly Review** plus a **Sign out** control, and a main content region is
  visible. Selecting an entry keeps the sidebar and updates the main region with placeholder
  content.

### 5. Session persists across reloads (US3 / FR-006, SC-004)

- While signed in, reload the page and reopen `http://localhost:3000` in a new tab.
- **Expected**: still signed in, still inside the shell, no re-prompt. The `pt_session`
  cookie is `HttpOnly`/`Secure`/`SameSite=Lax` (see
  [session cookie contract](contracts/session-cookie.md)).

### 6. Sign-out ends the session (US1 / FR-005, FR-016, SC-005)

- Click **Sign out**.
- **Expected**: redirected to `/signin`; the `Session` record is deleted and the cookie
  cleared. Revisiting `/dashboard` redirects to `/signin`.

### 7. Datastore connectivity (FR-013)

- Confirm the app connects to MongoDB on first request using the cached connection helper
  (`lib/db.ts`); repeated requests reuse the same connection (Principle VI).

## Deploy to Vercel (FR-012)

1. Push the branch and import the repo into Vercel.
2. Set Environment Variables in the Vercel project: `MONGODB_URI`, `AUTH_SECRET` (and run
   the seed once against the production database, e.g. via a one-off script or local run
   pointed at the prod `MONGODB_URI`).
3. Deploy. Open the hosted URL → reach `/signin` (SC-001), then repeat scenarios 1–6 against
   the hosted environment.

## Definition of Done check (from the constitution)

- [ ] ESLint + Prettier pass with zero errors.
- [ ] TypeScript strict type-check passes.
- [ ] Unit tests (auth/session/rate-limit) and the protected-route integration test pass.
- [ ] No secrets committed; `.env.example` documents required variables.
- [ ] Data-integrity rules upheld (timestamps, hashed credentials, server-side validation).
- [ ] README updated (setup, env, run, test, deploy).
- [ ] Change stays within the foundation-shell scope (no tracker features).
