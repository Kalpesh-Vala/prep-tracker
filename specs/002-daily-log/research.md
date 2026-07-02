# Phase 0 Research: Daily Log

All Technical Context items were determined by the project constitution (fixed technology
standards) and the established foundation slice, so there were no open `NEEDS CLARIFICATION`
markers. This document records the design decisions that shape Phase 1.

## Decision: Reuse foundation primitives, add no new dependencies

- **Decision**: Build the Daily Log entirely on existing primitives — `dbConnect()` (cached
  Mongoose), `ok`/`fail`/`handleRouteError` (consistent envelope), `getSessionUser()` +
  `pt_session` cookie (auth), Zod for boundary validation, Tailwind for UI.
- **Rationale**: Constitution Principles V (Simplicity), VI (Serverless-Aware), and VII
  (Consistency) require reusing the established patterns rather than inventing parallel ones.
  Every needed dependency (Mongoose, Zod, Next, Tailwind) is already in `package.json`.
- **Alternatives considered**: Adding a validation library other than Zod (rejected — Zod is
  already the boundary validator in `app/api/auth/signin/route.ts`); a separate service layer or
  repository abstraction (rejected — over-engineering for a single model, violates Principle V).

## Decision: One-entry-per-day via a unique index on a normalized date

- **Decision**: Store `date` as a `Date` normalized to **midnight UTC** of the calendar day and
  put a **unique index** on it. Creation normalizes the chosen date (default today, past allowed,
  future rejected) server-side rather than trusting an arbitrary client timestamp.
- **Rationale**: A calendar day must map to exactly one entry (FR-003). Normalizing to a single
  canonical instant makes "same calendar day" a simple equality/index constraint and prevents
  duplicate documents differing only by time-of-day. The unique index enforces the rule at the
  database layer (defense in depth) even under concurrent create attempts (spec Edge Cases).
- **Alternatives considered**: Storing date as a `YYYY-MM-DD` string (workable, but `Date` sorts
  natively for reverse-chronological listing and matches the foundation's `Date` usage); enforcing
  uniqueness only in application code (rejected — not durable under concurrency; Principle II
  forbids silent loss/duplication).

## Decision: Backfill allowed (default today), edit-by-id for existing days

- **Decision**: `POST /api/daily-log` accepts an optional `date` that **defaults to today** and may
  be a **past** calendar date (backfill a missed day); the server normalizes it and **rejects any
  future date**. Existing days are also modifiable through `PATCH /api/daily-log/[id]`.
- **Rationale**: The spec (clarification 2026-06-30) lets the user backfill a missed day by choosing
  its date, while keeping the one-entry-per-day rule. A second create for a date that already has an
  entry returns a clear `409` directing the user to edit the existing entry (FR-004). Future dates
  are rejected because a day that has not happened cannot be logged (spec Edge Cases).
- **Alternatives considered**: Restricting creation to today only (rejected — contradicts the
  clarified spec and prevents legitimate backfilling); allowing future dates (rejected — a future
  day cannot yet have been prepared for).

## Decision: Energy level as an optional low/medium/high enum

- **Decision**: `energyLevel` is an optional string from the enum `low | medium | high`; omitted
  entirely when not provided.
- **Rationale**: The spec (clarification 2026-06-30) defines a small low/medium/high enum. A bounded
  string enum gives clean Zod + Mongoose validation and a simple input control (Principle II/IV).
- **Alternatives considered**: A numeric 1–5 scale (rejected to stay faithful to the clarified
  spec's enum).

## Decision: Create vs. update are distinct operations (no upsert)

- **Decision**: Create (`POST`) inserts only; update (`PATCH`) modifies an existing document by id
  and never changes its `date`. No upsert is used.
- **Rationale**: FR-005 and FR-011 require that editing one day never alters another and that
  creation never overwrites an existing entry. Distinct operations make accidental overwrite
  structurally impossible; the unique index backs the create path.
- **Alternatives considered**: A single upsert-by-date endpoint (rejected — an upsert could silently
  overwrite a pre-existing day, violating the NON-NEGOTIABLE integrity principle).

## Decision: Shared `requireApiUser` guard for route handlers

- **Decision**: Add a small `requireApiUser(req)` helper in `lib/auth.ts` that reads the
  `pt_session` cookie and returns the `SessionUser` or `null`; each handler returns `401`
  (`UNAUTHORIZED`) when it is `null`, before any data access.
- **Rationale**: Every data endpoint must reject unauthenticated requests (FR-012, Principle IV).
  Centralizing the check keeps handlers thin and consistent (Principle I/VII).
- **Alternatives considered**: Relying on edge `middleware.ts` alone (rejected — middleware only
  does a cheap cookie-presence check; authoritative validation must happen server-side in the
  Node runtime, matching the foundation's documented approach).

## Decision: Testing with in-memory MongoDB, handlers invoked directly

- **Decision**: Unit-test `lib/dailyLog.ts` validation and date normalization in isolation;
  integration-test the route handlers by importing them and calling with `NextRequest`, using the
  existing `tests/helpers/mongo.ts` in-memory server and per-test collection clearing.
- **Rationale**: Principle III requires deterministic tests with no live external DB, covering
  success, validation-failure, duplicate-conflict, and unauthorized cases. This mirrors the
  foundation's existing integration tests.
- **Alternatives considered**: HTTP-level e2e against a running server (rejected — slower,
  non-deterministic, unnecessary for this slice).
