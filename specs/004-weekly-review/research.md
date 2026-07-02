# Phase 0 Research: Weekly Review

All Technical Context items were determined by the constitution's fixed technology standards and the
established foundation / Daily Log / DSA slices, so there were no open `NEEDS CLARIFICATION` markers.
This records the decisions shaping Phase 1.

## Decision: Reuse foundation + existing feature data, no new dependencies

- **Decision**: Build on `dbConnect()`, `ok`/`fail`/`handleRouteError`, `requireApiUser`, Zod, and
  Tailwind. Prefill reads the existing `DailyLog` and `DsaProblem` collections and reuses
  `computeDsaSummary` from `lib/dsa.ts` for suggested weak topics. No new packages.
- **Rationale**: Principles V, VI, VII require reusing established patterns. Cross-feature reads keep
  prefill deterministic and consistent with how the DSA slice already ranks weak topics.
- **Alternatives considered**: Duplicating weak-topic logic (rejected — reuse `computeDsaSummary`);
  a service/repository abstraction (rejected — over-engineering for one model).

## Decision: Canonical week boundary from a configured prep start date

- **Decision**: Define `PREP_START_DATE` (a documented constant, expected to be a Monday) and
  `PREP_TOTAL_WEEKS = 26`. Week `N` spans `[PREP_START_DATE + (N-1)×7d, +6d]`, normalized to midnight
  UTC (Monday→Sunday). The same rule drives API validation, unique-week enforcement, and prefill
  windows.
- **Rationale**: Spec clarification (2026-07-02) chose week-number → derived range. One canonical
  rule prevents drift between selection, uniqueness, and prefill (prompt requirement). UTC
  normalization matches the Daily Log / DSA `solvedOn` approach.
- **Alternatives considered**: User-supplied date ranges (rejected — risks mismatch with week
  number); per-request timezone handling (rejected — single-user app, UTC is simplest and
  deterministic). `PREP_START_DATE` as a constant rather than an env var avoids introducing a new
  secret/variable while remaining externally documented.

## Decision: `weekNumber` is the canonical identity and uniqueness key

- **Decision**: Store `weekNumber` (1–26) with a **unique index**; derive and store
  `weekStartDate`/`weekEndDate` server-side from `weekNumber` (client-supplied dates are ignored or
  validated to equal the derived range). A duplicate create surfaces as a duplicate-key → **409**.
- **Rationale**: FR-003/FR-004 require one review per week with no overwrite. A single integer key is
  unambiguous and durable under concurrency (prompt: "unambiguous and documented").
- **Alternatives considered**: Uniqueness on `weekStartDate` (equivalent but less readable);
  application-only checks (rejected — not durable, Principle II).

## Decision: Distinct create/update (no upsert); no delete

- **Decision**: `POST` inserts; `PATCH` updates by id; there is no `DELETE` (out of scope). `PATCH`
  cannot change `weekNumber`/derived dates. Invalid ObjectId → 400; missing → 404.
- **Rationale**: FR-012 forbids silent loss/overwrite of other reviews; distinct id-scoped ops make
  that structural. Delete is not in the spec's scope.
- **Alternatives considered**: Upsert-by-week (rejected — could overwrite an existing week).

## Decision: Prefill is deterministic, side-effect-free, and a snapshot on save

- **Decision**: `GET .../prefill?weekNumber=N` computes, over week N's derived date range:
  - `suggestedTotalStudyHours` = sum of `DailyLog.studyHours` with `date` in range.
  - `suggestedDsaSolvedCount` = count of `DsaProblem` with `solvedOn` in range.
  - `suggestedDsaAttemptCount` = same count (every logged DSA entry is a solved attempt; no separate
    attempts tracked) — documented in metadata.
  - `suggestedDsaAccuracyPercent` = `null` (not derivable: DSA entries record only solved problems,
    no failures) — returned with an explanatory metadata note.
  - `suggestedWeakTopics` = weak-topic labels from `computeDsaSummary` over week N's DSA entries.
  - `coverage` metadata: `dailyLogCount`, `dsaCount`, `hasData` flags for sparse weeks.
  Prefill performs **no writes**. On save, the user's confirmed values are stored on the review as a
  snapshot; the review is not live-linked to source data afterward (FR-016).
- **Rationale**: FR-008/SC-004 and the prompt require suggestion-only, deterministic, transparent
  prefill that degrades gracefully on sparse weeks (zeros/empty + metadata, never an error).
- **Alternatives considered**: Deriving accuracy from `solvedWithoutHints` ratio (rejected — that is
  a different metric than "success rate"; returned as null with explanation instead); live-linking
  totals (rejected — FR-016 requires a snapshot).

## Decision: `dsaAccuracyPercent` optional; `weakTopics` an array of strings

- **Decision**: `dsaAccuracyPercent` is optional (0–100 when provided). `weakTopics` is a required
  array of trimmed non-empty strings that MAY be empty. `prefillSourceUsed` is an optional boolean
  flag recording whether suggestions seeded the form.
- **Rationale**: Reconciles the prompt (optional accuracy, array weak topics, prefill flag) with the
  spec; the spec Assumptions were updated so accuracy is optional.
- **Alternatives considered**: Required accuracy (rejected — reconciled to prompt); free-text weak
  topics (rejected — an array is cleaner for the trend view and normalization).

## Decision: Testing with in-memory MongoDB, handlers invoked directly

- **Decision**: Unit-test week-boundary/key math, uniqueness helper, prefill aggregation, and
  weak-topic derivation in isolation; integration-test handlers via `NextRequest` against the
  in-memory server, seeding `DailyLog`/`DsaProblem` for prefill scenarios (full/partial/none).
- **Rationale**: Principle III — deterministic tests, no live DB, covering success, validation,
  duplicate-conflict, unauthorized, and prefill coverage cases.
- **Alternatives considered**: HTTP e2e (rejected — slower, unnecessary here).
