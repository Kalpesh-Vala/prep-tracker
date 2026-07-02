# Implementation Plan: Daily Log (Accurate Daily Preparation Capture)

**Branch**: `feat/01-daily-log` | **Date**: 2026-06-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-daily-log/spec.md`

## Summary

Add a Daily Log capability on top of the existing foundation slice: the single authenticated
owner captures one entry per calendar day (study hours, learning summary, DSA problems solved,
revision flag, biggest challenge, next-day goal, optional low/medium/high energy level), browses
past entries newest-first, and edits any prior day — with a hard guarantee that no previously
logged day is ever silently lost or overwritten.

The technical approach reuses every foundation primitive: the cached serverless-safe Mongoose
connection (`lib/db.ts`), the consistent JSON response envelope and error mapping (`lib/http.ts`),
server-side session auth (`lib/auth.ts` + `pt_session` cookie), Zod boundary validation, and the
existing App Router navigation shell. A new `DailyLog` Mongoose model enforces one-entry-per-day
via a unique index on a normalized date. New Route Handlers under `app/api/daily-log` provide
create / list / read / update, all auth-guarded. A new `/daily-log` page composes reusable
client components for the form, history list, and single-entry view. No second backend, no second
database pattern, no new runtime dependencies.

### Key behaviors (aligned with spec clarifications)

- **Energy level**: optional value from a small enum — `low | medium | high` — stored as a string.
- **Creation scope**: `POST` creates an entry for a chosen calendar date that **defaults to today**
  and may be a **past date** (backfill a missed day); future dates are rejected. Editing a past day
  also remains available via `PATCH`.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js runtime (route handlers `runtime = 'nodejs'`)

**Primary Dependencies**: Next.js 15 (App Router), React 19, Mongoose 8, Zod 3, Tailwind CSS 3 — all already present; no new dependencies

**Storage**: MongoDB Atlas via the existing cached Mongoose connection (`lib/db.ts`)

**Testing**: Vitest (unit + integration) with `mongodb-memory-server`; route handlers invoked directly with `NextRequest`, isolated collections per test

**Target Platform**: Vercel serverless (Node functions) + MongoDB Atlas

**Project Type**: Full-stack Next.js web application (single project; frontend and API colocated)

**Performance Goals**: User can capture a complete entry in under one minute (SC-001); list/read/write latency dominated by a single indexed MongoDB query

**Constraints**: Serverless-safe pooled connection (no per-request connections, Principle VI); all writes validated server-side (Principle II/IV); append-only integrity — no operation may remove or overwrite another day's entry (FR-011)

**Scale/Scope**: Single user; ~180 entries over a six-month prep period; one new model, four route handlers, one page, ~3 reusable components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Code Quality & Maintainability | Conventional App Router layout (`app/`, `components/`, `lib/`, `models/`, `types/`); thin route handlers delegating validation/data-access to dedicated modules; strict TS, no unjustified `any` | PASS — design keeps handlers thin and puts validation in `lib/dailyLog.ts` |
| II. Data Integrity & Persistence (NON-NEGOTIABLE) | Reliable MongoDB persistence; server-side validation before write; `createdAt`/`updatedAt` on every doc; history never destroyed; explicit schema | PASS — unique date index + create-vs-update separation guarantee no silent loss (FR-003, FR-004, FR-011) |
| III. Test-Backed Behavior | Unit tests for validation + one-per-day rule; integration tests for success, validation-failure, duplicate-conflict, unauthorized | PASS — test plan covers all four classes |
| IV. Security & Privacy by Default | Every endpoint auth-guarded; only the owner's data; untrusted input validated/sanitized against injection | PASS — shared `requireApiUser` guard; Zod parsing; no raw query interpolation |
| V. Simplicity First | Simplest design; reuse framework + existing primitives; no speculative abstraction; stay in scope | PASS — no new deps, no aggregation/charts (explicitly out of scope, FR-014) |
| VI. Serverless-Aware Architecture | Cached pooled connection; stateless handlers; externalized config | PASS — reuses `dbConnect()`; no in-memory state |
| VII. Consistency & Documentation | Consistent REST routes + JSON envelope + error format; consistent naming DB↔types↔API↔UI; README/docs updated | PASS — mirrors auth-api contract style; README update task included |

**Result**: PASS (no violations). Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/002-daily-log/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── daily-log-api.md  # Phase 1 output
├── checklists/
│   └── requirements.md   # Spec quality checklist (from /speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
models/
└── DailyLog.ts                 # NEW — Mongoose model; unique index on normalized `date`

lib/
└── dailyLog.ts                 # NEW — domain logic: Zod schemas, date normalization,
                                #       validation, create/list/get/update data access
                                #       (keeps route handlers thin, Principle I)
                                # (auth.ts gains a small `requireApiUser` request guard)

types/
└── index.ts                    # EXTEND — add DailyLog DTO + energy/payload types

app/
├── api/
│   └── daily-log/
│       ├── route.ts            # NEW — POST (create for date, default today) + GET (list, reverse-chron, paginated)
│       └── [id]/
│           └── route.ts        # NEW — GET (single) + PATCH (update by id)
└── (app)/
    └── daily-log/
        └── page.tsx            # REPLACE placeholder — server page composing the UI

components/
├── DailyLogForm.tsx            # NEW — create/edit form, client-side validation mirroring server
├── DailyLogList.tsx            # NEW — reverse-chronological history list + empty state
└── DailyLogEntryView.tsx       # NEW — single-entry read view

tests/
├── unit/
│   └── dailyLog.test.ts        # NEW — validation + one-entry-per-day rule + date normalization
└── integration/
    └── daily-log.test.ts       # NEW — API: success, validation-fail, duplicate 409, unauthorized 401
```

**Structure Decision**: Single full-stack Next.js project (matches the foundation slice and the
constitution's fixed technology standards). Frontend pages/components and API route handlers are
colocated under `app/`, shared domain logic in `lib/`, the data model in `models/`, and shared
types in `types/`. No `backend/`/`frontend/` split and no second project are introduced.

## Complexity Tracking

> No constitution violations. This section is intentionally empty.
