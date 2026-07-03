---
description: "Task list for CS Fundamentals Tracker implementation"
---

# Tasks: CS Fundamentals Tracker (Concept Maturity & Readiness)

**Input**: Design documents from `/specs/006-cs-fundamentals/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/cs-fundamentals-api.md](contracts/cs-fundamentals-api.md)

**Tests**: Included — the constitution (Principle III) and the plan require unit tests (normalization/key, weak-score, summary %, validation) and integration tests (CRUD, archive, auth, duplicate 409, filters, summary).

**Organization**: Tasks are grouped by user story, ordered by priority (P1 first). Each story is independently testable through its own endpoints/components.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1, US2, US3, US4, US5, US6
- All paths are repository-root-relative and concrete.

## Conventions (from plan.md)

- Full-stack Next.js App Router (single project). API handlers under `app/api/cs-fundamentals/`, the
  page at a NEW `app/(app)/cs-fundamentals/` route (added to Sidebar + middleware), reusable UI in
  `components/`, domain logic in `lib/csFundamentals.ts`, model in `models/`, shared types in
  `types/`. Reuses `lib/db.ts`, `lib/http.ts`, `requireApiUser`, and the existing `ConfirmDialog`
  (for archive). No new dependencies.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared constants the feature depends on.

- [x] T001 [P] Add CS constants (`CS_DOMAINS` = ['DBMS','OS','NETWORKS','OOP'], `CS_STAGES` = ['learned','revised','can_explain','interview_ready'], `CS_STALE_DAYS` = 14, weak-score weight, confidence-band bounds, text length caps, `CS_DEFAULT_LIMIT`/`CS_MAX_LIMIT`) to lib/constants.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core model, types, domain base, and the new route's nav/guard wiring.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 [P] Add shared CS types (`CsDomain`, `CsStage`, `CsConceptDTO`, `CreateCsConceptInput`, `UpdateCsConceptInput`, `CsFilter`, `CsSummaryDTO`) to types/index.ts
- [x] T003 [P] Create `CsFundamentalConcept` Mongoose model with `{ timestamps: true }`, a **unique index on `conceptKey`**, indexes on `domain`/`stage`/`confidence`/`lastRevisedAt`/`createdAt`, and `isArchived` (default false), per data-model.md, in models/CsFundamentalConcept.ts
- [x] T004 Create lib/csFundamentals.ts base: string normalization + `conceptKey` builder, UTC `lastRevisedAt` normalization + future-date guard, shared Zod field schemas, typed errors (`InvalidConceptError`, `ConceptNotFoundError`, `DuplicateConceptError`), and `toCsConceptDTO` serializer (depends on T001, T002, T003)
- [x] T005 [P] Add a "CS Fundamentals" nav item (`/cs-fundamentals`) to components/Sidebar.tsx and a `/cs-fundamentals/:path*` entry to the middleware.ts matcher

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 - Add a CS concept (Priority: P1) 🎯 MVP

**Goal**: The owner can add a concept capturing all fields, persisted as one record.

**Independent Test**: Sign in, add a concept with valid values, save, and confirm it is persisted and appears in the list.

### Tests for User Story 1 ⚠️ (write first, ensure they fail)

- [x] T006 [P] [US1] Unit tests for create validation + normalization/`conceptKey` (domain/stage enums, confidence 1–5, required title, future last-revised rejected, key from domain+title+subtopic) in tests/unit/csFundamentals.test.ts
- [x] T007 [P] [US1] Integration tests for `POST /api/cs-fundamentals`: success → 201; invalid body → 400 with nothing persisted, in tests/integration/cs-fundamentals.test.ts

### Implementation for User Story 1

- [x] T008 [US1] Add `createConcept(input)` + create Zod schema (derive `conceptKey`; map duplicate-key → `DuplicateConceptError`) to lib/csFundamentals.ts (depends on T004)
- [x] T009 [US1] Implement `POST` handler in app/api/cs-fundamentals/route.ts (`runtime='nodejs'`; `requireApiUser` → 401; validate → create → 201; `DuplicateConceptError` → 409; `InvalidConceptError` → 400) (depends on T008)
- [x] T010 [P] [US1] Build `CsConceptForm` (all fields; domain/stage selects; confidence 1–5; last-revised defaults to today; tags & question refs; client validation with inline errors) in components/CsConceptForm.tsx
- [x] T011 [US1] Create app/(app)/cs-fundamentals/page.tsx to render the add form and POST on submit, showing the saved concept (depends on T009, T010)

**Checkpoint**: A concept can be added end-to-end and persisted (SC-001).

---

## Phase 4: User Story 2 - View and filter concepts (Priority: P1)

**Goal**: The owner sees all non-archived concepts and filters by domain, stage, confidence band, not-interview-ready, and weak-only.

**Independent Test**: With concepts across domains/stages/confidence, apply each filter and combination and confirm only matching concepts show.

### Tests for User Story 2 ⚠️

- [x] T012 [P] [US2] Integration tests for `GET /api/cs-fundamentals`: each filter (domain, stage, confidenceMin/Max, notInterviewReady, weakOnly), a combination, pagination, empty and no-match; archived excluded; and `GET [id]` returns `createdAt`/`updatedAt` (FR-015), in tests/integration/cs-fundamentals.test.ts

### Implementation for User Story 2

- [x] T013 [US2] Add `listConcepts(filter)` (exclude archived; AND-combined filters; stable sort `createdAt` desc; pagination) + filter Zod schema to lib/csFundamentals.ts (depends on T004)
- [x] T014 [US2] Implement `GET` (list) handler in app/api/cs-fundamentals/route.ts (`requireApiUser` → 401; validate query → list → 200 with `{ items, page, limit, total, totalPages }`) (depends on T013; same file as T009)
- [x] T015 [P] [US2] Build `CsConceptTable` (rows: domain, title/subtopic, stage, confidence, last-revised; row actions; empty + no-match states) in components/CsConceptTable.tsx
- [x] T016 [P] [US2] Build `CsFilterBar` (domain, stage, confidence band low/medium/high, not-interview-ready, weak-only) in components/CsFilterBar.tsx
- [x] T017 [US2] Add `getConcept(id)` to lib/csFundamentals.ts and implement `GET` (single) handler in app/api/cs-fundamentals/[id]/route.ts, returning the concept including `createdAt`/`updatedAt` (asserted in the fetch integration test) (depends on T004)
- [x] T018 [US2] Render the list + filter bar on app/(app)/cs-fundamentals/page.tsx (fetch with active filters; empty/no-match states) (depends on T014, T015, T016)

**Checkpoint**: The filtered list shows exactly matching concepts (SC-002, FR-006, FR-018).

---

## Phase 5: User Story 3 - Progress a concept's maturity stage (Priority: P2)

**Goal**: The owner updates a concept's stage (and confidence/last-revised) in place; the same record updates, never duplicating.

**Independent Test**: Create a concept at "learned", advance to "revised" then "interview_ready", and confirm exactly one record with the latest stage.

### Tests for User Story 3 ⚠️

- [x] T019 [P] [US3] Integration test: `PATCH` a concept's stage/confidence updates in place (200); no new record is created; other concepts untouched; **and a `PATCH` that renames a concept into an existing (domain, title, subtopic) returns 409 `DUPLICATE_CONCEPT`**, in tests/integration/cs-fundamentals.test.ts

### Implementation for User Story 3

- [x] T020 [US3] Add `updateConcept(id, patch)` + update Zod schema (recompute `conceptKey` if domain/title/subtopic change and re-check uniqueness → `DuplicateConceptError`) to lib/csFundamentals.ts (depends on T004)
- [x] T021 [US3] Implement `PATCH` handler in app/api/cs-fundamentals/[id]/route.ts (`requireApiUser` → 401; validate → update → 200; 404; 409 on rename collision) (depends on T017, T020; same file as T017)
- [x] T022 [US3] Add quick stage/confidence update actions to `CsConceptTable` (inline `PATCH`) and refresh the list/summary in app/(app)/cs-fundamentals/page.tsx (depends on T018, T021)

**Checkpoint**: Stage progression keeps one record per concept (SC-006, FR-003).

---

## Phase 6: User Story 4 - Readiness insights and weak concepts (Priority: P2)

**Goal**: The owner sees total, per-domain and per-stage counts, interview-ready % overall and per domain, and a ranked weak-concepts list.

**Independent Test**: With a known set of concepts, confirm the totals, counts, percentages, and weak-concepts ranking match expected values.

### Tests for User Story 4 ⚠️

- [x] T023 [P] [US4] Unit tests for the weak-concept rule + combined-score ranking (confidence ≤ 2 or stale > 14 days; `(5−confidence)×30 + daysStale`; tie-break) and interview-ready percentage math in tests/unit/csFundamentals.test.ts
- [x] T024 [P] [US4] Integration test for `GET /api/cs-fundamentals/summary`: correct `totalConcepts`, `countsByDomain`, `countsByStage`, interview-ready % overall/by-domain, and `weakConcepts` ordering (archived excluded) in tests/integration/cs-fundamentals.test.ts

### Implementation for User Story 4

- [x] T025 [US4] Add `getCsSummary()` (over non-archived concepts: totals, per-domain/stage counts, interview-ready % overall + per domain rounded, weak-concepts ranked) to lib/csFundamentals.ts (depends on T004)
- [x] T026 [US4] Implement `GET` handler in app/api/cs-fundamentals/summary/route.ts (`requireApiUser` → 401; compute → 200) (depends on T025)
- [x] T027 [P] [US4] Build `CsSummaryPanel` (total, per-domain + per-stage counts, interview-ready % overall/by-domain, weak-concepts callout) in components/CsSummaryPanel.tsx
- [x] T028 [US4] Render the summary panel on app/(app)/cs-fundamentals/page.tsx (depends on T026, T027)

**Checkpoint**: Insights are accurate; weak concepts ranked (SC-003, SC-004, SC-005).

---

## Phase 7: User Story 5 - Edit details and archive (Priority: P2)

**Goal**: The owner edits any concept in place; and can archive (soft-delete) a concept after confirmation, retaining its data and excluding it from list/insights.

**Independent Test**: Edit a concept and confirm it persists with no other concept changed; archive a concept and confirm it leaves the list/summary while its data is retained.

### Tests for User Story 5 ⚠️

- [x] T029 [P] [US5] Unit test for update validation (partial fields; identity recompute) in tests/unit/csFundamentals.test.ts
- [x] T030 [P] [US5] Integration test: `PATCH` edit-in-place (200, others untouched, 404); `DELETE` archive → 200 `{ archived, id }`, concept excluded from list + summary, still retained; 404 for unknown id, in tests/integration/cs-fundamentals.test.ts

### Implementation for User Story 5

- [x] T031 [US5] Add `archiveConcept(id)` (set `isArchived = true`; 404 when missing) to lib/csFundamentals.ts (depends on T004)
- [x] T032 [US5] Implement `DELETE` (archive) handler in app/api/cs-fundamentals/[id]/route.ts (`requireApiUser` → 401; archive → 200; 404) (depends on T021, T031; same file as T021)
- [x] T033 [US5] Add edit mode to `CsConceptForm` (pre-fill; `PATCH` on save) and wire the edit flow in app/(app)/cs-fundamentals/page.tsx (depends on T010, T022)
- [x] T034 [US5] Add an archive action to `CsConceptTable` using the reusable `ConfirmDialog`, calling `DELETE` and refreshing the list/summary, in components/CsConceptTable.tsx and app/(app)/cs-fundamentals/page.tsx (depends on T032, T033)

**Checkpoint**: Concepts are editable and archivable without data loss (FR-004, FR-016, FR-019).

---

## Phase 8: User Story 6 - Prevent duplicate concepts (Priority: P3)

**Goal**: A create for an already-tracked (domain, title, subtopic) is prevented and routes the user to update the existing concept.

**Independent Test**: Create a concept, attempt to create another with the same domain+title+subtopic, confirm a 409 and the original intact.

### Tests for User Story 6 ⚠️

- [x] T035 [P] [US6] Integration test: duplicate-concept `POST` returns 409 `DUPLICATE_CONCEPT` and the original is unchanged, in tests/integration/cs-fundamentals.test.ts

### Implementation for User Story 6

- [x] T036 [US6] On a 409 response, route the user to update the existing concept (look it up by domain+title+subtopic and open it in edit mode) in app/(app)/cs-fundamentals/page.tsx and components/CsConceptForm.tsx (depends on T011, T033)

**Checkpoint**: Duplicate concepts are impossible; the original is never overwritten (SC-006, FR-012).

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Cross-cutting security tests, docs, and full validation.

- [x] T037 [P] Add unauthorized-access integration tests (no session → 401) across `POST`, `GET` list, `GET [id]`, `PATCH`, `DELETE`, and `GET summary` in tests/integration/cs-fundamentals.test.ts
- [x] T038 [P] Update README.md with the concept lifecycle, domains, weak-concept rule, summary metric definitions, and the endpoint + query-param contract (per contracts/cs-fundamentals-api.md)
- [x] T039 [P] Confirm `.env.example` needs no new variables (only `MONGODB_URI`/`AUTH_SECRET`)
- [x] T040 Run `npm run typecheck`, `npm run lint`, and `npm test`; resolve any failures (zero-error gate, Constitution Principles I & III)
- [x] T041 Execute the [quickstart.md](quickstart.md) manual walkthrough to validate SC-001..SC-007

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**.
- **User Stories (Phases 3–8)**: All depend on Foundational. Recommended order by priority: US1 → US2 → US3 → US4 → US5 → US6.
- **Polish (Phase 9)**: Depends on all targeted stories being complete.

### Story Dependencies & Independence

- **US1 (P1)**: Depends on Foundational. Delivers the MVP (create + persist, incl. 409 integrity from the unique index).
- **US2 (P1)**: Depends on Foundational; adds `GET` list to the shared `route.ts` (after T009) and `GET [id]`. Independently testable via those endpoints.
- **US3 (P2)**: Depends on Foundational; adds `PATCH [id]`. Independently testable via the update endpoint.
- **US4 (P2)**: Depends on Foundational; adds the summary endpoint (own file). Independently testable via `/summary`.
- **US5 (P2)**: Depends on US3's `[id]` route (adds `DELETE` archive) and reuses the form + `ConfirmDialog`. Independently testable via edit + archive.
- **US6 (P3)**: Builds on US1 create + US5 edit to route duplicates to editing; testable via the 409 path.

### Shared-file sequencing (cannot be parallel)

- lib/csFundamentals.ts — T004 then T008/T013/T017/T020/T025/T031 (sequential edits).
- app/api/cs-fundamentals/route.ts — T009 (US1) then T014 (US2).
- app/api/cs-fundamentals/[id]/route.ts — T017 (US2) then T021 (US3) then T032 (US5).
- app/(app)/cs-fundamentals/page.tsx — T011 → T018 → T022 → T028 → T033/T034 → T036 (progressive).
- components/CsConceptForm.tsx — T010 (US1) then T033 (US5).
- components/CsConceptTable.tsx — T015 (US2) then T022 (US3) then T034 (US5).
- tests/unit/csFundamentals.test.ts — T006 → T023 → T029.
- tests/integration/cs-fundamentals.test.ts — T007 → T012 → T019 → T024 → T030 → T035 → T037.

### Within Each User Story

- Tests are written first and must fail before implementation.
- lib domain function → route handler → component → page wiring.

---

## Parallel Opportunities

- **Foundational**: T002, T003, T005 are `[P]` (distinct files); T004 follows.
- **US1**: T006 (unit) and T007 (integration) run `[P]`; T010 (component) runs `[P]` with lib/handler work.
- **US2**: T015 and T016 (distinct component files) run `[P]` with the lib/handler tasks.
- **US4**: T023 (unit), T024 (integration), and T027 (component) run `[P]`.
- **Polish**: T037, T038, T039 are `[P]`; T040 then T041 run last.

### Parallel Example: User Story 2

```bash
# Component files in parallel with the domain/handler work:
Task: "Build CsConceptTable in components/CsConceptTable.tsx"
Task: "Build CsFilterBar in components/CsFilterBar.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (US1) — add + persist a concept.
3. Complete Phase 4 (US2) — browse + filter.
4. **STOP and VALIDATE**: A concept can be added and found via filters. This is a demonstrable MVP (both P1 stories).

### Incremental Delivery

5. Add US3 (progress stage), US4 (insights), US5 (edit + archive), then US6 (duplicate routing) — each an independently testable increment.
6. Finish with Phase 9 (security tests, docs, full quickstart validation).

### Task Summary

- **Total tasks**: 41 (T001–T041)
- **Setup**: 1 · **Foundational**: 4 · **US1**: 6 · **US2**: 7 · **US3**: 4 · **US4**: 6 · **US5**: 6 · **US6**: 2 · **Polish**: 5
