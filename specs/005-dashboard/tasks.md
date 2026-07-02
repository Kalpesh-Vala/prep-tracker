---
description: "Task list for Dashboard implementation"
---

# Tasks: Dashboard (At-a-Glance Six-Month Progress)

**Input**: Design documents from `/specs/005-dashboard/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/dashboard-api.md](contracts/dashboard-api.md)

**Tests**: Included — the constitution (Principle III) and the plan require unit tests for the calc functions (current week, completion %, hours %, streak boundaries) and integration tests for the summary endpoint (seeded values, empty, unauthorized).

**Organization**: Tasks are grouped by user story, ordered by priority (P1 first). The single aggregation endpoint + calc module are shared foundation; each story renders/validates its slice of the dashboard.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1, US2, US3, US4
- All paths are repository-root-relative and concrete.

## Conventions (from plan.md)

- Full-stack Next.js App Router (single project). One read-only aggregation endpoint under
  `app/api/dashboard`, the page at the existing `app/(app)/dashboard` route (also the landing page),
  all formulas centralized in `lib/dashboard.ts` (pure, shared), shared types in `types/`. Reuses
  `lib/db.ts`, `lib/http.ts`, `requireApiUser`, the DailyLog/DsaProblem/WeeklyReview models, and the
  Weekly Review week rule. No new dependencies, no new model, no writes.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared constant the feature depends on.

- [x] T001 [P] Add `STUDY_HOURS_TARGET = 936` to lib/constants.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared calc module, aggregation, and endpoint every story renders from.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 [P] Add `currentWeekNumber(now?)` to lib/weeklyReview.ts (map today to a week number clamped 1–26 using the existing `PREP_START_DATE` + Monday–Sunday UTC rule)
- [x] T003 [P] Add `DashboardSummaryDTO` to types/index.ts (per data-model.md)
- [x] T004 Create lib/dashboard.ts: pure `completionPercentage`, `hoursProgressPercentage` (capped, whole-number), and `computeStreak(qualifyingDays, today)` functions, plus `getDashboardSummary()` that reads DailyLog (hours + streak in one pass), counts DSA all/this-week, resolves current-week Weekly Review goals, and assembles the DTO with `lastUpdated` (depends on T001, T002, T003)
- [x] T005 Implement `GET` handler in app/api/dashboard/summary/route.ts (`runtime='nodejs'`; `requireApiUser` → 401; `getDashboardSummary` → 200; errors via `handleRouteError`) (depends on T004)

**Checkpoint**: The summary endpoint returns all metrics — user story UI can begin.

---

## Phase 3: User Story 1 - See overall progress at a glance (Priority: P1) 🎯 MVP

**Goal**: The dashboard shows overall completion %, current week (1–26), and total study hours vs the 936-hour target with a progress indicator.

**Independent Test**: Sign in, land on the Dashboard, and confirm completion %, current week, and hours-vs-target (with progress bar) are shown and computed from data.

### Tests for User Story 1 ⚠️ (write first, ensure they fail)

- [x] T006 [P] [US1] Unit tests for `currentWeekNumber` (clamp 1–26), `completionPercentage`, and `hoursProgressPercentage` (sum, whole-number rounding, cap at 100) in tests/unit/dashboard.test.ts
- [x] T007 [P] [US1] Integration test: `GET /api/dashboard/summary` returns correct `currentWeek`, `completionPercentage`, `totalHoursLogged`, `targetHours`, `hoursProgressPercentage`, and the DSA figures `dsaTotalSolved` and `dsaSolvedThisWeek` for seeded daily logs + DSA entries, in tests/integration/dashboard.test.ts

### Implementation for User Story 1

- [x] T008 [P] [US1] Build `DashboardStatCard` (labelled metric card, reusable) in components/DashboardStatCard.tsx
- [x] T009 [P] [US1] Build `DashboardProgressBar` (hours-toward-target indicator, capped at 100%) in components/DashboardProgressBar.tsx
- [x] T010 [US1] Replace placeholder app/(app)/dashboard/page.tsx to fetch the summary and render completion %, current week, hours-vs-936 progress, and the two DSA figures (all-time total + this week), with clear loading, error, and empty states (depends on T005, T008, T009)

**Checkpoint**: The at-a-glance progress view renders from live data (SC-001, SC-003).

---

## Phase 4: User Story 2 - See the current study streak (Priority: P1)

**Goal**: The dashboard shows the current consecutive-day study streak (positive-hours days ending today or yesterday).

**Independent Test**: With daily logs across several days (some zero-hours), confirm the streak equals the count of consecutive positive-hours days ending today/yesterday.

### Tests for User Story 2 ⚠️

- [x] T011 [P] [US2] Unit tests for `computeStreak` boundaries: ending today, ending yesterday, gap ≥ 2 days → 0, zero-hours day breaks it, future-dated day does not extend beyond today, in tests/unit/dashboard.test.ts
- [x] T012 [P] [US2] Integration test: summary `currentStreakDays` is correct for seeded daily logs, in tests/integration/dashboard.test.ts

### Implementation for User Story 2

- [x] T013 [US2] Render the current streak on app/(app)/dashboard/page.tsx (streak badge/card) (depends on T010)

**Checkpoint**: The streak is displayed and accurate across boundary cases (SC-002, FR-008).

---

## Phase 5: User Story 3 - This week's goals and quick navigation (Priority: P2)

**Goal**: The dashboard surfaces this week's goals (current week's Weekly Review) and quick links to the Daily Log, DSA Tracker, and Weekly Review.

**Independent Test**: With a weekly review for the current week, confirm this week's goals appear; with none, confirm the "not set yet" state; click each quick link and confirm navigation.

### Tests for User Story 3 ⚠️

- [x] T014 [P] [US3] Integration test: `weeklyGoals`/`weeklyGoalsStatus` reflect the current-week Weekly Review when present, and `not_set` (null) when absent, in tests/integration/dashboard.test.ts

### Implementation for User Story 3

- [x] T015 [P] [US3] Build `DashboardQuickLinks` (cards/links to `/daily-log`, `/dsa`, `/weekly-review`; each link's href asserted by a component test) in components/DashboardQuickLinks.tsx
- [x] T016 [US3] Render this week's goals (or a "not set yet" prompt linking to Weekly Review) and the quick links on app/(app)/dashboard/page.tsx (depends on T010, T015)

**Checkpoint**: The user sees what to do next and can jump to any tracker (SC-005, FR-005/FR-006).

---

## Phase 6: User Story 4 - Metrics reflect current data (Priority: P2)

**Goal**: Every dashboard open recomputes from current data (no stale values); the dashboard is the home screen.

**Independent Test**: Note the metrics, change underlying data, reopen the dashboard, and confirm the affected metrics changed.

### Tests for User Story 4 ⚠️

- [x] T017 [P] [US4] Integration tests: unauthorized → 401; empty-data returns zeros/empty (`weeklyGoalsStatus='not_set'`); and freshness — after seeding more data a new request reflects the change, in tests/integration/dashboard.test.ts

### Implementation for User Story 4

- [x] T018 [US4] Ensure the dashboard fetches the summary with no caching (fresh on each load) in app/(app)/dashboard/page.tsx (depends on T010)
- [x] T019 [US4] Route the post-sign-in landing and the app root to `/dashboard` (verify/update components/SignInForm.tsx and app/page.tsx) (depends on T010)

**Checkpoint**: Metrics are always current and the dashboard is the home screen (SC-004, FR-009/FR-011).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Docs and full validation.

- [x] T020 [P] Update README.md with the dashboard metrics and formulas (completion %, hours %, streak), the week & streak definitions, data dependencies (Daily Log, DSA, Weekly Review), and the `/api/dashboard/summary` contract
- [x] T021 [P] Confirm `.env.example` needs no new variables (only `MONGODB_URI`/`AUTH_SECRET`)
- [x] T022 Run `npm run typecheck`, `npm run lint`, and `npm test`; resolve any failures (zero-error gate, Constitution Principles I & III)
- [x] T023 Execute the [quickstart.md](quickstart.md) manual walkthrough to validate SC-001..SC-006

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories** (builds the shared calc + endpoint).
- **User Stories (Phases 3–6)**: All depend on Foundational. Recommended order by priority: US1 → US2 → US3 → US4.
- **Polish (Phase 7)**: Depends on all targeted stories being complete.

### Story Dependencies & Independence

- **US1 (P1)**: Depends on Foundational. Delivers the MVP progress view.
- **US2 (P1)**: Depends on Foundational; renders the streak (already computed by `getDashboardSummary`). Independently testable via `computeStreak` units + the summary value.
- **US3 (P2)**: Depends on Foundational; renders goals + quick links. Independently testable via the goals fields and link navigation.
- **US4 (P2)**: Depends on US1's page; validates freshness/auth/empty and sets the landing route. Independently testable via repeated requests + the 401/empty cases.

### Shared-file sequencing (cannot be parallel)

- lib/dashboard.ts — built once in T004 (calc + summary); no later edits.
- app/(app)/dashboard/page.tsx — T010 → T013 → T016 → T018 (progressive composition).
- tests/unit/dashboard.test.ts — T006 → T011.
- tests/integration/dashboard.test.ts — T007 → T012 → T014 → T017.

### Within Each User Story

- Tests are written first and must fail before implementation.
- Calc/endpoint (foundational) → components → page wiring.

---

## Parallel Opportunities

- **Foundational**: T002, T003 are `[P]` (distinct files); T004 then T005 follow.
- **US1**: T006 (unit) and T007 (integration) run `[P]`; T008 and T009 (distinct component files) run `[P]`.
- **US3**: T014 (test) and T015 (component) run `[P]`.
- **Polish**: T020 and T021 are `[P]`; T022 then T023 run last.

### Parallel Example: User Story 1

```bash
# Components in parallel with the tests:
Task: "Build DashboardStatCard in components/DashboardStatCard.tsx"
Task: "Build DashboardProgressBar in components/DashboardProgressBar.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational — calc + endpoint).
2. Complete Phase 3 (US1) — progress at a glance.
3. Complete Phase 4 (US2) — current streak.
4. **STOP and VALIDATE**: On opening the app, the user sees completion, week, hours-toward-936, and their streak. This is a demonstrable MVP (both P1 stories).

### Incremental Delivery

5. Add US3 (goals + quick nav), then US4 (freshness + landing) — each an independently testable increment.
6. Finish with Phase 7 (docs, full validation).

### Task Summary

- **Total tasks**: 23 (T001–T023)
- **Setup**: 1 · **Foundational**: 4 · **US1**: 5 · **US2**: 3 · **US3**: 3 · **US4**: 3 · **Polish**: 4
