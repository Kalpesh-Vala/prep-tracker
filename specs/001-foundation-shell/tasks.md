---
description: "Task list for Foundation Shell implementation"
---

# Tasks: Foundation Shell (Secure, Navigable, Deployable App)

**Input**: Design documents from `/specs/001-foundation-shell/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: Included — tests are explicitly required by the spec (Constitution Principle III: unit tests for auth/session/rate-limit logic and integration tests for protected routes).

**Organization**: Tasks are grouped by user story (US1 P1, US2 P2, US3 P3) so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1/US2/US3); Setup, Foundational, and Polish tasks carry no story label
- Exact file paths are included in each task

## Path Conventions

Single full-stack Next.js project at the repository root (per [plan.md](plan.md) Structure
Decision): `app/`, `components/`, `lib/`, `models/`, `types/`, `tests/`, `scripts/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, tooling, and folder structure.

- [x] T001 Initialize Next.js (App Router) + React project with TypeScript strict mode at repo root (package.json, tsconfig.json with "strict": true, next.config.ts)
- [x] T002 [P] Install and configure Tailwind CSS (tailwind.config.ts, postcss.config.js, app/globals.css with base/components/utilities)
- [x] T003 [P] Configure ESLint + Prettier with zero-error gate (eslint config, .prettierrc, npm lint/format scripts)
- [x] T004 [P] Configure Vitest with mongodb-memory-server and React Testing Library (vitest.config.ts, tests/setup.ts, npm test script)
- [x] T005 [P] Create .env.example documenting MONGODB_URI, AUTH_SECRET, OWNER_USERNAME, OWNER_EMAIL, OWNER_PASSWORD (no real values) and confirm .gitignore excludes .env* files
- [x] T006 [P] Create base folder structure: app/, components/, lib/, models/, types/, tests/unit/, tests/integration/, scripts/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure required by ALL user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T007 Implement validated environment access in lib/env.ts (typed getters for MONGODB_URI, AUTH_SECRET; fail fast if missing)
- [x] T008 Implement serverless-safe cached Mongoose connection in lib/db.ts (global cache pattern reusing the connection across invocations); when the datastore is unreachable, fail safely with a clear error (never grant access or report false success), surfaced via the lib/http.ts envelope for API routes and an error state for pages [Spec Edge Cases; FR-013]
- [x] T009 [P] Define shared TypeScript types in types/index.ts (SessionUser, ApiResponse<T> envelope)
- [x] T010 [P] Implement JSON response envelope helpers in lib/http.ts (ok(data)/fail(code,message,status) with correct HTTP status codes)
- [x] T011 [P] Create User model in models/User.ts (username, email, passwordHash; unique indexes; timestamps)
- [x] T012 [P] Create Session model in models/Session.ts (tokenHash unique, userId ref, expiresAt with TTL index; timestamps)
- [x] T013 [P] Create LoginAttempt model in models/LoginAttempt.ts (key, createdAt with ~15-min TTL index)
- [x] T014 Implement root layout in app/layout.tsx wiring app/globals.css (html/body shell for all routes)

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Secure single-user sign-in and sign-out (Priority: P1) 🎯 MVP

**Goal**: A single owner can sign in with username or email, reach a protected page, and
sign out; unauthenticated requests are rejected. Includes brute-force rate limiting.

**Independent Test**: Deploy/run, request a protected URL while signed out (redirect to
/signin), sign in with valid credentials (access granted), sign in with invalid credentials
(rejected, generic error), exceed 5 failures (locked 15 min), then sign out (protected URLs
inaccessible again).

### Tests for User Story 1 ⚠️ (write first, ensure they FAIL before implementation)

- [x] T015 [P] [US1] Unit test password hash/verify (scrypt, timing-safe, wrong-password fails) in tests/unit/auth.test.ts
- [x] T016 [P] [US1] Unit test rate-limit lockout (5 failures → locked; success clears; cooldown) in tests/unit/rateLimit.test.ts
- [x] T017 [P] [US1] Integration test POST /api/auth/signin success (200 + cookie), invalid creds (401 generic), and lockout (429) in tests/integration/signin.test.ts
- [x] T018 [P] [US1] Integration test that a protected route returns 401 (API) / redirect (page) when unauthenticated, and that POST /api/auth/signout is idempotent when unauthenticated (no error, clears cookie) and GET /api/auth/session returns authenticated:false, in tests/integration/protected-route.test.ts

### Implementation for User Story 1

- [x] T019 [P] [US1] Implement scrypt password hashing/verification (hashPassword/verifyPassword) in lib/auth.ts
- [x] T020 [US1] Implement session create/get/destroy (random token, store SHA-256 hash, set/clear pt_session cookie) in lib/auth.ts
- [x] T021 [P] [US1] Implement rate limiting (isLocked/recordFailure/clearFailures keyed on normalized identifier) in lib/rateLimit.ts
- [x] T022 [US1] Implement requireUser server-side guard (validate cookie → Session → User) in lib/auth.ts
- [x] T023 [US1] Implement owner seed script in scripts/seed-user.ts (reads OWNER_* env, hashes password, upserts single User) + npm seed script
- [x] T024 [US1] Implement POST /api/auth/signin in app/api/auth/signin/route.ts (Zod validation, lockout check, identifier OR email lookup, verify, create session, set cookie, generic errors)
- [x] T025 [US1] Implement POST /api/auth/signout in app/api/auth/signout/route.ts (invalidate session record, clear cookie, idempotent 204)
- [x] T026 [US1] Implement GET /api/auth/session in app/api/auth/session/route.ts (return authenticated state + user summary)
- [x] T027 [US1] Implement middleware.ts (Edge: redirect to /signin when pt_session cookie absent on protected paths; allow /signin and public auth routes)
- [x] T028 [P] [US1] Implement sign-in page app/signin/page.tsx and components/SignInForm.tsx (posts to /api/auth/signin, shows generic error; redirect already-authenticated users into the app per Spec Edge Cases)
- [x] T029 [US1] Implement protected group guard in app/(app)/layout.tsx (server-side requireUser; redirect to /signin if invalid) with a minimal app/(app)/dashboard/page.tsx placeholder
- [x] T030 [US1] Implement app/page.tsx root redirect (to /dashboard when authenticated, else /signin)

**Checkpoint**: User Story 1 fully functional and independently testable (secure entry).

---

## Phase 4: User Story 2 - Authenticated application shell with navigation (Priority: P2)

**Goal**: After sign-in, a persistent sidebar layout shows placeholder entries (Dashboard,
Daily Log, DSA, Weekly Review) plus sign-out and a main content region, present on every
authenticated page.

**Independent Test**: While signed in, confirm the navigation renders all four entries and a
sign-out control, the main region is visible and distinct, and the layout persists when
moving between placeholder areas.

### Tests for User Story 2 ⚠️

- [x] T031 [P] [US2] Component test that the shell renders all four nav entries + sign-out control and a main region in tests/integration/shell.test.tsx

### Implementation for User Story 2

- [x] T032 [P] [US2] Implement components/Sidebar.tsx (nav entries for Dashboard, Daily Log, DSA, Weekly Review + sign-out control)
- [x] T033 [P] [US2] Implement components/AppShell.tsx (persistent sidebar + distinct main content region using Tailwind)
- [x] T034 [US2] Enhance app/(app)/layout.tsx to wrap children in AppShell (keeps the US1 server-side guard)
- [x] T035 [P] [US2] Create placeholder pages app/(app)/daily-log/page.tsx, app/(app)/dsa/page.tsx, app/(app)/weekly-review/page.tsx and finalize app/(app)/dashboard/page.tsx placeholder content
- [x] T036 [US2] Wire the Sidebar sign-out control to POST /api/auth/signout and redirect to /signin

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Session persistence across reloads (Priority: P3)

**Goal**: A signed-in user stays signed in across reloads and revisits (rolling ~30-day
session) until explicit sign-out.

**Independent Test**: Sign in, reload and reopen the URL (still signed in, no re-prompt),
then sign out and confirm a reload no longer grants access.

### Tests for User Story 3 ⚠️

- [x] T037 [P] [US3] Integration test that a valid session authenticates across simulated reload/revisit and is rejected after sign-out in tests/integration/session-persistence.test.ts

### Implementation for User Story 3

- [x] T038 [US3] Implement rolling expiry extension in lib/auth.ts getSession (sliding ~30-day window; update Session.expiresAt on each valid request)
- [x] T039 [US3] Re-issue the pt_session cookie with refreshed Max-Age on each validated request in the (app) layout and GET /api/auth/session
- [x] T040 [US3] Ensure cookie attributes are set consistently (HttpOnly, Secure, SameSite=Lax, Path=/) on issue and refresh in lib/auth.ts

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, deployment readiness, and Definition-of-Done gates.

- [x] T041 [P] Write README.md (what it is, tech stack, local setup, env vars, run, test, Vercel deploy instructions)
- [x] T042 [P] Document Vercel deployment (env vars in project settings, seed against prod URI) and verify no secrets are committed
- [x] T043 Run the quickstart.md validation scenarios end-to-end against a running instance
- [x] T044 [P] Final Definition-of-Done gate: ESLint/Prettier zero errors + TypeScript strict type-check pass
- [x] T045 Security review: confirm hashed credentials, route protection, server-side validation, and single-owner scoping (Constitution Principles II & IV)
- [x] T046 [P] Integration test for datastore-unreachable fail-safe behavior (no access granted, clear error, no false success) in tests/integration/datastore-failure.test.ts [validates T008; Spec Edge Cases]

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3–5)**: All depend on Foundational completion.
  - US1 (P1) is the MVP and should be completed first.
  - US2 builds on US1's authenticated layout; US3 refines US1's session mechanism.
- **Polish (Phase 6)**: Depends on the targeted user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational. Delivers the secure MVP.
- **US2 (P2)**: Depends on Foundational; reuses US1's `app/(app)/layout.tsx` guard and
  `/api/auth/signout`. Independently testable for navigation rendering.
- **US3 (P3)**: Depends on Foundational; refines the session create/get built in US1.
  Independently testable for persistence/expiry behavior.

### Within Each User Story

- Write the story's tests first and ensure they FAIL before implementing.
- Models (Phase 2) before services; services/libs before route handlers; route handlers
  before UI wiring.
- Tasks touching the same file (e.g., lib/auth.ts in T019, T020, T022, T038, T040) run
  sequentially, not in parallel.

### Parallel Opportunities

- Setup: T002, T003, T004, T005, T006 can run in parallel after T001.
- Foundational: T009, T010, T011, T012, T013 can run in parallel (distinct files) after
  T007/T008; T011–T013 (models) are independent of each other.
- US1 tests T015, T016, T017, T018 can run in parallel; T019 and T021 and T028 are
  parallelizable (distinct files).
- US2: T032, T033, T035 can run in parallel; T034/T036 depend on them.
- Across stories: once Foundational is done, US2 and US3 can be developed alongside US1 by
  different contributors, since each is independently testable.

---

## Implementation Strategy

### MVP First (recommended)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (US1) — this is a deployable, secure MVP: sign in, reach a protected
   page, sign out, with rate limiting. **Suggested MVP scope = User Story 1.**
3. Validate US1 independently (run T015–T018; exercise quickstart scenarios 1–4, 6).

### Incremental Delivery

- Add US2 (navigation shell) → richer authenticated experience.
- Add US3 (session persistence refinements) → smooth daily reuse.
- Finish with Phase 6 (README, deploy docs, DoD gates, security review).

---

## Summary

- **Total tasks**: 46 (T001–T046)
- **Per phase**: Setup 6 · Foundational 8 · US1 16 · US2 6 · US3 4 · Polish 6
- **Per user story**: US1 (P1) 16 · US2 (P2) 6 · US3 (P3) 4
- **Tests included**: 7 (T015–T018, T031, T037, T046)
- **MVP scope**: User Story 1 (Phases 1–3)
