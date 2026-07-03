# Implementation Plan: CS Fundamentals Tracker (Concept Maturity & Readiness)

**Branch**: `feat/05-cs-fundamentals` | **Date**: 2026-07-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-cs-fundamentals/spec.md`

## Summary

Add a CS Fundamentals tracker on top of the existing foundation: the single owner tracks
concept-level readiness across DBMS/OS/Networks/OOP, progressing each concept through
learned → revised → can-explain → interview-ready. Each concept is **one longitudinal record**
(unique by domain + normalized title + normalized subtopic); stage/confidence/notes updates edit it
in place. The user filters (domain, stage, confidence band, not-interview-ready, weak-only) and reads
insights (totals, per-domain, per-stage, interview-ready % overall + per domain, and a ranked
weak-concepts list) to decide what to revise next.

The approach reuses every foundation primitive — the cached serverless-safe Mongoose connection
(`lib/db.ts`), the consistent JSON envelope and error mapping (`lib/http.ts`), `requireApiUser`, Zod
validation, the reusable `ConfirmDialog`, and the App Router shell. A new `CsFundamentalConcept`
model with a unique concept-key index backs Route Handlers under `app/api/cs-fundamentals`. All
domain logic (normalization, key generation, weak-score, summary) lives in `lib/csFundamentals.ts` as
pure/testable functions. No second backend, no new runtime dependencies.

### Key behaviors & reconciliations (spec + prompt)

- **Route (new)**: served at **`/cs-fundamentals`**; there is no existing placeholder, so a Sidebar
  nav item and a middleware matcher entry are added.
- **Identity**: unique by `domain + titleKey + subtopicKey` (title/subtopic normalized: trimmed +
  lowercased). Duplicate create → **409 DUPLICATE_CONCEPT**; longitudinal updates edit in place.
- **Weak-concepts rule** (spec-clarified, deterministic): a concept is weak if `confidence ≤ 2` **or**
  it is stale (`lastRevisedAt` more than **14 days** ago). Ranked by a **combined weakness score**
  `(5 − confidence) × 30 + daysSinceLastRevised` (weakest first), tie-broken by domain then title.
  Confidence dominates; staleness orders within. Documented in code + README.
- **Soft-delete / archive**: `DELETE` is a **soft archive** (`isArchived`). The spec defines it in
  FR-019 (soft delete after confirmation; archived concepts are excluded from the list, counts, and
  insights and are never hard-deleted). `DELETE` sets `isArchived = true` after UI confirmation; the
  list and summary exclude archived by default.
- **Confidence filter**: the API accepts `confidenceMin`/`confidenceMax`; the UI's low/medium/high
  bands map to them (low 1–2, medium 3, high 4–5), satisfying both spec and prompt.
- **`lastRevisedAt`**: normalized to midnight UTC (project convention); defaults to today on create;
  future dates rejected.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js runtime (`runtime = 'nodejs'`)

**Primary Dependencies**: Next.js 15 (App Router), React 19, Mongoose 8, Zod 3, Tailwind CSS 3 — all present; no new dependencies

**Storage**: MongoDB Atlas via the existing cached Mongoose connection (`lib/db.ts`)

**Testing**: Vitest (unit + integration) with `mongodb-memory-server`; handlers invoked directly with `NextRequest`, isolated collections per test (mirrors DSA/Weekly Review tests)

**Target Platform**: Vercel serverless (Node functions) + MongoDB Atlas

**Project Type**: Full-stack Next.js web application (single project; frontend + API colocated)

**Performance Goals**: Add a concept and identify weak areas each in under a minute (SC-001/SC-007); list/filter/summary dominated by indexed queries

**Constraints**: Serverless-safe pooled connection (Principle VI); all writes validated server-side (Principle II/IV); unique concept key at DB + API layers with explicit 409; archive (not hard delete) after confirmation preserves data (Principle II); no operation corrupts another concept (FR-016)

**Scale/Scope**: Single user; hundreds of concepts; one model, ~3 route files, one page, ~5 components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Code Quality & Maintainability | Conventional layout; thin handlers over `lib/csFundamentals.ts`; strict TS | PASS |
| II. Data Integrity & Persistence (NON-NEGOTIABLE) | Server-side validation; timestamps; in-place longitudinal updates; unique concept key; **soft archive + UI confirmation** (no hard delete, no silent loss); explicit not-found/conflict errors | PASS |
| III. Test-Backed Behavior | Unit (normalization/key, weak-score, summary %, enum constraints) + integration (CRUD, archive, auth, duplicate 409, filters, summary) | PASS |
| IV. Security & Privacy by Default | Every endpoint `requireApiUser`-guarded; owner-only data; Zod-validated input; rejects bad ObjectId/params | PASS |
| V. Simplicity First | Reuse framework + existing primitives (incl. `ConfirmDialog`); no new deps; no auto-plans/sync/AI (out of scope FR-017) | PASS |
| VI. Serverless-Aware Architecture | Cached pooled connection; stateless handlers | PASS |
| VII. Consistency & Documentation | Consistent REST routes + JSON envelope + error format; naming consistent with prior slices; README update task included | PASS |

**Result**: PASS (no violations). Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/006-cs-fundamentals/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── cs-fundamentals-api.md  # Phase 1 output
├── checklists/
│   └── requirements.md   # Spec quality checklist (from /speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
models/
└── CsFundamentalConcept.ts     # NEW — model; unique index on (conceptKey); indexes on
                                #       domain, stage, confidence, lastRevisedAt, createdAt; isArchived

lib/
├── csFundamentals.ts           # NEW — normalization + conceptKey, Zod schemas, create/list/get/
│                               #       update/archive, summary + weak-score (pure, testable)
└── constants.ts                # EXTEND — CS_DOMAINS, CS_STAGES, CS_STALE_DAYS (14), weak-score
                                #          weights, confidence bands, list limits

types/
└── index.ts                    # EXTEND — CsConceptDTO, enums, Create/Update inputs, filter, summary DTO

app/
├── api/
│   └── cs-fundamentals/
│       ├── route.ts            # NEW — POST (create) + GET (list, filtered, paginated)
│       ├── [id]/
│       │   └── route.ts        # NEW — GET (single) + PATCH (update) + DELETE (archive)
│       └── summary/
│           └── route.ts        # NEW — GET (totals, per-domain/stage, interview-ready %, weak list)
└── (app)/
    └── cs-fundamentals/
        └── page.tsx            # NEW — compose the CS Fundamentals UI

components/
├── CsConceptForm.tsx           # NEW — create/edit form, client validation, inline errors
├── CsFilterBar.tsx             # NEW — domain / stage / confidence band / not-interview-ready / weak-only
├── CsConceptTable.tsx          # NEW — list rows + quick stage/confidence actions; empty/no-match states
├── CsSummaryPanel.tsx          # NEW — totals, per-domain/stage counts, interview-ready %, weak callout
└── (reuse) ConfirmDialog.tsx   # EXISTING — confirm the archive action

Sidebar.tsx (components/)        # EXTEND — add CS Fundamentals nav item
middleware.ts (root)             # EXTEND — add /cs-fundamentals matcher

tests/
├── unit/
│   └── csFundamentals.test.ts  # NEW — normalization/key, weak-score, summary %, validation
└── integration/
    └── cs-fundamentals.test.ts # NEW — CRUD, archive, auth 401, duplicate 409, not-found 404, filters, summary
```

**Structure Decision**: Single full-stack Next.js project (matches all prior slices and the
constitution's fixed technology standards). API handlers under `app/api/cs-fundamentals`, the page at
a new `app/(app)/cs-fundamentals` route (added to Sidebar + middleware), domain logic in
`lib/csFundamentals.ts`, model in `models/`, shared types in `types/`. Reuses the existing
`ConfirmDialog`. No second service.

## Complexity Tracking

> No constitution violations. This section is intentionally empty.
