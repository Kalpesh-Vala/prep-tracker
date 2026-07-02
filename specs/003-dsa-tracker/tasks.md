---
description: "Task list for DSA Problem Tracker implementation"
---

# Tasks: DSA Problem Tracker (Log, Filter, and Spot Weak Topics)

**Input**: Design documents from `/specs/003-dsa-tracker/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/dsa-api.md](contracts/dsa-api.md)

**Tests**: Included — the constitution (Principle III) and the plan require unit tests (validation, weak-topic calc, topic normalization) and integration tests (CRUD, auth, invalid payload, not-found, filters, summary).

**Organization**: Tasks are grouped by user story, ordered by priority (P1 first). Each story is independently testable through its own endpoints/components.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1, US2, US3, US4, US5
- All paths are repository-root-relative and concrete.

## Conventions (from plan.md)

- Full-stack Next.js App Router (single project). API handlers under `app/api/dsa/`, the page at the
  existing `app/(app)/dsa/` route, reusable UI in `components/`, domain logic in `lib/dsa.ts`, model
  in `models/`, shared types in `types/`. Reuses `lib/db.ts`, `lib/http.ts`, and `requireApiUser`
  from `lib/auth.ts`. No new dependencies.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared constants the feature depends on.

- [x] T001 [P] Add DSA constants (`DIFFICULTIES` = ['easy','medium','hard'], `ATTEMPT_TYPES` = ['first_attempt','revisit'], `CONFIDENCE_MIN`/`CONFIDENCE_MAX` = 1/5, text length caps, `DSA_DEFAULT_LIMIT`/`DSA_MAX_LIMIT`, `WEAK_TOPICS_COUNT`) to lib/constants.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core model, types, and domain base shared by every user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. (`requireApiUser` already exists from the foundation and is reused as-is.)

- [x] T002 [P] Add shared DSA types (`Difficulty`, `AttemptType`, `DsaProblemDTO`, `CreateDsaInput`, `UpdateDsaInput`, `DsaFilter`, `DsaSummaryDTO`) to types/index.ts
- [x] T003 [P] Create `DsaProblem` Mongoose model with `{ timestamps: true }` and indexes on `topicKey`, `difficulty`, `needsRevision`, `interviewWorthy`, and `solvedOn` (desc) per data-model.md in models/DsaProblem.ts
- [x] T004 Create lib/dsa.ts base: topic normalization (`topicKey`), UTC `solvedOn` normalization + future-date guard, shared Zod field schemas, typed errors (`InvalidDsaError`, `DsaNotFoundError`), and `toDsaProblemDTO` serializer (depends on T001, T002, T003)

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 - Log a solved problem (Priority: P1) 🎯 MVP

**Goal**: The owner can add a problem record capturing all fields (subtopic optional; solved-on defaults to today, past allowed) and have it persisted.

**Independent Test**: Sign in, add a problem with valid values, save, and confirm it is persisted and appears in the list.

### Tests for User Story 1 ⚠️ (write first, ensure they fail)

- [x] T005 [P] [US1] Unit tests for create validation + topic normalization (enums, confidence 1–5, positive integer time, required non-empty strings, future solved-on rejected, past allowed, topic trim/case) in tests/unit/dsa.test.ts
- [x] T006 [P] [US1] Integration tests for `POST /api/dsa`: success → 201 with problem; invalid body → 400 with nothing persisted, in tests/integration/dsa.test.ts

### Implementation for User Story 1

- [x] T007 [US1] Add `createDsaProblem(input)` + create Zod schema (derive `topicKey`, resolve `solvedOn`) to lib/dsa.ts (depends on T004)
- [x] T008 [US1] Implement `POST` handler in app/api/dsa/route.ts (`runtime='nodejs'`; `requireApiUser` → 401; validate → create → 201; map errors via `handleRouteError`) (depends on T007)
- [x] T009 [P] [US1] Build `DsaProblemForm` (all fields; enums as selects; confidence 1–5; solved-on defaults to today; client validation mirroring server with inline errors) in components/DsaProblemForm.tsx
- [x] T010 [US1] Replace placeholder app/(app)/dsa/page.tsx to render the add form and POST on submit, showing the saved record (depends on T008, T009)

**Checkpoint**: A problem can be logged end-to-end and persisted (SC-001).

---

## Phase 4: User Story 2 - View and filter the problem list (Priority: P1)

**Goal**: The owner sees all records newest-first and can filter by topic, difficulty, needs-revision, and interview-worthy (individually and combined), with clear empty/no-match states.

**Independent Test**: With several records across topics/difficulties, apply each filter and combination and confirm only matching records show.

### Tests for User Story 2 ⚠️

- [x] T011 [P] [US2] Integration tests for `GET /api/dsa`: reverse-chronological order; each filter (topic exact-normalized, difficulty, needsRevision, interviewWorthy) and a combination; pagination (`page`/`limit`); empty and no-match results, in tests/integration/dsa.test.ts

### Implementation for User Story 2

- [x] T012 [US2] Add `listDsaProblems(filter)` (sort `solvedOn` desc then `createdAt` desc; AND-combined filters; pagination) + filter/pagination Zod schema to lib/dsa.ts (depends on T004)
- [x] T013 [US2] Implement `GET` (list) handler in app/api/dsa/route.ts (`requireApiUser` → 401; validate query → list → 200 with `{ items, page, limit, total, totalPages }`) (depends on T012; same file as T008)
- [x] T014 [P] [US2] Build `DsaProblemTable` (columns: title, topic/subtopic, difficulty, platform, time, confidence, needsRevision, interviewWorthy, solvedOn; row actions view/edit/delete; empty + no-match states) in components/DsaProblemTable.tsx
- [x] T015 [P] [US2] Build `DsaFilterBar` (topic select from existing topics, difficulty, needsRevision, interviewWorthy) in components/DsaFilterBar.tsx
- [x] T016 [US2] Render the list + filter bar on app/(app)/dsa/page.tsx (fetch list with active filters, show empty/no-match states) (depends on T013, T014, T015)

**Checkpoint**: The filtered list shows exactly matching records newest-first (SC-002, FR-006, FR-015).

---

## Phase 5: User Story 3 - See counts and weakest topics (Priority: P2)

**Goal**: The owner sees total solved, per-topic counts, per-difficulty counts, and weakest topics — computed over all records, independent of active filters.

**Independent Test**: With a known set of records, confirm the total, per-topic/per-difficulty counts, and weakest-topic ranking match expected values.

### Tests for User Story 3 ⚠️

- [x] T017 [P] [US3] Unit test for the weak-topic ranking (group by normalized topic; average confidence asc, tie-break needs-revision count desc, final tie-break topic asc; surfaced count) in tests/unit/dsa.test.ts
- [x] T018 [P] [US3] Integration test for `GET /api/dsa/summary`: correct `totalSolved`, `countsByTopic`, `countsByDifficulty`, and `weakTopics` ordering; zero/empty when no records, in tests/integration/dsa.test.ts

### Implementation for User Story 3

- [x] T019 [US3] Add `getDsaSummary()` (total, per-topic counts, per-difficulty counts, weak-topics ranking — avg confidence asc, needs-revision desc, topic asc — over all records) to lib/dsa.ts (depends on T004)
- [x] T020 [US3] Implement `GET` handler in app/api/dsa/summary/route.ts (`requireApiUser` → 401; compute → 200) (depends on T019)
- [x] T021 [P] [US3] Build `DsaSummaryPanel` (total card, per-topic + per-difficulty counts, weak-topics callout) in components/DsaSummaryPanel.tsx
- [x] T022 [US3] Render the summary panel on app/(app)/dsa/page.tsx, fetched independently of list filters (depends on T020, T021)

**Checkpoint**: Insights are accurate and global (SC-003, SC-004, FR-016).

---

## Phase 6: User Story 4 - Edit a problem (Priority: P2)

**Goal**: The owner edits any record in place with valid values; no other record is affected.

**Independent Test**: Open a record, change fields, save, reopen, and confirm the update persisted and no other record changed.

### Tests for User Story 4 ⚠️

- [x] T023 [P] [US4] Unit test for update validation (partial fields, enum/range rules, `topicKey` recomputed when topic changes) in tests/unit/dsa.test.ts
- [x] T024 [P] [US4] Integration test for `GET /api/dsa/[id]` and `PATCH /api/dsa/[id]`: fetch 200/404; update in place (200), other records untouched, unknown id → 404, invalid value → 400, in tests/integration/dsa.test.ts

### Implementation for User Story 4

- [x] T025 [US4] Add `getDsaProblem(id)` + `updateDsaProblem(id, patch)` + update Zod schema (recompute `topicKey`; validate ObjectId) to lib/dsa.ts (depends on T004)
- [x] T026 [US4] Implement `GET` (single) and `PATCH` handlers in app/api/dsa/[id]/route.ts (`requireApiUser` → 401; 200/400/404) (depends on T025)
- [x] T027 [US4] Add edit mode to `DsaProblemForm` (pre-fill values; `PATCH` on save) in components/DsaProblemForm.tsx (depends on T009)
- [x] T028 [US4] Wire the edit flow (row edit → form → save → refreshed list/summary) in app/(app)/dsa/page.tsx (depends on T026, T027)

**Checkpoint**: Records are editable in place; edits touch only that record (SC-006, FR-003, FR-013).

---

## Phase 7: User Story 5 - Delete a problem with confirmation (Priority: P3)

**Goal**: The owner deletes a record only after explicit confirmation; cancelling leaves it intact and no other record is affected.

**Independent Test**: Delete a record, confirm the prompt appears, cancel (record remains), then confirm (record removed); verify no other record changed.

### Tests for User Story 5 ⚠️

- [x] T029 [P] [US5] Integration test for `DELETE /api/dsa/[id]`: success → 200 `{ deleted, id }` and record gone; unknown id → 404; other records untouched, in tests/integration/dsa.test.ts

### Implementation for User Story 5

- [x] T030 [US5] Add `deleteDsaProblem(id)` (id-scoped hard delete; 404 when missing) to lib/dsa.ts (depends on T004)
- [x] T031 [US5] Implement `DELETE` handler in app/api/dsa/[id]/route.ts (`requireApiUser` → 401; 200/400/404) (depends on T026, T030; same file as T026)
- [x] T032 [P] [US5] Build reusable `ConfirmDialog` (accessible confirm/cancel modal for destructive actions) in components/ConfirmDialog.tsx
- [x] T033 [US5] Wire delete-with-confirmation (row delete → `ConfirmDialog` → on confirm call DELETE → refresh list/summary) in app/(app)/dsa/page.tsx and components/DsaProblemTable.tsx (depends on T028, T031, T032)

**Checkpoint**: No record is deleted without confirmation; others unaffected (SC-005, FR-004, FR-013).

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Cross-cutting security tests, docs, and full validation.

- [x] T034 [P] Add unauthorized-access integration tests (no session → 401) across `POST`, `GET` list, `GET [id]`, `PATCH`, `DELETE`, and `GET summary` in tests/integration/dsa.test.ts
- [x] T035 [P] Update README.md with the DSA Tracker overview, fields, filters, endpoints, and weak-topic logic (per contracts/dsa-api.md)
- [x] T036 [P] Confirm `.env.example` needs no new variables (only `MONGODB_URI`/`AUTH_SECRET`); document any addition if introduced
- [x] T037 Run `npm run typecheck`, `npm run lint`, and `npm test`; resolve any failures (zero-error gate, Constitution Principles I & III)
- [x] T038 Execute the [quickstart.md](quickstart.md) manual walkthrough to validate SC-001..SC-006

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**.
- **User Stories (Phases 3–7)**: All depend on Foundational. Recommended order by priority: US1 → US2 → US3 → US4 → US5.
- **Polish (Phase 8)**: Depends on all targeted stories being complete.

### Story Dependencies & Independence

- **US1 (P1)**: Depends only on Foundational. Delivers the MVP (create + persist).
- **US2 (P1)**: Depends on Foundational; adds `GET` list to the shared `route.ts` (sequential after T008). Independently testable via the list endpoint.
- **US3 (P2)**: Depends on Foundational; adds the summary endpoint (own file). Independently testable via `/summary`.
- **US4 (P2)**: Depends on Foundational; adds `GET`/`PATCH [id]`. Reuses `DsaProblemForm`. Independently testable via those endpoints.
- **US5 (P3)**: Depends on Foundational; adds `DELETE [id]` (sequential after T026, same file). Independently testable via the delete endpoint.

### Shared-file sequencing (cannot be parallel)

- lib/dsa.ts — T004 then T007/T012/T019/T025/T030 (sequential edits to the same module).
- app/api/dsa/route.ts — T008 (US1) then T013 (US2).
- app/api/dsa/[id]/route.ts — T026 (US4) then T031 (US5).
- app/(app)/dsa/page.tsx — T010 → T016 → T022 → T028 → T033 (progressive composition).
- components/DsaProblemForm.tsx — T009 (US1) then T027 (US4).
- tests/unit/dsa.test.ts — T005 → T017 → T023.
- tests/integration/dsa.test.ts — T006 → T011 → T018 → T024 → T029 → T034.

### Within Each User Story

- Tests are written first and must fail before implementation.
- lib domain function → route handler → component → page wiring.

---

## Parallel Opportunities

- **Foundational**: T002, T003 are `[P]` (distinct files); T004 follows.
- **US1**: T005 (unit file) and T006 (integration file) run `[P]`; T009 (component) runs `[P]` with lib/handler work.
- **US2**: T014 and T015 (distinct component files) run `[P]` with the lib/handler tasks.
- **Per story**: each story's component task (`T021`, `T032`) is `[P]` with that story's lib/handler tasks.
- **Polish**: T034, T035, T036 are `[P]` (different files); T037 then T038 run last.

### Parallel Example: User Story 2

```bash
# Component files in parallel with the domain/handler work:
Task: "Build DsaProblemTable in components/DsaProblemTable.tsx"
Task: "Build DsaFilterBar in components/DsaFilterBar.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (US1) — log + persist a problem.
3. Complete Phase 4 (US2) — browse + filter.
4. **STOP and VALIDATE**: A problem can be logged and found via filters. This is a demonstrable MVP (both P1 stories).

### Incremental Delivery

5. Add US3 (insights), then US4 (edit), then US5 (delete with confirmation) — each an independently testable increment.
6. Finish with Phase 8 (security tests, docs, full quickstart validation).

### Task Summary

- **Total tasks**: 38 (T001–T038)
- **Setup**: 1 · **Foundational**: 3 · **US1**: 6 · **US2**: 6 · **US3**: 6 · **US4**: 6 · **US5**: 5 · **Polish**: 5
