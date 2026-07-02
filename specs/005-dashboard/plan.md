# Implementation Plan: Dashboard (At-a-Glance Six-Month Progress)

**Branch**: `feat/04-dashboard` | **Date**: 2026-07-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-dashboard/spec.md`

## Summary

Add the authenticated home screen that shows the single owner an at-a-glance view of six-month
progress: overall completion % (elapsed program time), current week (1–26), total study hours vs the
936-hour target with a progress indicator, current study streak, all-time + current-week DSA problems
solved, this week's goals (from the current week's Weekly Review), and quick links into the three
trackers. Every figure is **derived on demand** from existing data and recomputed on each load — no
new persisted entity, no writes.

A single `GET /api/dashboard/summary` endpoint assembles all metrics in one response using a small
number of efficient queries (no N+1). All formulas live in one place — `lib/dashboard.ts` — as pure,
deterministic functions so they are unit-testable and shared between API and any UI needs. Week logic
is centralized in `lib/weeklyReview.ts` (extended with `currentWeekNumber()`) so the dashboard and
Weekly Review agree on the canonical Monday–Sunday UTC week rule. The `/dashboard` route (existing
placeholder, wired into the Sidebar + middleware) becomes the post-sign-in landing page. Reuses the
cached Mongoose connection, response envelope, and `requireApiUser`. No new dependencies.

### Key behaviors & reconciliations (spec + prompt)

- **Route / landing**: dashboard served at existing **`/dashboard`**; post-authentication landing
  (sign-in success and the app root) routes to `/dashboard`.
- **Completion %** = elapsed program time = `currentWeek / 26` (capped 100%) — spec clarification,
  consistent with the prompt's time-based formula; documented in code + README.
- **Streak** = consecutive calendar days (UTC, matching Daily Log date normalization) with a daily
  log where `studyHours > 0`, ending **today or yesterday**; else 0.
- **Hours progress** exposes raw `totalHoursLogged` and `targetHours = 936`, plus a UI-capped
  `hoursProgressPercentage` (raw total preserved).
- **This week's goals** = the current week's Weekly Review `plannedWork`, else `null` with a
  `weeklyGoalsStatus` of `not_set`.
- **DSA figures (from spec FR-015)**: response includes `dsaTotalSolved` and `dsaSolvedThisWeek`
  (current week range) — additive to the prompt's listed fields.
- **`lastUpdated`** = the server compute time (recompute-on-load; no caching, no realtime push).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js runtime (`runtime = 'nodejs'`)

**Primary Dependencies**: Next.js 15 (App Router), React 19, Mongoose 8, Zod 3 (input validation where needed), Tailwind CSS 3 — all present; no new dependencies

**Storage**: MongoDB Atlas via the existing cached Mongoose connection (`lib/db.ts`); reads DailyLog, DsaProblem, WeeklyReview

**Testing**: Vitest (unit + integration) with `mongodb-memory-server`; pure calc functions unit-tested in isolation; the summary handler invoked directly with `NextRequest` against seeded data

**Target Platform**: Vercel serverless (Node functions) + MongoDB Atlas

**Project Type**: Full-stack Next.js web application (single project; frontend + API colocated)

**Performance Goals**: Dashboard visible within a couple of seconds (SC-001); summary computed in ≤ ~4 queries, no N+1

**Constraints**: Read-only (no writes); deterministic, documented formulas; serverless-safe pooled connection (Principle VI); auth-guarded (Principle IV); graceful zero/empty states, no server errors on empty datasets

**Scale/Scope**: Single user; hundreds of source records; one endpoint, one page, ~4 components, one domain module

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Code Quality & Maintainability | Conventional layout; thin handler delegating to `lib/dashboard.ts`; formulas centralized (no duplication across API/UI); strict TS | PASS |
| II. Data Integrity & Persistence | Read-only aggregation; no writes; ignores nothing silently — documented handling of empty/partial data | PASS (no persistence risk) |
| III. Test-Backed Behavior | Unit tests for week/completion/hours/streak/goals-resolution; integration tests for summary (authorized, unauthorized, seeded values, empty) | PASS |
| IV. Security & Privacy by Default | Endpoint `requireApiUser`-guarded; owner-only data; any query input validated | PASS |
| V. Simplicity First | Reuse prior slices' data/logic; no new deps; no configurable widgets / custom ranges (out of scope FR-013) | PASS |
| VI. Serverless-Aware Architecture | Cached pooled connection; minimal round-trips; stateless handler | PASS |
| VII. Consistency & Documentation | Consistent REST route + JSON envelope; naming consistent with prior slices; README formulas/endpoint task included | PASS |

**Result**: PASS (no violations). Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/005-dashboard/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── dashboard-api.md  # Phase 1 output
├── checklists/
│   └── requirements.md   # Spec quality checklist (from /speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
lib/
├── dashboard.ts                # NEW — pure calc (completionPercent, hoursProgress, computeStreak)
│                               #       + getDashboardSummary (queries + assembles the DTO)
├── weeklyReview.ts             # EXTEND — export currentWeekNumber() (canonical week from today)
└── constants.ts                # EXTEND — STUDY_HOURS_TARGET = 936

types/
└── index.ts                    # EXTEND — DashboardSummaryDTO

app/
├── api/
│   └── dashboard/
│       └── summary/
│           └── route.ts        # NEW — GET (all dashboard metrics in one response)
└── (app)/
    └── dashboard/
        └── page.tsx            # REPLACE placeholder — dashboard home UI (landing page)

components/
├── DashboardStatCard.tsx       # NEW — labelled metric card (reusable)
├── DashboardProgressBar.tsx    # NEW — hours-toward-target progress indicator
└── DashboardQuickLinks.tsx     # NEW — cards/links to Daily Log, DSA, Weekly Review

tests/
├── unit/
│   └── dashboard.test.ts       # NEW — current week, completion %, hours %, streak boundaries, goals resolution
└── integration/
    └── dashboard.test.ts       # NEW — summary: authorized values (seeded), unauthorized 401, empty-data
```

**Structure Decision**: Single full-stack Next.js project (matches all prior slices and the
constitution's fixed technology standards). One aggregation endpoint under `app/api/dashboard`, the
page at the existing `app/(app)/dashboard` route (also the landing page), all formulas in
`lib/dashboard.ts`, shared types in `types/`. No new model, no second service, no data duplication —
the dashboard reads the prior slices' collections directly and reuses their indexes.

## Complexity Tracking

> No constitution violations. This section is intentionally empty.
