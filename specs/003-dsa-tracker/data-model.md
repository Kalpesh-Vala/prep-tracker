# Phase 1 Data Model: DSA Problem Tracker

Persistence: MongoDB Atlas via the existing cached Mongoose connection (`lib/db.ts`). The model uses
`{ timestamps: true }` so every document carries `createdAt`/`updatedAt` (Constitution Principle II).
Names are consistent across the database, types, API, and UI (Principle VII).

## Entity: DsaProblem

One practiced DSA problem (a practice record), owned by the single application owner. The same
`title` may recur across records; there is no uniqueness constraint.

| Field | Type | Rules |
|-------|------|-------|
| `_id` | ObjectId | Primary key (auto) |
| `title` | string | Required; trimmed; non-empty; max 300 chars |
| `topic` | string | Required; trimmed; non-empty; max 100 chars (display casing preserved) |
| `topicKey` | string | Derived, required; normalized `topic` (trimmed + lowercased) used for grouping/filtering; set server-side |
| `subtopic` | string (optional) | Optional; trimmed; max 100 chars |
| `difficulty` | string | Required; enum `easy` \| `medium` \| `hard` |
| `platform` | string | Required; trimmed; non-empty; max 100 chars |
| `timeTakenMinutes` | number | Required; integer; `> 0`; max 100000 |
| `attemptType` | string | Required; enum `first_attempt` \| `revisit` |
| `solvedWithoutHints` | boolean | Required |
| `timeComplexity` | string | Required; trimmed; non-empty; max 60 chars (e.g., `O(n log n)`) |
| `spaceComplexity` | string | Required; trimmed; non-empty; max 60 chars (e.g., `O(1)`) |
| `confidence` | number | Required; integer `1..5` |
| `needsRevision` | boolean | Required |
| `interviewWorthy` | boolean | Required |
| `solvedOn` | Date | Required; normalized to midnight UTC; defaults to today; past allowed; future rejected |
| `createdAt` | Date | Auto (timestamps) |
| `updatedAt` | Date | Auto (timestamps) |

### Indexes

- `topicKey` — grouping, per-topic counts, weak-topic ranking, exact topic filter.
- `difficulty` — difficulty filter.
- `needsRevision` — needs-revision filter.
- `interviewWorthy` — interview-worthy filter.
- `solvedOn` (descending) — reverse-chronological listing (tiebreak `createdAt` desc).

No unique indexes (multiple records may share a title, topic, or `solvedOn`).

### Validation (two layers)

- **Zod (API boundary, `lib/dsa.ts`)**: validates every payload before any write — enum membership
  (difficulty, attemptType), `confidence` in 1–5, `timeTakenMinutes` positive integer, required
  non-empty strings, `solvedOn` valid and not future. Rejects unknown keys (`.strict()`).
- **Mongoose schema**: mirrors constraints (`enum`, `min`/`max`, `required`, `maxlength`) as defense
  in depth.

### Lifecycle & integrity

- **Create**: normalize `topic` → `topicKey`, resolve/validate `solvedOn`, insert. No upsert.
- **Update**: id-scoped `PATCH` of a validated subset; `topicKey` recomputed if `topic` changes; no
  other record touched (FR-013).
- **Delete**: id-scoped hard delete after explicit UI confirmation; only the targeted record is
  removed (FR-013). Missing id → 404.
- **No silent loss**: create inserts only; update/delete are id-scoped; every other record is
  unaffected by any operation.

## Derived: Summary (computed, not stored)

Computed globally over all problems (FR-016), independent of list filters:

```text
DsaSummaryDTO {
  totalSolved: number;                         // total practice records
  countsByTopic: { topic: string; count: number }[];      // by display topic (grouped by topicKey)
  countsByDifficulty: { easy: number; medium: number; hard: number };
  weakTopics: { topic: string; averageConfidence: number; needsRevisionCount: number }[];
  // ranked by averageConfidence ASC, tie-break needsRevisionCount DESC, then topic ASC; up to N (e.g., 5)
}
```

## DTO shape (types/index.ts)

The API returns a serialized DTO (dates as ISO strings, `_id` as `id`, `topicKey` omitted):

```text
DsaProblemDTO {
  id: string;
  title: string;
  topic: string;
  subtopic?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  platform: string;
  timeTakenMinutes: number;
  attemptType: 'first_attempt' | 'revisit';
  solvedWithoutHints: boolean;
  timeComplexity: string;
  spaceComplexity: string;
  confidence: number;      // 1..5
  needsRevision: boolean;
  interviewWorthy: boolean;
  solvedOn: string;        // ISO date (UTC midnight)
  createdAt: string;
  updatedAt: string;
}
```

Relationships: none beyond implicit single-owner ownership.
