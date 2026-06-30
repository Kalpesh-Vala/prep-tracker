# Implementation Plan: Foundation Shell (Secure, Navigable, Deployable App)

**Branch**: `001-foundation-shell` | **Date**: 2026-06-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-foundation-shell/spec.md`

## Summary

Deliver the secure, navigable, deployable shell of the Prep Tracker app: a single owner
signs in with a username or email, lands on a persistent sidebar + main-content layout
with placeholder areas (Dashboard, Daily Log, DSA, Weekly Review), stays signed in across
reloads via a server-side rolling session, and signs out. No tracker features in this
slice.

Technical approach: a full-stack Next.js (App Router, TypeScript strict) app on Vercel.
All backend logic lives in `app/api` Route Handlers (no separate server). MongoDB Atlas is
accessed through Mongoose with a global cached connection helper for serverless. Auth is
custom and minimal: credentials hashed with Node's built-in `scrypt`, an opaque session
token stored hashed in a `Session` collection, carried in an httpOnly signed cookie.
Middleware does a cheap cookie-presence redirect at the edge; authoritative validation
happens server-side in the Node runtime. Failed sign-ins are rate-limited (5 attempts →
15-minute lockout). Tailwind provides the dashboard layout. Vitest + mongodb-memory-server
provide deterministic tests with no live DB.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20 LTS (Vercel runtime)

**Primary Dependencies**: Next.js 15 (App Router) + React 19; Mongoose 8 (schema-validated
models); Tailwind CSS 3; Zod (server-side input validation). Password hashing and session
tokens use the Node built-in `crypto` module (`scrypt`, `randomBytes`, `createHmac`,
`timingSafeEqual`) — no third-party crypto dependency. `AUTH_SECRET` is the HMAC key used to
hash session tokens before storage.

**Storage**: MongoDB Atlas, accessed via a global cached Mongoose connection (serverless
pool reuse). Collections: `users`, `sessions`, `loginattempts`.

**Testing**: Vitest (unit + integration). `mongodb-memory-server` provides an isolated,
in-memory MongoDB for integration tests so no network or live Atlas is required.

**Target Platform**: Vercel serverless (Node runtime for Route Handlers/Server Components;
Edge runtime for `middleware.ts` cookie-presence checks only).

**Project Type**: Full-stack web application (single Next.js project; frontend + API
co-located).

**Performance Goals**: Sign-in to shell < 30s (SC-003, generous); typical authenticated
page response well under 1s p95 for a single user. Connection reuse keeps cold-start DB
cost low.

**Constraints**: Vercel serverless execution limits (no long-lived in-memory state, bounded
function duration); MongoDB Atlas connection-pool limits (MUST reuse a cached connection,
no new connection per invocation); Edge middleware cannot use Mongoose/Node crypto, so it
only checks cookie presence.

**Scale/Scope**: Single user; ~5 page routes (sign-in + 4 placeholder areas) and 3 auth API
endpoints; 3 Mongoose models. Intentionally small.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate evaluation | Status |
|-----------|-----------------|--------|
| I. Code Quality & Maintainability | Conventional App Router layout (`app/`, `components/`, `lib/`, `models/`, `types/`); domain/auth logic in `lib/` and `models/`, route handlers stay thin; TypeScript strict, no `any` without justification; ESLint + Prettier enforced. | PASS |
| II. Data Integrity & Persistence | Mongoose schemas with explicit validation; `{ timestamps: true }` on every model; server-side Zod validation before persisting; sign-out invalidates only the owner's own session; no destructive ops beyond own-session deletion. | PASS |
| III. Test-Backed Behavior | Unit tests for password hash/verify, session create/validate/rolling-extend/destroy, and rate-limit logic; integration tests for protected route (401/redirect when unauthenticated) and sign-in success/failure; deterministic via `mongodb-memory-server`. | PASS |
| IV. Security & Privacy by Default | Secrets only via env vars + documented `.env.example`; middleware + server-side validation reject unauthenticated access; credentials hashed (scrypt); all client input validated server-side via Zod and typed queries to avoid Mongo injection; single-owner scoping. | PASS |
| V. Simplicity First | Custom minimal auth instead of a heavy auth framework; small dependency set (Mongoose, Tailwind, Zod, Vitest, mongodb-memory-server); MVP shell only — no tracker features, charts, or speculative abstraction. | PASS |
| VI. Serverless-Aware Architecture | Global cached Mongoose connection (no per-request connection); stateless Route Handlers; Edge middleware does only cheap cookie checks; TTL indexes auto-expire sessions/attempts; externalized config. | PASS |
| VII. Consistency & Documentation | Predictable REST routes under `/api/auth/*`; consistent JSON envelopes (`{ data }` / `{ error: { code, message } }`) with correct HTTP status codes; consistent naming across DB/types/API/UI; README with setup, env, run, test, deploy. | PASS |

No violations. Complexity Tracking is intentionally empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation-shell/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (auth API + session cookie contracts)
├── checklists/
│   └── requirements.md  # Spec quality checklist (already present)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
app/
├── layout.tsx                  # Root layout (html/body, Tailwind globals)
├── globals.css                 # Tailwind base/components/utilities
├── page.tsx                    # Redirects to /dashboard (auth) or /signin
├── signin/
│   └── page.tsx                # Public sign-in page (renders SignInForm)
├── (app)/                      # Authenticated route group
│   ├── layout.tsx              # AppShell: validates session server-side, renders Sidebar + main
│   ├── dashboard/page.tsx      # Placeholder content region
│   ├── daily-log/page.tsx      # Placeholder
│   ├── dsa/page.tsx            # Placeholder
│   └── weekly-review/page.tsx  # Placeholder
└── api/
    └── auth/
        ├── signin/route.ts     # POST: validate credentials, create session, set cookie
        ├── signout/route.ts    # POST: invalidate session, clear cookie
        └── session/route.ts    # GET: current session status (used by UI/tests)

components/
├── AppShell.tsx                # Layout frame (sidebar + main slot)
├── Sidebar.tsx                 # Nav entries + sign-out control
└── SignInForm.tsx              # Client form posting to /api/auth/signin

lib/
├── db.ts                       # Global cached Mongoose connection helper
├── auth.ts                     # hashPassword/verifyPassword, session create/get/destroy, requireUser
├── rateLimit.ts                # Failed-attempt tracking (5/15-min lockout)
├── http.ts                     # ok()/fail() JSON envelope + status helpers
└── env.ts                      # Validated environment variable access

models/
├── User.ts                     # Mongoose schema: username, email, passwordHash
├── Session.ts                  # Mongoose schema: tokenHash, userId, expiresAt (TTL)
└── LoginAttempt.ts             # Mongoose schema: key, createdAt (TTL) for rate limiting

types/
└── index.ts                    # Shared TypeScript types (SessionUser, ApiResponse, etc.)

middleware.ts                   # Edge: redirect to /signin when session cookie absent

scripts/
└── seed-user.ts                # One-off: provision the single owner from env vars

tests/
├── unit/
│   ├── auth.test.ts            # hash/verify + session lifecycle
│   └── rateLimit.test.ts       # lockout threshold/cooldown
└── integration/
    ├── protected-route.test.ts # 401/redirect when unauthenticated; 200 when authenticated
    └── signin.test.ts          # success, invalid creds, lockout

.env.example                    # Documents MONGODB_URI, AUTH_SECRET, OWNER_* (no real values)
vitest.config.ts                # Test runner config (node env)
README.md                       # Setup, env vars, run, test, Vercel deploy
```

**Structure Decision**: Single full-stack Next.js project (App Router). Frontend and API
are co-located, matching the constitution's prescribed layout (`app/`, `components/`,
`lib/`, `models/`, `types/`). Backend endpoints are Route Handlers under `app/api`; no
separate backend service. Authenticated pages live in an `(app)` route group whose layout
performs authoritative server-side session validation, while `middleware.ts` provides the
cheap edge redirect.

## Complexity Tracking

> No constitutional violations. No complexity deviations to justify.
