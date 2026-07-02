# Implementation Plan: Weekly Review (Structured Weekly Retrospective)

**Branch**: `feat/03-weekly-review` | **Date**: 2026-07-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-weekly-review/spec.md`

## Summary

Add a Weekly Review capability on top of the existing foundation: the single authenticated owner
records one structured retrospective per week (planned vs. completed, study hours, problems solved,
DSA success rate, weak topics, wins, next-week adjustments), edits and views a single week, and
browses all reviews newest-first with the weak-topics/wins trend visible. A `GET .../prefill`
endpoint derives suggested totals (study hours from Daily Log, problems solved + suggested weak
topics from DSA entries) for a week; suggestions are editable and stored as a snapshot on save.

The approach reuses every foundation primitive — the cached serverless-safe Mongoose connection
(`lib/db.ts`), the consistent JSON envelope and error mapping (`lib/http.ts`), the `requireApiUser`
session guard (`lib/auth.ts`), Zod validation, and the App Router shell (the `/weekly-review` route
already exists as a placeholder, wired into the Sidebar + middleware). A new `WeeklyReview` model
with a unique index on `weekNumber` backs Route Handlers under `app/api/weekly-review`. Prefill
reuses the existing `DailyLog` and `DsaProblem` data and `computeDsaSummary` from `lib/dsa.ts`. No
second backend, no new runtime dependencies.

### Canonical week boundary rule

- The prep spans **26 weeks**. Week `N` (1–26) spans a fixed 7-day block:
  `weekStartDate = PREP_START_DATE + (N-1)×7 days`, `weekEndDate = weekStartDate + 6 days`, all
  normalized to **midnight UTC**. `PREP_START_DATE` is a documented configuration constant expected
  to fall on a Monday (Monday→Sunday weeks, matching the Sunday-end review cadence).
- `weekNumber` is the **canonical identity** and uniqueness key. `weekStartDate`/`weekEndDate` are
  **derived server-side** from `weekNumber` (client-supplied dates are ignored/validated against the
  derived range) so API validation, unique-week enforcement, and prefill windows all use one rule.

### Key behaviors & reconciliations (spec + prompt)

- **Route**: `/weekly-review` (existing Sidebar/middleware); API under `app/api/weekly-review`.
- **One review per week**: unique index on `weekNumber`; a duplicate create returns **409**.
- **Prefill is suggestion-only**: never auto-creates or overwrites a review; confirmed values are a
  **snapshot** (FR-016) not live-linked to source data afterward.
- **`dsaAccuracyPercent` is optional** (0–100 if provided) — reconciled to the prompt; the spec
  Assumptions are updated to match (was previously listed as required).
- **`suggestedDsaAccuracyPercent` is not derivable**: DSA entries record only solved problems (no
  failed attempts), so prefill returns it as `null` with an explanatory metadata note; solved count
  and suggested weak topics ARE derived.
- **Additions from the prompt** (included): `prefillSourceUsed` boolean flag; `weakTopics` stored as
  an array of trimmed strings (may be empty).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js runtime (`runtime = 'nodejs'`)

**Primary Dependencies**: Next.js 15 (App Router), React 19, Mongoose 8, Zod 3, Tailwind CSS 3 — all present; no new dependencies

**Storage**: MongoDB Atlas via the existing cached Mongoose connection (`lib/db.ts`)

**Testing**: Vitest (unit + integration) with `mongodb-memory-server`; handlers invoked directly with `NextRequest`, isolated collections per test (mirrors Daily Log / DSA tests)

**Target Platform**: Vercel serverless (Node functions) + MongoDB Atlas

**Project Type**: Full-stack Next.js web application (single project; frontend + API colocated)

**Performance Goals**: Complete a review in a few minutes (SC-001); prefill and list dominated by indexed queries over a single user's data

**Constraints**: Serverless-safe pooled connection (Principle VI); all writes validated server-side (Principle II/IV); unique-week at DB + API layers with explicit 409; prefill deterministic and side-effect-free; no operation corrupts another review (FR-012)

**Scale/Scope**: Single user; ≤26 reviews; one model, ~3 route files, one page, ~4 components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Code Quality & Maintainability | Conventional App Router layout; thin handlers delegating to `lib/weeklyReview.ts`; strict TS | PASS |
| II. Data Integrity & Persistence (NON-NEGOTIABLE) | Reliable persistence; server-side validation; timestamps; unique `weekNumber` + insert-only create (no upsert); snapshot totals; explicit not-found/conflict errors | PASS |
| III. Test-Backed Behavior | Unit (week boundary/normalization, uniqueness, prefill aggregation, weak-topic rule) + integration (CRUD, auth, 409 duplicate, invalid payload, prefill full/partial/none) | PASS |
| IV. Security & Privacy by Default | Every endpoint `requireApiUser`-guarded; owner-only data; Zod-validated input; rejects bad ObjectId/params | PASS |
| V. Simplicity First | Reuse framework + existing primitives and DSA weak-topic logic; no new deps; no automated coaching (out of scope FR-013) | PASS |
| VI. Serverless-Aware Architecture | Cached pooled connection; stateless handlers; prep-start config externalized as a constant | PASS |
| VII. Consistency & Documentation | Consistent REST routes + JSON envelope + error format; naming consistent with prior slices; README update task included | PASS |

**Result**: PASS (no violations). Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/004-weekly-review/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── weekly-review-api.md  # Phase 1 output
├── checklists/
│   └── requirements.md   # Spec quality checklist (from /speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
models/
└── WeeklyReview.ts             # NEW — Mongoose model; unique index on weekNumber;
                                #       indexes on weekStartDate(desc), weekNumber

lib/
├── weeklyReview.ts             # NEW — domain: week-boundary calc from PREP_START_DATE, Zod
│                               #       schemas, create/list/get/update, prefill aggregation
└── constants.ts                # EXTEND — PREP_START_DATE, PREP_TOTAL_WEEKS (26), WR text/limit consts

types/
└── index.ts                    # EXTEND — WeeklyReviewDTO, Create/Update inputs, WeeklyPrefillDTO

app/
├── api/
│   └── weekly-review/
│       ├── route.ts            # NEW — POST (create) + GET (list, newest-first, paginated)
│       ├── [id]/
│       │   └── route.ts        # NEW — GET (single) + PATCH (update)
│       └── prefill/
│           └── route.ts        # NEW — GET (suggested totals for a week + coverage metadata)
└── (app)/
    └── weekly-review/
        └── page.tsx            # REPLACE placeholder — compose the Weekly Review UI

components/
├── WeeklyReviewForm.tsx        # NEW — create/edit form + week selector + "Prefill" action
├── WeeklyReviewList.tsx        # NEW — newest-first list showing week + weak topics + wins; empty state
└── WeeklyReviewDetail.tsx      # NEW — single-week full view

tests/
├── unit/
│   └── weeklyReview.test.ts    # NEW — week boundary/key, uniqueness, prefill aggregation, weak-topic rule
└── integration/
    └── weekly-review.test.ts   # NEW — CRUD, auth 401, duplicate 409, invalid 400, prefill (full/partial/none)
```

**Structure Decision**: Single full-stack Next.js project (matches the foundation, Daily Log, and
DSA slices and the constitution's fixed technology standards). API handlers under
`app/api/weekly-review`, the page under the existing `app/(app)/weekly-review` route, domain logic
in `lib/weeklyReview.ts`, model in `models/`, shared types in `types/`. No second service. There is
no delete capability (out of scope for this slice).

## Complexity Tracking

> No constitution violations. This section is intentionally empty.
