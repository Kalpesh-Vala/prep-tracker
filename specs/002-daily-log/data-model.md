# Phase 1 Data Model: Daily Log

Persistence: MongoDB Atlas via the existing cached Mongoose connection (`lib/db.ts`). The model
uses `{ timestamps: true }` so every document carries `createdAt` and `updatedAt` (Constitution
Principle II). Names are consistent across the database, types, API, and UI (Principle VII).

## Entity: DailyLog

One calendar day of recorded preparation, owned by the single application owner. At most one
document exists per calendar day, enforced by a unique index on the normalized `date`.

| Field | Type | Rules |
|-------|------|-------|
| `_id` | ObjectId | Primary key (auto) |
| `date` | Date | Required, **unique**; normalized to midnight UTC of the calendar day. Defaults to today on create and may be a past date (backfill); future dates are rejected. Immutable after create |
| `studyHours` | number | Required; `0 ≤ studyHours ≤ 24`; up to one decimal place (e.g., 2.5) |
| `summary` | string | Required; trimmed; non-empty; what was learned that day (max 2000 chars) |
| `problemsSolved` | number | Required; integer; `≥ 0`; DSA problems solved that day |
| `revisionCompleted` | boolean | Required; whether revision was completed that day |
| `biggestChallenge` | string | Required; trimmed; non-empty (max 2000 chars) |
| `nextDayGoal` | string | Required; trimmed; non-empty (max 2000 chars) |
| `energyLevel` | string (optional) | Optional; when present, one of `low` / `medium` / `high`; omitted when not recorded |
| `createdAt` | Date | Auto (timestamps) — original capture time |
| `updatedAt` | Date | Auto (timestamps) — last edit time; distinguishes edits from capture (FR-013) |

### Indexes

- **Unique index on `date`** — enforces one entry per calendar day at the database layer (FR-003),
  durable under concurrent create attempts (spec Edge Cases). A duplicate insert surfaces as a
  MongoDB duplicate-key error (code `11000`), mapped to a `409` API response.
- Default `_id` index serves single-entry lookup by id.
- Listing sorts by `date` descending (reverse-chronological, FR-007); the field is low-cardinality
  per single user (~180 docs) so the sort is inexpensive.

### Validation (two layers)

- **Zod (API boundary, `lib/dailyLog.ts`)**: parses and validates every incoming payload before any
  write (Principle II/IV). Rejects negative/oversized hours, negative problem counts, blank required
  text, out-of-set energy, and a future create date.
- **Mongoose schema**: mirrors the same constraints (`min`/`max`, `required`, `enum`-style range,
  unique index) as defense in depth so the database never persists an invalid shape.

### Lifecycle & integrity

- **Create**: server normalizes the chosen date (default today, past allowed, future rejected),
  validates the payload, and inserts a new document. Never an upsert — a pre-existing day cannot be
  overwritten (FR-004, FR-011).
- **Update**: modifies an existing document by `_id`; `date` is never changed and no other
  document is touched (FR-005, FR-011). `updatedAt` advances automatically.
- **Delete**: out of scope for this slice (spec Assumptions).
- **No silent loss**: because create only inserts and update is id-scoped, every previously logged
  date retains exactly one entry across any sequence of operations (SC-003).

## Derived / DTO shape (types/index.ts)

The API returns a serialized DTO (dates as ISO strings, `_id` as `id`):

```text
DailyLogDTO {
  id: string;
  date: string;            // ISO date (UTC midnight)
  studyHours: number;
  summary: string;
  problemsSolved: number;
  revisionCompleted: boolean;
  biggestChallenge: string;
  nextDayGoal: string;
  energyLevel?: 'low' | 'medium' | 'high';   // when present
  createdAt: string;
  updatedAt: string;
}
```

Relationships: none beyond implicit single-owner ownership (the app has exactly one user; entries
are not cross-referenced to other entities in this slice).
