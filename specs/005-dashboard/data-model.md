# Phase 1 Data Model: Dashboard

The Dashboard introduces **no persisted entity**. It is a read-only aggregate computed on demand from
existing collections. This document defines the derived summary shape and the source fields it reads.

## Source data (existing, read-only)

| Source model | Fields read | Used for |
|--------------|-------------|----------|
| `DailyLog` | `date` (UTC midnight), `studyHours` | `totalHoursLogged` (sum), streak (days with `studyHours > 0`) |
| `DsaProblem` | `solvedOn` (UTC midnight) | `dsaTotalSolved` (count all), `dsaSolvedThisWeek` (count in current week range) |
| `WeeklyReview` | `weekNumber`, `plannedWork` | `weeklyGoals` for the current week |

No source data is modified. Reuses existing indexes (`DsaProblem.solvedOn`, `WeeklyReview.weekNumber`).

## Constants

- `PREP_TOTAL_WEEKS = 26` (existing).
- `PREP_START_DATE` (existing; Monday anchor) — canonical week rule shared with Weekly Review.
- `STUDY_HOURS_TARGET = 936` (new).

## Derived: DashboardSummaryDTO (computed, not stored)

```text
DashboardSummaryDTO {
  currentWeek: number;                 // 1..26 (clamped), from today vs PREP_START_DATE
  totalWeeks: number;                  // 26
  completionPercentage: number;        // round(currentWeek / 26 * 100), 0..100

  totalHoursLogged: number;            // sum of DailyLog.studyHours (raw, uncapped)
  targetHours: number;                 // 936
  hoursProgressPercentage: number;     // min(100, round(totalHoursLogged / 936 * 100))

  currentStreakDays: number;           // consecutive qualifying days ending today/yesterday

  dsaTotalSolved: number;              // count of all DsaProblem
  dsaSolvedThisWeek: number;           // count of DsaProblem with solvedOn in current week range

  weeklyGoals: string | null;          // current week's WeeklyReview.plannedWork, or null
  weeklyGoalsStatus: 'set' | 'not_set';

  lastUpdated: string;                 // ISO timestamp of this computation
}
```

## Formula definitions (pure, in `lib/dashboard.ts`)

- **currentWeek** = `clamp(floor((todayUTC - prepStartUTC) / 7days) + 1, 1, 26)` (via
  `currentWeekNumber()` in `lib/weeklyReview.ts`).
- **completionPercentage** = `round(currentWeek / 26 * 100)`.
- **totalHoursLogged** = `Σ DailyLog.studyHours`.
- **hoursProgressPercentage** = `min(100, round(totalHoursLogged / 936 * 100))` (raw total preserved).
- **currentStreakDays** = walk backward from today (or yesterday if today has no qualifying log) over
  the set of UTC days that have a `DailyLog` with `studyHours > 0`, counting consecutive days; `0` if
  neither today nor yesterday qualifies.
- **weeklyGoals** = `WeeklyReview.findOne({ weekNumber: currentWeek })?.plannedWork ?? null`;
  `weeklyGoalsStatus = weeklyGoals ? 'set' : 'not_set'`.

## Edge-case handling (documented)

- **No data**: zeros/empty; `currentWeek` still derived from the date; no server error.
- **Hours ≥ target**: `hoursProgressPercentage` caps at 100; `totalHoursLogged` reported raw.
- **Before cycle start / after week 26**: `currentWeek` clamps to 1 / 26; `completionPercentage`
  clamps to the corresponding bound.
- **Zero-hours day**: does not qualify for the streak (breaks it).
- **Future-dated entries**: streak only counts up to today; future-dated qualifying days do not extend
  a streak beyond today (walk starts at today/yesterday).
