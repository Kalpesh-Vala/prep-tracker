# Phase 0 Research: CS Fundamentals Tracker

All Technical Context items were determined by the constitution's fixed technology standards and the
established foundation / DSA / Weekly Review slices, so there were no open `NEEDS CLARIFICATION`
markers. This records the decisions shaping Phase 1.

## Decision: Reuse foundation primitives, add no new dependencies

- **Decision**: Build on `dbConnect()`, `ok`/`fail`/`handleRouteError`, `requireApiUser`, Zod,
  Tailwind, and the existing `ConfirmDialog`. No new packages.
- **Rationale**: Principles V, VI, VII require reusing established patterns. The DSA slice already
  provides a near-identical CRUD + filters + summary shape to mirror.
- **Alternatives considered**: A service/repository abstraction (rejected — over-engineering for one
  model, Principle V); a new confirm-modal (rejected — reuse `ConfirmDialog`).

## Decision: One longitudinal record per concept, keyed by domain + title + subtopic

- **Decision**: Store a derived `conceptKey = domain + '|' + normalize(title) + '|' + normalize(subtopic)`
  (normalize = trim + lowercase; empty subtopic → empty segment) with a **unique index**. Create
  inserts; a duplicate key → `409 DUPLICATE_CONCEPT`. Stage/detail updates edit the existing document
  by id (no upsert, no new record).
- **Rationale**: Spec clarification (2026-07-03): identity is (domain, title, subtopic). FR-003/FR-012
  require in-place longitudinal updates with no duplicates. A stored normalized key makes the rule
  durable and indexable.
- **Alternatives considered**: Uniqueness on domain+title only (rejected — clarified that subtopic
  distinguishes concepts); application-only duplicate checks (rejected — not durable under
  concurrency, Principle II).

## Decision: Deterministic combined weak-concepts score

- **Decision**: A concept is **weak** if `confidence ≤ 2` OR it is **stale** (`lastRevisedAt` older
  than `CS_STALE_DAYS = 14`). The weak list ranks by a combined score
  `weaknessScore = (5 − confidence) × 30 + daysSinceLastRevised` (weakest = highest), tie-broken by
  domain then title. Confidence dominates (each point ≈ 30 days of staleness); staleness orders within
  a confidence level.
- **Rationale**: Spec clarification chose a single combined score blending confidence and staleness.
  The `× 30` weight is explicit, deterministic, and testable (Principle III), keeping confidence
  primary while letting staleness break ties and add signal.
- **Alternatives considered**: Lexicographic (confidence asc, then staleness) — equivalent for most
  data but the spec chose a single score; AND-only inclusion (rejected — clarified OR); the prompt's
  "stage not interview_ready with stale" variant (noted; the clarified rule applies staleness
  regardless of stage for a wider safety net).

## Decision: Soft-delete via archive (not hard delete)

- **Decision**: `DELETE /api/cs-fundamentals/[id]` sets `isArchived = true` (soft archive) after UI
  confirmation; the default list and summary exclude archived concepts. No document is destroyed.
- **Rationale**: The prompt requests soft-delete to avoid accidental loss; this aligns with Principle
  II (no silent data loss) and the constitution's confirmation requirement for destructive UI actions.
  *This extends the spec, which listed "no deletion"; recommend a spec note for archive.*
- **Alternatives considered**: Hard delete (rejected — risks accidental permanent loss); no removal at
  all (rejected — the prompt explicitly wants an archive path).

## Decision: Filters via query params; confidence bands map to min/max

- **Decision**: `GET` accepts `domain`, `stage`, `confidenceMin`, `confidenceMax`, `interviewReady`
  (stage == interview_ready), `notInterviewReady`, `weakOnly`, plus `page`/`limit`. The UI's
  low/medium/high bands map to `confidenceMin`/`confidenceMax` (low 1–2, medium 3, high 4–5). Malformed
  params → 400. Sorting is stable (`createdAt` desc, `_id` desc).
- **Rationale**: The prompt requests min/max + derived filters; bands (spec) are a UI convenience over
  the same params. Indexes on `domain`, `stage`, `confidence`, `lastRevisedAt`, `createdAt` keep
  queries efficient (Principle VI); untrusted input is validated (Principle IV).
- **Alternatives considered**: Only band enums (less flexible than min/max); unindexed scans (cheap to
  index, demonstrates good practice).

## Decision: `lastRevisedAt` normalized to midnight UTC, defaults to today

- **Decision**: Store `lastRevisedAt` normalized to midnight UTC (project convention from Daily Log /
  DSA). Defaults to today on create; a past date is accepted; a future date is rejected.
- **Rationale**: Consistency with existing date handling; the staleness calculation needs a stable day
  boundary. Spec Assumptions define default-today + future-rejected.
- **Alternatives considered**: Free timestamp (rejected — inconsistent day math); required explicit
  date (rejected — default-today is faster to log).

## Decision: Testing with in-memory MongoDB, pure-function units

- **Decision**: Unit-test normalization/`conceptKey`, the weak-score + inclusion rule, summary
  percentages, and enum/range validation in isolation; integration-test handlers via `NextRequest`
  against the in-memory server (CRUD, archive, duplicate 409, filters, summary, unauthorized).
- **Rationale**: Principle III — deterministic tests, no live DB, covering the boundary-heavy weak
  rule and the seeded-summary path.
- **Alternatives considered**: HTTP e2e (rejected — slower, unnecessary here).
