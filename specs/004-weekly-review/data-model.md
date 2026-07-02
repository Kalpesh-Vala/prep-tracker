# Phase 1 Data Model: Weekly Review

Persistence: MongoDB Atlas via the existing cached Mongoose connection (`lib/db.ts`). The model uses
`{ timestamps: true }` so every document carries `createdAt`/`updatedAt` (Principle II). Names are
consistent across the database, types, API, and UI (Principle VII).

## Entity: WeeklyReview

One week's structured retrospective, owned by the single application owner. At most one document per
week, enforced by a unique index on `weekNumber`.

| Field | Type | Rules |
|-------|------|-------|
| `_id` | ObjectId | Primary key (auto) |
| `weekNumber` | number | Required, integer 1–26, **unique**; canonical week identity |
| `weekStartDate` | Date | Required; derived server-side from `weekNumber` (midnight UTC) |
| `weekEndDate` | Date | Required; derived = `weekStartDate + 6 days` (midnight UTC) |
| `plannedWork` | string | Required; trimmed; non-empty; max 4000 chars |
| `completedWork` | string | Required; trimmed; non-empty; max 4000 chars |
| `totalStudyHours` | number | Required; `>= 0`; up to one decimal |
| `problemsSolved` | number | Required; integer `>= 0` |
| `dsaAccuracyPercent` | number (optional) | Optional; when present, `0..100` |
| `weakTopics` | string[] | Required array (may be empty); each entry trimmed, non-empty, max 100 chars |
| `wins` | string | Required; trimmed; non-empty; max 4000 chars |
| `nextWeekAdjustments` | string | Required; trimmed; non-empty; max 4000 chars |
| `prefillSourceUsed` | boolean (optional) | Optional; whether prefill suggestions seeded the entry |
| `createdAt` | Date | Auto (timestamps) |
| `updatedAt` | Date | Auto (timestamps) |

### Indexes

- **Unique index on `weekNumber`** — enforces one review per week (FR-003); duplicate insert →
  duplicate-key (11000) → mapped to `409`.
- `weekStartDate` (descending) — newest-first browse ordering (FR-007).
- `weekNumber` — lookup/sort convenience.

### Week boundary rule (canonical)

- `PREP_START_DATE` (documented constant, a Monday) + `PREP_TOTAL_WEEKS = 26`.
- Week `N`: `weekStartDate = normalizeUTC(PREP_START_DATE + (N-1)×7d)`, `weekEndDate = weekStartDate + 6d`.
- Used identically for API validation, unique-week enforcement, and prefill windows.

### Validation (two layers)

- **Zod (API boundary, `lib/weeklyReview.ts`)**: `weekNumber` integer 1–26; required non-empty
  trimmed text; `totalStudyHours >= 0`; `problemsSolved` integer `>= 0`; `dsaAccuracyPercent` 0–100
  when present; `weakTopics` array of trimmed strings; unknown keys rejected (`.strict()`). Derived
  dates are computed server-side, not trusted from the client.
- **Mongoose schema**: mirrors constraints (`min`/`max`, `required`, `enum`-like range, unique
  index) as defense in depth.

### Lifecycle & integrity

- **Create**: validate → derive `weekStartDate`/`weekEndDate` from `weekNumber` → insert (no upsert).
  Duplicate week → `409` (original untouched).
- **Update**: id-scoped `PATCH` of a validated subset; `weekNumber` and derived dates are immutable;
  no other review touched (FR-012).
- **Delete**: out of scope for this slice.
- **Snapshot**: confirmed totals are stored on the review and are not recomputed from Daily Log / DSA
  afterward (FR-016).

## Derived: Prefill (computed, not stored)

Computed on demand for a week from existing data; performs no writes.

```text
WeeklyPrefillDTO {
  weekNumber: number;
  weekStartDate: string;   // ISO
  weekEndDate: string;     // ISO
  suggestedTotalStudyHours: number;        // sum of DailyLog.studyHours in range
  suggestedDsaSolvedCount: number;         // count of DsaProblem with solvedOn in range
  suggestedDsaAttemptCount: number;        // == solved count (only solved entries are tracked)
  suggestedDsaAccuracyPercent: number | null;  // null: not derivable (no failures recorded)
  suggestedWeakTopics: string[];           // from computeDsaSummary over the week's DSA entries
  coverage: { dailyLogCount: number; dsaCount: number; hasData: boolean; notes: string[] };
}
```

## DTO shape (types/index.ts)

The API returns a serialized DTO (dates as ISO strings, `_id` as `id`):

```text
WeeklyReviewDTO {
  id: string;
  weekNumber: number;
  weekStartDate: string;   // ISO
  weekEndDate: string;     // ISO
  plannedWork: string;
  completedWork: string;
  totalStudyHours: number;
  problemsSolved: number;
  dsaAccuracyPercent?: number;
  weakTopics: string[];
  wins: string;
  nextWeekAdjustments: string;
  prefillSourceUsed?: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Relationships: reads (but does not own) Daily Log and DSA data for prefill only; the stored review is
independent (snapshot).
