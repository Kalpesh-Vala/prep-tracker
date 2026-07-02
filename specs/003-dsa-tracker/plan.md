# Implementation Plan: DSA Problem Tracker (Log, Filter, and Spot Weak Topics)

**Branch**: `feat/02-dsa-tracker` | **Date**: 2026-07-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-dsa-tracker/spec.md`

## Summary

Add a DSA problem tracker on top of the existing foundation: the single authenticated owner logs
each practiced problem (title, topic/subtopic, difficulty, platform, time taken, attempt type,
solved-without-hints, time/space complexity, confidence 1–5, needs-revision, interview-worthy),
browses a filterable list, edits and deletes entries (delete confirmed), and reads simple insights
(total solved, per-topic counts, weakest topics). Each entry is an independent practice record.

The approach reuses every foundation primitive — the cached serverless-safe Mongoose connection
(`lib/db.ts`), the consistent JSON envelope and error mapping (`lib/http.ts`), the `requireApiUser`
session guard (`lib/auth.ts`), Zod boundary validation, and the App Router navigation shell (the
`/dsa` route already exists as a placeholder and is wired into the Sidebar + middleware). A new
`DsaProblem` Mongoose model with filter/sort indexes backs new Route Handlers under `app/api/dsa`
(list/create, id-scoped get/update/delete, and a summary endpoint). A new `/dsa` page composes
reusable client components (form, filter bar, table, delete-confirm, summary). No second backend,
no new runtime dependencies.

### Key behaviors & reconciliations (spec + prompt)

- **Route**: implemented at **`/dsa`** (existing Sidebar/middleware convention), not `/dsa-tracker`.
- **Practice records**: each entry is a separate record; the same title may recur. Total and
  per-topic counts count records (spec clarification 2026-07-02).
- **Weakest topics**: ranked by **lowest average confidence first, ties broken by higher
  needs-revision count** (spec clarification), computed **globally** over all problems regardless of
  active list filters (spec FR-016).
- **Topic filter**: a selection of existing normalized topics, matched exactly (spec clarification).
- **`solvedOn` field**: each record carries a solved-date (defaults to today, past allowed, future
  rejected) to support reverse-chronological ordering and honest backfill. Now listed in spec
  FR-002/Key Entities (clarification 2026-07-02).
- **`countsByDifficulty`**: the summary also returns per-difficulty counts, now included in spec
  FR-008 alongside the total and per-topic counts.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js runtime (route handlers `runtime = 'nodejs'`)

**Primary Dependencies**: Next.js 15 (App Router), React 19, Mongoose 8, Zod 3, Tailwind CSS 3 — all present; no new dependencies

**Storage**: MongoDB Atlas via the existing cached Mongoose connection (`lib/db.ts`)

**Testing**: Vitest (unit + integration) with `mongodb-memory-server`; route handlers invoked directly with `NextRequest`, isolated collections per test (mirrors Daily Log tests)

**Target Platform**: Vercel serverless (Node functions) + MongoDB Atlas

**Project Type**: Full-stack Next.js web application (single project; frontend and API colocated)

**Performance Goals**: Log a problem in under a minute (SC-001); list/filter and summary dominated by indexed queries; single-user scale

**Constraints**: Serverless-safe pooled connection (Principle VI); all writes validated server-side (Principle II/IV); delete requires explicit confirmation and is id-scoped (Principle II); no operation may corrupt other records (FR-013)

**Scale/Scope**: Single user; hundreds of problem records over a prep period; one model, ~3 route files, one page, ~5 components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Code Quality & Maintainability | Conventional App Router layout; thin handlers delegating to `lib/dsa.ts`; strict TS, no unjustified `any` | PASS |
| II. Data Integrity & Persistence (NON-NEGOTIABLE) | Reliable persistence; server-side validation; `createdAt`/`updatedAt`; id-scoped update/delete; **delete confirmed in UI**; explicit schema + not-found errors | PASS |
| III. Test-Backed Behavior | Unit (validation, weak-topic calc, topic normalization) + integration (CRUD, auth, invalid payload, not-found, filters, summary) | PASS |
| IV. Security & Privacy by Default | Every endpoint `requireApiUser`-guarded; owner-only data; Zod-validated untrusted input; rejects bad ObjectId/query params | PASS |
| V. Simplicity First | Reuse framework + existing primitives; no new deps; no spaced-repetition/sync (out of scope FR-014); simple explainable weak-topic rule | PASS |
| VI. Serverless-Aware Architecture | Cached pooled connection; stateless handlers | PASS |
| VII. Consistency & Documentation | Consistent REST routes + JSON envelope + error format; naming consistent with Daily Log; README update task included | PASS |

**Result**: PASS (no violations). Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/003-dsa-tracker/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── dsa-api.md        # Phase 1 output
├── checklists/
│   └── requirements.md   # Spec quality checklist (from /speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
models/
└── DsaProblem.ts               # NEW — Mongoose model; indexes on topic, difficulty,
                                #       needsRevision, interviewWorthy, solvedOn(desc)

lib/
├── dsa.ts                      # NEW — domain logic: Zod schemas, topic normalization,
│                               #       create/list/get/update/delete, summary + weak-topic calc
└── constants.ts                # EXTEND — DSA enums (difficulty, attemptType), confidence bounds,
                                #          list default/max limit, weak-topics surfaced count

types/
└── index.ts                    # EXTEND — DsaProblemDTO, enums, create/update/filter/summary types

app/
├── api/
│   └── dsa/
│       ├── route.ts            # NEW — POST (create) + GET (list, filtered, paginated, newest-first)
│       ├── [id]/
│       │   └── route.ts        # NEW — GET (single) + PATCH (update) + DELETE (remove)
│       └── summary/
│           └── route.ts        # NEW — GET (totalSolved, countsByTopic, countsByDifficulty, weakTopics)
└── (app)/
    └── dsa/
        └── page.tsx            # REPLACE placeholder — compose the DSA tracker UI

components/
├── DsaProblemForm.tsx          # NEW — create/edit form, client validation, inline errors
├── DsaFilterBar.tsx            # NEW — topic (from existing) / difficulty / needsRevision / interviewWorthy
├── DsaProblemTable.tsx         # NEW — list rows + row actions (view/edit/delete); empty states
├── DsaSummaryPanel.tsx         # NEW — total, per-topic counts, weak-topics callout
└── ConfirmDialog.tsx           # NEW — reusable confirm modal for destructive delete

tests/
├── unit/
│   └── dsa.test.ts             # NEW — validation, weak-topic calc, topic normalization
└── integration/
    └── dsa.test.ts             # NEW — CRUD, auth 401, invalid 400, not-found 404, filters, summary
```

**Structure Decision**: Single full-stack Next.js project (matches the foundation and Daily Log
slices and the constitution's fixed technology standards). API handlers under `app/api/dsa`, the
page under the existing `app/(app)/dsa` route, shared domain logic in `lib/dsa.ts`, model in
`models/`, shared types in `types/`. No `backend/`/`frontend/` split and no second service.

## Complexity Tracking

> No constitution violations. This section is intentionally empty.
