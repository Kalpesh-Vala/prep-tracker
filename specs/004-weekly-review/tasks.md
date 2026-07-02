---
description: "Task list for Weekly Review implementation"
---

# Tasks: Weekly Review (Structured Weekly Retrospective)

**Input**: Design documents from `/specs/004-weekly-review/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/weekly-review-api.md](contracts/weekly-review-api.md)

**Tests**: Included — the constitution (Principle III) and the plan require unit tests (week boundary/key, uniqueness, prefill aggregation, weak-topic rule) and integration tests (CRUD, auth, duplicate-week 409, invalid payload, prefill full/partial/none).

**Organization**: Tasks are grouped by user story, ordered by priority (P1 first). Each story is independently testable through its own endpoints/components.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1, US2, US3, US4, US5
- All paths are repository-root-relative and concrete.

## Conventions (from plan.md)

- Full-stack Next.js App Router (single project). API handlers under `app/api/weekly-review/`, the
  page at the existing `app/(app)/weekly-review/` route, reusable UI in `components/`, domain logic
  in `lib/weeklyReview.ts`, model in `models/`, shared types in `types/`. Reuses `lib/db.ts`,
  `lib/http.ts`, `requireApiUser`, and — for prefill — the `DailyLog`/`DsaProblem` models and
  `computeDsaSummary` from `lib/dsa.ts`. No new dependencies. No delete capability (out of scope).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared constants the feature depends on.

- [x] T001 [P] Add Weekly Review constants (`PREP_START_DATE` (documented Monday anchor), `PREP_TOTAL_WEEKS` = 26, text length caps, `WEEKLY_REVIEW_DEFAULT_LIMIT`/`MAX_LIMIT`) to lib/constants.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core model, types, and domain base shared by every user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. (`requireApiUser` is reused as-is.)

- [x] T002 [P] Add shared Weekly Review types (`WeeklyReviewDTO`, `CreateWeeklyReviewInput`, `UpdateWeeklyReviewInput`, `WeeklyPrefillDTO`) to types/index.ts
- [x] T003 [P] Create `WeeklyReview` Mongoose model with `{ timestamps: true }`, a **unique index on `weekNumber`**, and indexes on `weekStartDate` (desc) and `weekNumber`, per data-model.md, in models/WeeklyReview.ts
- [x] T004 Create lib/weeklyReview.ts base: `weekRange(weekNumber)` deriving UTC start/end from `PREP_START_DATE`, week-number range validation, shared Zod field schemas, typed errors (`InvalidWeeklyReviewError`, `WeeklyReviewNotFoundError`, `DuplicateWeekError`), and `toWeeklyReviewDTO` serializer (depends on T001, T002, T003)

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 - Record a weekly review (Priority: P1) 🎯 MVP

**Goal**: The owner can create a structured review for a week (dates derived from week number) and have it persisted; a duplicate week is rejected with 409.

**Independent Test**: Sign in, complete the form for a week, save, and confirm the review is persisted and retrievable.

### Tests for User Story 1 ⚠️ (write first, ensure they fail)

- [x] T005 [P] [US1] Unit tests for `weekRange`/normalization and create validation (week 1–26, required text, study hours ≥ 0, problems solved integer ≥ 0, accuracy 0–100 when present, weakTopics array) in tests/unit/weeklyReview.test.ts
- [x] T006 [P] [US1] Integration tests for `POST /api/weekly-review`: success → 201 with review; invalid body → 400 with nothing persisted, in tests/integration/weekly-review.test.ts

### Implementation for User Story 1

- [x] T007 [US1] Add `createWeeklyReview(input)` + create Zod schema (derive `weekStartDate`/`weekEndDate` from `weekNumber`; map duplicate-key → `DuplicateWeekError`) to lib/weeklyReview.ts (depends on T004)
- [x] T008 [US1] Implement `POST` handler in app/api/weekly-review/route.ts (`runtime='nodejs'`; `requireApiUser` → 401; validate → create → 201; `DuplicateWeekError` → 409; `InvalidWeeklyReviewError` → 400) (depends on T007)
- [x] T009 [P] [US1] Build `WeeklyReviewForm` (all fields incl. week-number selector showing the derived date range; weak-topics list input; client validation with inline errors) in components/WeeklyReviewForm.tsx
- [x] T010 [US1] Replace placeholder app/(app)/weekly-review/page.tsx to render the create form and POST on submit, showing the saved review (depends on T008, T009)

**Checkpoint**: A weekly review can be created end-to-end and persisted (SC-001).

---

## Phase 4: User Story 2 - Browse, view, and see the trend (Priority: P1)

**Goal**: The owner sees all reviews newest-first (each row showing the week, weak topics, and wins) and can open a single week's full review.

**Independent Test**: With several reviews saved, open the list and confirm each appears once in order with weak topics + wins; open one and confirm full detail.

### Tests for User Story 2 ⚠️

- [x] T011 [P] [US2] Integration tests for `GET /api/weekly-review`: newest-first order, each once, pagination, empty state, in tests/integration/weekly-review.test.ts

### Implementation for User Story 2

- [x] T012 [US2] Add `listWeeklyReviews({ page, limit })` (sort `weekStartDate` desc; pagination) + list-query Zod schema to lib/weeklyReview.ts (depends on T004)
- [x] T013 [US2] Implement `GET` (list) handler in app/api/weekly-review/route.ts (`requireApiUser` → 401; validate query → list → 200 with `{ items, page, limit, total, totalPages }`) (depends on T012; same file as T008)
- [x] T014 [P] [US2] Build `WeeklyReviewList` (newest-first rows showing week + weak topics + wins; empty state; loading/error; row opens the week) in components/WeeklyReviewList.tsx
- [x] T015 [P] [US2] Build `WeeklyReviewDetail` (single-week full view; loading/error; Edit action) in components/WeeklyReviewDetail.tsx
- [x] T016 [US2] Add `getWeeklyReview(id)` (validate ObjectId) to lib/weeklyReview.ts (depends on T004)
- [x] T017 [US2] Implement `GET` (single) handler in app/api/weekly-review/[id]/route.ts (`requireApiUser` → 401; 200/400/404) (depends on T016)
- [x] T018 [US2] Render the list + detail on app/(app)/weekly-review/page.tsx (browse newest-first, open a week → detail) (depends on T013, T014, T015, T017)

**Checkpoint**: Reviews are browsable in order with the weak-topics/wins trend, and viewable individually (SC-003, SC-006, FR-007, FR-015).

---

## Phase 5: User Story 3 - Pre-filled suggested totals (Priority: P2)

**Goal**: When creating a review for a week, the form can pull suggested totals (study hours, problems solved, suggested weak topics) from that week's Daily Log/DSA data; the user edits and confirms.

**Independent Test**: With known daily logs/DSA entries in a week, request prefill and confirm the suggested study hours and problems-solved match the derived totals; override one and confirm the saved review keeps the override.

### Tests for User Story 3 ⚠️

- [x] T019 [P] [US3] Unit tests for prefill aggregation (study-hours sum from Daily Log in range; DSA solved count; suggested weak topics via `computeDsaSummary`) and the no-data coverage result in tests/unit/weeklyReview.test.ts
- [x] T020 [P] [US3] Integration tests for `GET /api/weekly-review/prefill`: full data, partial data, and no data (zeros/empty + coverage), plus invalid `weekNumber` → 400; **and a snapshot-integrity check (FR-016): after saving a review, editing that week's Daily Log/DSA entries does not alter the saved review's stored totals**, in tests/integration/weekly-review.test.ts

### Implementation for User Story 3

- [x] T021 [US3] Add `getWeeklyPrefill(weekNumber)` to lib/weeklyReview.ts — derive the week range, sum `DailyLog.studyHours`, count `DsaProblem` in range, derive suggested weak topics (reuse `computeDsaSummary`), set `suggestedDsaAccuracyPercent = null` with a coverage note, return coverage metadata; performs no writes (depends on T004)
- [x] T022 [US3] Implement `GET` handler in app/api/weekly-review/prefill/route.ts (`requireApiUser` → 401; validate `weekNumber` → prefill → 200; invalid → 400) (depends on T021)
- [x] T023 [US3] Add a "Prefill from this week's data" action to `WeeklyReviewForm` (fetch prefill for the selected week, populate editable fields, set `prefillSourceUsed`) in components/WeeklyReviewForm.tsx (depends on T009)

**Checkpoint**: Suggestions match derived totals and remain fully editable (SC-004, FR-008).

---

## Phase 6: User Story 4 - Edit a weekly review (Priority: P2)

**Goal**: The owner edits a week's review in place; the week identity is immutable and no other review is affected.

**Independent Test**: Open a saved review, change fields, save, reopen, and confirm the update persisted and no other review changed.

### Tests for User Story 4 ⚠️

- [x] T024 [P] [US4] Unit test for update validation (partial fields; `weekNumber`/derived dates immutable) in tests/unit/weeklyReview.test.ts
- [x] T025 [P] [US4] Integration test for `PATCH /api/weekly-review/[id]`: update in place (200), other reviews untouched, attempt to change week rejected, unknown id → 404, invalid value → 400, in tests/integration/weekly-review.test.ts

### Implementation for User Story 4

- [x] T026 [US4] Add `updateWeeklyReview(id, patch)` + update Zod schema (editable subset; `weekNumber` and derived dates immutable) to lib/weeklyReview.ts (depends on T004)
- [x] T027 [US4] Implement `PATCH` handler in app/api/weekly-review/[id]/route.ts (`requireApiUser` → 401; validate → update → 200/400/404) (depends on T017, T026; same file as T017)
- [x] T028 [US4] Add edit mode to `WeeklyReviewForm` (pre-fill current values; `PATCH` on save; week field read-only) in components/WeeklyReviewForm.tsx (depends on T009)
- [x] T029 [US4] Wire the edit flow (detail → edit → save → refreshed detail/list) in app/(app)/weekly-review/page.tsx (depends on T018, T027, T028)

**Checkpoint**: Reviews are editable in place; edits touch only that week (SC-005, FR-005, FR-012).

---

## Phase 7: User Story 5 - Enforce one review per week (Priority: P2)

**Goal**: A create attempt for an already-reviewed week is prevented and routes the user to edit the existing review; the original stays intact.

**Independent Test**: Create a review for a week, attempt to create another for the same week, confirm a duplicate is prevented (409) and the original is intact.

### Tests for User Story 5 ⚠️

- [x] T030 [P] [US5] Integration test: duplicate-week `POST` returns 409 `DUPLICATE_WEEK` and the original review is unchanged, in tests/integration/weekly-review.test.ts

### Implementation for User Story 5

- [x] T031 [US5] On a 409 response, route the user to edit the existing week's review (look up the review for that week number and open it in edit mode) in app/(app)/weekly-review/page.tsx and components/WeeklyReviewForm.tsx (depends on T010, T029)

**Checkpoint**: Two reviews for the same week are impossible; the original is never overwritten (SC-002, FR-004, FR-012).

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Cross-cutting security tests, docs, and full validation.

- [x] T032 [P] Add unauthorized-access integration tests (no session → 401) across `POST`, `GET` list, `GET [id]`, `PATCH`, and `GET prefill` in tests/integration/weekly-review.test.ts
- [x] T033 [P] Update README.md with the Weekly Review overview, canonical week-boundary rule, one-review-per-week constraint, prefill behavior & limitations, and endpoint summary (per contracts/weekly-review-api.md)
- [x] T034 [P] Confirm `.env.example` needs no new variables (only `MONGODB_URI`/`AUTH_SECRET`); document any addition if introduced
- [x] T035 Run `npm run typecheck`, `npm run lint`, and `npm test`; resolve any failures (zero-error gate, Constitution Principles I & III)
- [x] T036 Execute the [quickstart.md](quickstart.md) manual walkthrough to validate SC-001..SC-006

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**.
- **User Stories (Phases 3–7)**: All depend on Foundational. Recommended order by priority: US1 → US2 → US3 → US4 → US5.
- **Polish (Phase 8)**: Depends on all targeted stories being complete.

### Story Dependencies & Independence

- **US1 (P1)**: Depends only on Foundational. Delivers the MVP (create + persist, incl. 409 integrity from the unique index).
- **US2 (P1)**: Depends on Foundational; adds `GET` list to the shared `route.ts` (sequential after T008) and `GET [id]`. Independently testable via those endpoints.
- **US3 (P2)**: Depends on Foundational; adds the prefill endpoint (own file) reading Daily Log/DSA. Independently testable via `/prefill`.
- **US4 (P2)**: Depends on Foundational; adds `PATCH [id]` (sequential after T017, same file) and reuses the form. Independently testable via the update endpoint.
- **US5 (P2)**: Builds on US1's create + US4's edit flow to route duplicates to editing; independently testable via the 409 path.

### Shared-file sequencing (cannot be parallel)

- lib/weeklyReview.ts — T004 then T007/T012/T016/T021/T026 (sequential edits to the same module).
- app/api/weekly-review/route.ts — T008 (US1) then T013 (US2).
- app/api/weekly-review/[id]/route.ts — T017 (US2) then T027 (US4).
- app/(app)/weekly-review/page.tsx — T010 → T018 → T029 → T031 (progressive composition).
- components/WeeklyReviewForm.tsx — T009 (US1) → T023 (US3) → T028 (US4).
- tests/unit/weeklyReview.test.ts — T005 → T019 → T024.
- tests/integration/weekly-review.test.ts — T006 → T011 → T020 → T025 → T030 → T032.

### Within Each User Story

- Tests are written first and must fail before implementation.
- lib domain function → route handler → component → page wiring.

---

## Parallel Opportunities

- **Foundational**: T002, T003 are `[P]` (distinct files); T004 follows.
- **US1**: T005 (unit file) and T006 (integration file) run `[P]`; T009 (component) runs `[P]` with lib/handler work.
- **US2**: T014 and T015 (distinct component files) run `[P]` with the lib/handler tasks.
- **Polish**: T032, T033, T034 are `[P]` (different files); T035 then T036 run last.

### Parallel Example: User Story 2

```bash
# Component files in parallel with the domain/handler work:
Task: "Build WeeklyReviewList in components/WeeklyReviewList.tsx"
Task: "Build WeeklyReviewDetail in components/WeeklyReviewDetail.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (US1) — create + persist a review.
3. Complete Phase 4 (US2) — browse + view + trend.
4. **STOP and VALIDATE**: A weekly review can be recorded and reviewed across weeks. This is a demonstrable MVP (both P1 stories).

### Incremental Delivery

5. Add US3 (prefill), then US4 (edit), then US5 (one-per-week routing) — each an independently testable increment.
6. Finish with Phase 8 (security tests, docs, full quickstart validation).

### Task Summary

- **Total tasks**: 36 (T001–T036)
- **Setup**: 1 · **Foundational**: 3 · **US1**: 6 · **US2**: 8 · **US3**: 5 · **US4**: 6 · **US5**: 2 · **Polish**: 5
