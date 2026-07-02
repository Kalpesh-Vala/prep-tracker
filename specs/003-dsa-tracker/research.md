# Phase 0 Research: DSA Problem Tracker

All Technical Context items were determined by the constitution's fixed technology standards and the
established foundation + Daily Log slices, so there were no open `NEEDS CLARIFICATION` markers. This
records the decisions shaping Phase 1.

## Decision: Reuse foundation primitives, add no new dependencies

- **Decision**: Build on `dbConnect()` (cached Mongoose), `ok`/`fail`/`handleRouteError` (envelope),
  `requireApiUser` (auth), Zod (validation), Tailwind (UI). No new packages.
- **Rationale**: Principles V, VI, VII require reusing established patterns. Every needed dependency
  is already present and proven by the Daily Log slice.
- **Alternatives considered**: A separate service layer/repository abstraction (rejected — over-
  engineering for one model, Principle V); a new validation library (rejected — Zod is the standard).

## Decision: Each entry is an independent practice record

- **Decision**: `DsaProblem` documents are independent; the same `title` may appear across multiple
  records (first attempt + revisits). Counts are over records.
- **Rationale**: Spec clarification (2026-07-02). The `attemptType` field only makes sense if a
  problem can be logged more than once. No uniqueness constraint on title/topic.
- **Alternatives considered**: One row per distinct problem with revisits editing it (rejected —
  contradicts the clarified record model and loses per-attempt history).

## Decision: `solvedOn` day-stamp for ordering and backfill

- **Decision**: Add a required `solvedOn` date, normalized to midnight UTC (reusing the Daily Log
  normalization approach), defaulting to today and allowing a past date; future dates rejected.
  Listing sorts by `solvedOn` desc, then `createdAt` desc as a tiebreaker.
- **Rationale**: The prompt requests a solved date for reverse-chronological ordering; an explicit
  day-stamp supports honest backfill and stable sorting better than `createdAt` alone. Unlike Daily
  Log, `solvedOn` is **not unique** (multiple problems can be solved the same day).
- **Alternatives considered**: Sorting by `createdAt` only (rejected — cannot represent when a
  problem was actually solved when logged later). `solvedOn` is listed in spec FR-002/Key Entities
  (clarification 2026-07-02).

## Decision: Topic normalization for grouping/filtering

- **Decision**: Store `topic` trimmed with original casing for display, plus a derived normalized
  key (trimmed + lowercased) used for grouping, counts, weak-topic ranking, and exact filter
  matching. The filter offers the set of existing normalized topics.
- **Rationale**: Spec clarification requires case-insensitive, trimmed grouping and an exact-match
  topic filter drawn from existing topics. A stored normalized key keeps grouping deterministic and
  indexable.
- **Alternatives considered**: Normalizing only at query time (rejected — repeated, error-prone, and
  harder to index); free-text substring filtering (rejected — contradicts the clarified exact-match
  selection).

## Decision: Deterministic weak-topic rule

- **Decision**: Group all problems by normalized topic; for each topic compute the average
  confidence and the count of `needsRevision === true`. Rank topics by **ascending average
  confidence**, breaking ties by **descending needs-revision count**; surface up to a small fixed
  number (e.g., 5). Computed globally over all problems, independent of active list filters.
- **Rationale**: Spec clarification + FR-016. A single, explainable ordering is simple to implement
  and test deterministically (Principle III/V).
- **Alternatives considered**: A blended weakness score (rejected — less explainable, harder to
  test); needs-revision as the primary key (rejected — clarified that confidence is primary);
  scoping insights to filters (rejected — FR-016 mandates global).

## Decision: Filter indexes and safe query parsing

- **Decision**: Index `topic` (normalized key), `difficulty`, `needsRevision`, `interviewWorthy`,
  and `solvedOn` (desc). Parse query filters with Zod, coercing booleans/enums safely and rejecting
  malformed params with a 400.
- **Rationale**: The prompt requires these filters/sorts; indexes keep them efficient. Untrusted
  query input must be validated (Principle IV).
- **Alternatives considered**: Unindexed scans (acceptable at single-user scale but cheap to index
  and demonstrates good practice); trusting raw query strings (rejected — Principle IV).

## Decision: Distinct create/update/delete operations with explicit not-found

- **Decision**: `POST` inserts; `PATCH` updates by id (validated subset); `DELETE` removes by id.
  Invalid ObjectId → 400; missing document → 404. No upserts.
- **Rationale**: FR-013 requires no silent loss/corruption of other records; explicit id-scoped ops
  with clear errors satisfy Principle II. Delete is confirmed in the UI before the request is sent.
- **Alternatives considered**: Bulk/upsert operations (rejected — unnecessary and risk silent
  overwrite).

## Decision: Testing with in-memory MongoDB, handlers invoked directly

- **Decision**: Unit-test `lib/dsa.ts` (validation, topic normalization, weak-topic calc) in
  isolation; integration-test handlers via `NextRequest` against the in-memory server, per-test
  collection clearing (mirrors Daily Log).
- **Rationale**: Principle III — deterministic tests, no live DB, covering success, validation,
  not-found, unauthorized, filters, and summary.
- **Alternatives considered**: HTTP e2e (rejected — slower, non-deterministic, unnecessary here).
