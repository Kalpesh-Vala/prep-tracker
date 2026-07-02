---
description: "Task list for Daily Log feature implementation"
---

# Tasks: Daily Log (Accurate Daily Preparation Capture)

**Input**: Design documents from `/specs/002-daily-log/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/daily-log-api.md](contracts/daily-log-api.md)

**Tests**: Included — the project constitution (Principle III) and the plan explicitly require unit tests for validation + the one-entry-per-day rule and integration tests for the API (success, validation failure, duplicate-date conflict, unauthorized).

**Organization**: Tasks are grouped by user story. Stories are ordered by priority (P1 first). Each story is independently testable through its own endpoints/components.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: Which user story the task serves (US1, US2, US3, US4, US5)
- All paths are repository-root-relative and concrete.

## Conventions (from plan.md)

- Full-stack Next.js App Router (single project). API route handlers under `app/api/daily-log/`,
  pages under `app/(app)/daily-log/`, reusable UI in `components/`, domain logic in `lib/`, the
  Mongoose model in `models/`, shared types in `types/`. Reuses the foundation's cached Mongoose
  connection (`lib/db.ts`), response envelope (`lib/http.ts`), and session auth (`lib/auth.ts`).
- No new runtime dependencies. Route handlers stay thin; validation/data-access lives in `lib/dailyLog.ts`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared constants the feature depends on.

- [x] T001 [P] Add Daily Log constants (`ENERGY_LEVELS` = ['low','medium','high'], `STUDY_HOURS_MAX` = 24, `TEXT_FIELD_MAX_LEN`, list `DEFAULT_LIMIT`/`MAX_LIMIT`) to lib/constants.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core model, types, auth guard, and domain base shared by every user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 [P] Add shared Daily Log types (`EnergyLevel` union, `DailyLogDTO`, `CreateDailyLogInput`, `UpdateDailyLogInput`) to types/index.ts
- [x] T003 [P] Create `DailyLog` Mongoose model with `{ timestamps: true }` and a **unique index on the normalized `date`** (fields per data-model.md) in models/DailyLog.ts
- [x] T004 [P] Implement `requireApiUser(req)` guard (read `pt_session` cookie → `SessionUser | null`) in lib/auth.ts
- [x] T005 Create lib/dailyLog.ts base: UTC date normalization helper, today/future-date checks, shared Zod field schemas, and `toDailyLogDTO` serializer (depends on T001, T002, T003)

**Checkpoint**: Foundation ready — user stories can now begin.

---

## Phase 3: User Story 1 - Log today's preparation (Priority: P1) 🎯 MVP

**Goal**: The owner can create a daily entry (defaulting to today, backfill of a past date allowed) capturing all eight fields and have it persisted.

**Independent Test**: Sign in, open the create form, fill required fields, save, and confirm the entry is persisted and retrievable.

### Tests for User Story 1 ⚠️ (write first, ensure they fail)

- [x] T006 [P] [US1] Unit tests for create validation + date normalization (valid payload, decimal hours 0–24 bounds, blank required text rejected, invalid energy rejected, future-date rejected, past-date backfill accepted, zero hours/problems accepted) in tests/unit/dailyLog.test.ts
- [x] T007 [P] [US1] Integration tests for `POST /api/daily-log`: success → 201 with entry; invalid body → 400 with nothing persisted, in tests/integration/daily-log.test.ts

### Implementation for User Story 1

- [x] T008 [US1] Add `createDailyLog(input)` + create Zod schema (date defaults to today, past allowed, future rejected; energy enum optional) to lib/dailyLog.ts (depends on T005)
- [x] T009 [US1] Implement `POST` handler in app/api/daily-log/route.ts (`runtime='nodejs'`; `requireApiUser` → 401; validate → `createDailyLog` → 201; map errors via `handleRouteError`) (depends on T008)
- [x] T010 [P] [US1] Build `DailyLogForm` (all eight fields; date defaults to today with past allowed; energy low/medium/high; client validation mirroring server with inline error messages) in components/DailyLogForm.tsx
- [x] T011 [US1] Replace placeholder app/(app)/daily-log/page.tsx to render the create form and POST on submit, showing the saved entry (depends on T009, T010)

**Checkpoint**: A day can be logged end-to-end and persisted (SC-001).

---

## Phase 4: User Story 5 - Enforce one entry per calendar date (Priority: P1)

**Goal**: A second entry for a date that already has one is prevented (no duplicate, no overwrite); the user is routed to edit the existing entry.

**Independent Test**: Create an entry for a date, attempt to create another for the same date, confirm a duplicate is prevented and the original is intact.

### Tests for User Story 5 ⚠️

- [x] T012 [P] [US5] Unit test for the one-entry-per-day rule (normalized-date equality; duplicate detection on today and on a backfilled date) in tests/unit/dailyLog.test.ts
- [x] T013 [P] [US5] Integration test: duplicate-date `POST` returns 409 `DUPLICATE_DATE` and the original entry's data is unchanged (covers today and a backfilled date) in tests/integration/daily-log.test.ts

### Implementation for User Story 5

- [x] T014 [US5] Catch the Mongo duplicate-key error (code 11000) in `createDailyLog` and surface a typed `DuplicateDateError` in lib/dailyLog.ts (depends on T008)
- [x] T015 [US5] Map `DuplicateDateError` to a 409 `DUPLICATE_DATE` response (clear, non-destructive message) in the `POST` handler app/api/daily-log/route.ts (depends on T009, T014)
- [x] T016 [US5] On a 409 response, route the user to edit the existing entry instead of creating a duplicate in app/(app)/daily-log/page.tsx (depends on T011, T015)

**Checkpoint**: Two entries for the same date are impossible; no logged day is overwritten (SC-003, SC-004, FR-011).

---

## Phase 5: User Story 2 - Browse past entries in reverse-chronological order (Priority: P2)

**Goal**: The owner sees all logged days newest-first, each showing date, hours, problems solved, and revision status, plus an empty state when none exist.

**Independent Test**: With several entries on different dates, open the history list and confirm each appears exactly once, newest first.

### Tests for User Story 2 ⚠️

- [x] T017 [P] [US2] Integration test for `GET /api/daily-log`: reverse-chronological order, each entry exactly once, pagination (`limit`/`cursor`), and empty array when none exist in tests/integration/daily-log.test.ts

### Implementation for User Story 2

- [x] T018 [US2] Add `listDailyLogs({ limit, cursor })` (sort `date` desc, keyset pagination) + list-query Zod schema to lib/dailyLog.ts (depends on T005)
- [x] T019 [US2] Implement `GET` (list) handler in app/api/daily-log/route.ts (`requireApiUser` → 401; validate query → `listDailyLogs` → 200 with `{ entries, nextCursor }`) (depends on T018; same file as T009)
- [x] T020 [P] [US2] Build `DailyLogList` (reverse-chronological rows showing date, hours, problems solved, revision status; empty state; loading and error states; row opens the entry) in components/DailyLogList.tsx
- [x] T021 [US2] Render the history list on app/(app)/daily-log/page.tsx (fetch list, show empty state, link rows to the single-entry view) (depends on T019, T020)

**Checkpoint**: History list shows every saved day exactly once, newest first (SC-002, FR-007, FR-008).

---

## Phase 6: User Story 3 - View a single day's entry (Priority: P2)

**Goal**: The owner opens one day and sees all captured fields, with energy shown only when recorded, and an Edit action.

**Independent Test**: With a saved entry, open its view and confirm every field displays accurately; energy is omitted when absent.

### Tests for User Story 3 ⚠️

- [x] T022 [P] [US3] Integration test for `GET /api/daily-log/[id]`: returns the full entry (200) including `createdAt`/`updatedAt`; unknown id → 404; energy field omitted when not recorded, in tests/integration/daily-log.test.ts

### Implementation for User Story 3

- [x] T023 [US3] Add `getDailyLog(id)` + id validation to lib/dailyLog.ts (depends on T005)
- [x] T024 [US3] Implement `GET` (single) handler in app/api/daily-log/[id]/route.ts (`requireApiUser` → 401; fetch → 200/404) (depends on T023)
- [x] T025 [P] [US3] Build `DailyLogEntryView` (all fields; energy shown only when present; surface the last-updated time; loading and error states; Edit action) in components/DailyLogEntryView.tsx
- [x] T026 [US3] Wire the single-entry view into app/(app)/daily-log/page.tsx (open from list → fetch by id → render view) (depends on T024, T025)

**Checkpoint**: A single day's full detail is viewable and accurate (FR-006).

---

## Phase 7: User Story 4 - Edit an existing day's entry (Priority: P2)

**Goal**: The owner edits any prior day in place; the date is immutable and no other day's entry is affected.

**Independent Test**: Open a saved entry, change fields, save, reopen the same date, and confirm the update persisted with the date unchanged and other entries untouched.

### Tests for User Story 4 ⚠️

- [x] T027 [P] [US4] Unit test for update validation (partial fields, immutable date, clearing optional energy via null) in tests/unit/dailyLog.test.ts
- [x] T028 [P] [US4] Integration test for `PATCH /api/daily-log/[id]`: updates in place (200), `updatedAt` advances while `createdAt` and `date` are unchanged, other entries untouched, unknown id → 404, invalid value → 400, in tests/integration/daily-log.test.ts

### Implementation for User Story 4

- [x] T029 [US4] Add `updateDailyLog(id, patch)` + update Zod schema (editable subset, `date` immutable, energy nullable) to lib/dailyLog.ts (depends on T005)
- [x] T030 [US4] Implement `PATCH` handler in app/api/daily-log/[id]/route.ts (`requireApiUser` → 401; validate → `updateDailyLog` → 200/404) (depends on T024, T029; same file as T024)
- [x] T031 [US4] Add edit mode to `DailyLogForm` (pre-fill current values; `PATCH` on save) in components/DailyLogForm.tsx (depends on T010)
- [x] T032 [US4] Wire the edit flow (view → edit → save → updated view) in app/(app)/daily-log/page.tsx (depends on T026, T031)

**Checkpoint**: Past entries are correctable; edits touch only that day (SC-005, FR-005, FR-011).

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Cross-cutting security tests, docs, and full validation.

- [x] T033 [P] Add unauthorized-access integration tests (no session → 401) across `POST`, `GET` list, `GET [id]`, and `PATCH` in tests/integration/daily-log.test.ts
- [x] T034 [P] Update README.md with the Daily Log data model and endpoint table (per contracts/daily-log-api.md)
- [x] T035 [P] Confirm `.env.example` needs no new variables (only `MONGODB_URI`/`AUTH_SECRET`); document any addition if introduced
- [x] T036 Run `npm run typecheck`, `npm run lint`, and `npm test`; resolve any failures (zero errors gate, Constitution Principles I & III)
- [x] T037 Execute the [quickstart.md](quickstart.md) manual walkthrough to validate SC-001..SC-006

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**.
- **User Stories (Phases 3–7)**: All depend on Foundational. Recommended order by priority: US1 → US5 → US2 → US3 → US4.
- **Polish (Phase 8)**: Depends on all targeted stories being complete.

### Story Dependencies & Independence

- **US1 (P1)**: Depends only on Foundational. Delivers the MVP (create + persist).
- **US5 (P1)**: Builds on US1's `POST` handler (T009) to add duplicate handling; independently testable via the 409 conflict path.
- **US2 (P2)**: Depends on Foundational; adds the `GET` list to the shared `route.ts` (sequential after T009). Independently testable via the list endpoint.
- **US3 (P2)**: Depends on Foundational; adds the `GET [id]` handler. Independently testable via the single-entry endpoint.
- **US4 (P2)**: Depends on Foundational; adds `PATCH [id]` (sequential after T024, same file) and reuses `DailyLogForm`. Independently testable via the update endpoint.

### Shared-file sequencing (cannot be parallel)

- app/api/daily-log/route.ts — T009 (US1) then T015 (US5) then T019 (US2).
- app/api/daily-log/[id]/route.ts — T024 (US3) then T030 (US4).
- lib/dailyLog.ts — T005 then T008/T014/T018/T023/T029 (sequential edits to the same module).
- app/(app)/daily-log/page.tsx — T011 → T016 → T021 → T026 → T032 (progressive composition).
- components/DailyLogForm.tsx — T010 (US1) then T031 (US4).

### Within Each User Story

- Tests are written first and must fail before implementation.
- lib domain function → route handler → component → page wiring.

---

## Parallel Opportunities

- **Foundational**: T002, T003, T004 are `[P]` (distinct files); T005 follows.
- **US1**: T006 (unit file) and T007 (integration file) run `[P]`; T010 (component) runs `[P]` with the lib/handler work.
- **Per story**: each story's component task (`T020`, `T025`) is `[P]` with that story's lib/handler tasks.
- **Polish**: T033, T034, T035 are `[P]` (different files); T036 then T037 run last.

### Parallel Example: User Story 1

```bash
# Tests together (different files):
Task: "Unit tests for create validation + date normalization in tests/unit/dailyLog.test.ts"
Task: "Integration tests for POST /api/daily-log in tests/integration/daily-log.test.ts"

# Component in parallel with domain/handler work:
Task: "Build DailyLogForm in components/DailyLogForm.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 5)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (US1) — create + persist a day.
3. Complete Phase 4 (US5) — guarantee one-entry-per-date and no silent loss.
4. **STOP and VALIDATE**: A day can be logged, duplicates are impossible, no data is lost. This is a demonstrable, safe MVP (both P1 stories).

### Incremental Delivery

5. Add US2 (browse), then US3 (view), then US4 (edit) — each an independently testable increment.
6. Finish with Phase 8 (security tests, docs, full quickstart validation).

### Task Summary

- **Total tasks**: 37 (T001–T037)
- **Setup**: 1 · **Foundational**: 4 · **US1**: 6 · **US5**: 5 · **US2**: 5 · **US3**: 5 · **US4**: 6 · **Polish**: 5
