# Phase 0 Research: Dashboard

All Technical Context items were determined by the constitution's fixed technology standards and the
established foundation / Daily Log / DSA / Weekly Review slices, so there were no open
`NEEDS CLARIFICATION` markers. This records the decisions shaping Phase 1.

## Decision: Read-only aggregation over existing collections; no new model

- **Decision**: The dashboard introduces no persisted entity. `getDashboardSummary` reads `DailyLog`,
  `DsaProblem`, and `WeeklyReview` and returns a computed DTO. Recomputed on every request.
- **Rationale**: Spec (derived, recompute-on-load) + prompt ("do not duplicate data sources"). Fresh
  computation guarantees no stale values (FR-009) with no cache-invalidation complexity (Principle V).
- **Alternatives considered**: A precomputed/cached summary document (rejected — adds write paths and
  staleness risk for no benefit at single-user scale); a materialized view (over-engineering).

## Decision: Centralize week logic in `lib/weeklyReview.ts`

- **Decision**: Extend `lib/weeklyReview.ts` with `currentWeekNumber(now?)` that maps today to a week
  number clamped 1–26 using the same `PREP_START_DATE` + Monday–Sunday UTC rule as `weekRange`. The
  dashboard imports it (and `weekRange` for the current-week DSA count).
- **Rationale**: The prompt and Principle VII require the dashboard's week to be consistent with
  Weekly Review. One source of truth avoids drift.
- **Alternatives considered**: Reimplementing week math in `lib/dashboard.ts` (rejected — duplication,
  drift risk).

## Decision: Deterministic, documented formulas as pure functions

- **Decision**: In `lib/dashboard.ts`:
  - `completionPercentage(currentWeek)` = `round(currentWeek / 26 × 100)`, capped 0–100.
  - `hoursProgressPercentage(totalHours, target)` = `min(100, round(totalHours / target × 100))`;
    raw `totalHours` and `target` are preserved separately.
  - `computeStreak(qualifyingDayTimestamps, today)` = count of consecutive UTC days with a qualifying
    daily log (`studyHours > 0`) ending today or yesterday; 0 otherwise.
  All are pure and unit-tested; the API and UI share them (no duplicated math).
- **Rationale**: Principle III (deterministic, test-backed) and the prompt's "keep computations
  pure/testable" and "avoid duplicating formulas".
- **Alternatives considered**: Inline math in the route handler or UI (rejected — untestable,
  duplicative).

## Decision: Streak day-normalization consistent with Daily Log

- **Decision**: A day qualifies if a `DailyLog` with `studyHours > 0` exists on that UTC calendar day
  (Daily Log dates are stored normalized to midnight UTC). "Today" and "yesterday" are computed as
  UTC midnight. The streak walks backward from today (or yesterday if today has no qualifying log)
  while each preceding day is present in the qualifying set.
- **Rationale**: FR-008 and the prompt require a consistent timezone/day rule matching Daily Log. UTC
  normalization matches how Daily Log / DSA / Weekly Review already store dates.
- **Alternatives considered**: Local-timezone day boundaries (rejected — single-user app already
  standardized on UTC day normalization; mixing would create off-by-one streaks).

## Decision: Minimal-round-trip aggregation (no N+1)

- **Decision**: Compute the summary with a small fixed set of queries:
  1. `DailyLog.find({}, { date: 1, studyHours: 1 })` once → derive `totalHoursLogged` (sum) and the
     qualifying-day set for the streak in JS.
  2. `DsaProblem.countDocuments({})` → `dsaTotalSolved`.
  3. `DsaProblem.countDocuments({ solvedOn: { $gte, $lte } })` → `dsaSolvedThisWeek` (current week
     range).
  4. `WeeklyReview.findOne({ weekNumber: currentWeek })` → `weeklyGoals`.
- **Rationale**: The prompt requires efficient aggregation and no N+1. Reuses existing indexes
  (`solvedOn`, `weekNumber`). At single-user scale a single `DailyLog` fetch is trivial and lets one
  pass serve both hours and streak.
- **Alternatives considered**: A `$group` aggregation for hours plus a separate distinct-dates query
  (works, but two passes over Daily Log where one suffices); per-day queries for the streak (rejected
  — N+1).

## Decision: Graceful empty/partial data; `/dashboard` as landing

- **Decision**: With no data, return zeros/empty (`totalHoursLogged: 0`, `currentStreakDays: 0`,
  `dsa*: 0`, `weeklyGoals: null` + `weeklyGoalsStatus: 'not_set'`) and never a server error;
  `currentWeek` is still derived from the date (clamped 1–26). The `/dashboard` route is the
  post-sign-in landing page (sign-in success and the app root redirect there).
- **Rationale**: FR-011/FR-012 and the prompt's empty-data + landing requirements.
- **Alternatives considered**: Erroring on empty datasets (rejected — poor UX, violates FR-012);
  a distinct home route separate from `/dashboard` (rejected — the Sidebar/middleware already use
  `/dashboard`).

## Decision: Testing with in-memory MongoDB and pure-function units

- **Decision**: Unit-test the pure calc functions (current week, completion %, hours %, streak
  boundary cases, goals resolution) with no DB; integration-test `getDashboardSummary`/the route via
  `NextRequest` against seeded Daily Log/DSA/Weekly Review data, plus unauthorized and empty cases.
- **Rationale**: Principle III — deterministic tests, no live DB, covering the boundary-heavy streak
  and the seeded-values path.
- **Alternatives considered**: Only integration tests (rejected — the streak boundary logic is best
  covered by fast, exhaustive unit tests).
