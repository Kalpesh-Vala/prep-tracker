<!--
SYNC IMPACT REPORT
==================
Version change: (template / unversioned) → 1.0.0
Bump rationale: Initial ratification. Template placeholders replaced with seven
concrete, project-specific principles plus a full governance section. MAJOR
baseline established for first formal version.

Modified principles (placeholder → concrete):
  [PRINCIPLE_1_NAME] → I. Code Quality & Maintainability (Interview-Grade)
  [PRINCIPLE_2_NAME] → II. Data Integrity & Persistence (NON-NEGOTIABLE)
  [PRINCIPLE_3_NAME] → III. Test-Backed Behavior
  [PRINCIPLE_4_NAME] → IV. Security & Privacy by Default
  [PRINCIPLE_5_NAME] → V. Simplicity First, Depth Over Breadth
  (added)           → VI. Serverless-Aware Architecture (Vercel + MongoDB)
  (added)           → VII. Consistency & Documentation (Presentable Project)

Added sections:
  - Additional Constraints & Technology Standards (replaces [SECTION_2_NAME])
  - Development Workflow & Quality Gates (replaces [SECTION_3_NAME])
  - Governance: binding gates, amendment procedure, versioning policy,
    Definition of Done checklist

Removed sections: none (all template slots filled or repurposed)

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check is generic
     ("Gates determined based on constitution file"); compatible, no edit needed.
  ✅ .specify/templates/spec-template.md — no constitution-specific slots; compatible.
  ✅ .specify/templates/tasks-template.md — task categories cover testing, data,
     security; compatible with new principles, no edit needed.
  ✅ .specify/templates/checklist-template.md — generic; compatible.

Follow-up TODOs: none. Ratification date set to adoption date (2026-06-30).
-->

# Prep Tracker Constitution

Prep Tracker is a personal, single-user, six-month interview-preparation tracking
platform. It serves a dual purpose that governs every decision in this repository:

1. It MUST work reliably for daily personal use across a multi-month preparation period.
2. It MUST be buildable and presentable as a flagship engineering project — a reviewer
   or interviewer reading this codebase MUST see production-grade engineering practices.

Both purposes are first-class. A change that satisfies one while degrading the other does
not satisfy this constitution. The principles below are binding gates, not aspirations.

## Core Principles

### I. Code Quality & Maintainability (Interview-Grade)

- Code MUST be clean, readable, and self-documenting: meaningful names, small focused
  functions, and a clear separation of concerns.
- The project MUST maintain a clear, conventional Next.js App Router structure, for
  example: `app/` for routes and API route handlers, `components/` for reusable UI,
  `lib/` for shared logic (database client, helpers), `models/` or `schemas/` for data
  models, and `types/` for shared TypeScript types.
- Business/domain logic MUST be separated from UI components and from Next.js route
  handlers so it can be unit-tested independently. Route handlers MUST stay thin;
  data-access and validation logic MUST live in dedicated modules.
- TypeScript MUST be used in strict mode. The codebase MUST NOT use `any` except where
  unavoidable, and every such use MUST be explicitly justified with a comment. Shared
  types MUST be defined once and reused.
- Linting and formatting (ESLint + Prettier) MUST pass with zero errors before any change
  is considered done.

**Rationale**: This repo is a portfolio piece. A reviewer SHOULD be able to open any file
and immediately understand its structure and intent; consistent organization and strict
typing are what make that possible.

### II. Data Integrity & Persistence (NON-NEGOTIABLE)

- Preparation progress data — daily logs, DSA problems, weekly reviews, and all tracker
  data — MUST be persisted reliably to MongoDB and MUST NEVER be silently lost,
  overwritten, or corrupted.
- All writes that modify user data MUST validate input on the server side before
  persisting, regardless of any client-side validation.
- Each document MUST carry `createdAt` and `updatedAt` timestamps. Updates MUST NOT
  destroy historical daily logs or reviews; where the domain implies a log, history MUST
  be append-only / immutable.
- Destructive operations (delete) MUST require explicit confirmation in the UI and MUST be
  scoped to the authenticated user's own data only.
- The database schema/shape MUST be defined explicitly (e.g., via Mongoose schemas or an
  equivalent validated model), not implied by ad-hoc object shapes scattered through the
  code.

**Rationale**: The entire purpose of the app is trustworthy, multi-month progress
tracking. Losing a week of logged data would defeat the project; integrity is therefore
non-negotiable.

### III. Test-Backed Behavior

- Core domain logic MUST have unit tests, including: streak calculation, progress/
  percentage computation, hours-toward-target aggregation, DSA statistics, and
  weekly-review rollups.
- API route handlers MUST have at least integration-style tests covering success,
  validation-failure, and unauthorized cases.
- Tests MUST be deterministic and MUST NOT depend on a live external database or network.
  The database layer MUST be mockable or run against an isolated/in-memory test instance.
- A change to behavior MUST update or add the corresponding tests. Merging behavior changes
  without tests is not allowed.

**Rationale**: Tests both protect the data-integrity guarantees in Principle II and
demonstrate engineering maturity to interviewers reviewing the codebase.

### IV. Security & Privacy by Default

- All secrets (MongoDB connection string, auth secrets) MUST come from environment
  variables and MUST NEVER be committed to the repository. A `.env.example` MUST document
  every required variable without real values.
- Authentication MUST protect every data route: unauthenticated requests to user-data
  endpoints MUST be rejected. A user MUST only ever read or write their own data.
- Passwords/credentials MUST NEVER be stored in plaintext; if credentials are stored, they
  MUST be hashed.
- Input from the client MUST be treated as untrusted and validated/sanitized server-side to
  prevent injection into MongoDB queries.

**Rationale**: Even as a single-user app, demonstrating secure-by-default habits is part of
the engineering bar this project is meant to prove.

### V. Simplicity First, Depth Over Breadth

- The simplest design that satisfies the requirement MUST be preferred. Speculative
  abstraction and premature optimization MUST be avoided.
- The MVP scope — Dashboard, Daily Log, DSA Tracker, Weekly Review — MUST be completed
  end-to-end (built, tested, and deployable) before any additional tracker is started.
- New libraries/dependencies MUST be justified. Prefer the framework's built-in
  capabilities and a small, intentional dependency set over adding packages for minor
  convenience.
- Features outside the agreed scope MUST NOT be added on impulse; scope changes go through
  the spec, not ad-hoc coding.

**Rationale**: This mirrors the builder's working principle of "mastery over novelty" and
keeps the project shippable rather than perpetually half-finished.

### VI. Serverless-Aware Architecture (Vercel + MongoDB)

- The MongoDB connection MUST use a cached/pooled client pattern suitable for serverless,
  so repeated function invocations do not exhaust the connection pool. The code MUST NOT
  open a new unbounded connection per request.
- API route handlers MUST be stateless; they MUST NOT rely on in-memory state persisting
  between invocations.
- Long-running or heavy work MUST NOT block request handlers in ways incompatible with
  serverless execution limits. Expensive aggregations SHOULD be designed to run efficiently
  or be precomputed/stored.
- Configuration that differs between local and Vercel (env vars, base URLs) MUST be
  externalized, not hardcoded.

**Rationale**: The chosen deployment is Vercel serverless with MongoDB Atlas. Ignoring
serverless connection behavior is a common production failure that this project must avoid.

### VII. Consistency & Documentation (Presentable Project)

- API design MUST be consistent: predictable REST-style resource routes per tracker,
  consistent JSON response shapes, and a consistent error response format with appropriate
  HTTP status codes.
- Naming MUST be consistent across the codebase: the same concept is named the same way in
  the database, types, API, and UI.
- The repository MUST include a clear README covering what the project is, the tech stack,
  local setup, environment variables, how to run tests, and how it is deployed — written so
  a reviewer or interviewer can run it.
- Meaningful commit messages and a sensible commit history SHOULD be maintained so the
  project reads as professional work.

**Rationale**: A flagship project is judged as much on clarity, documentation, and
consistency as on features.

## Additional Constraints & Technology Standards

The following technology decisions are fixed for this project and MUST be honored by every
change (they are not re-litigated here):

- **Framework**: Full-stack Next.js (App Router) with TypeScript in strict mode.
- **Persistence**: MongoDB Atlas, accessed through a serverless-safe cached client.
- **Deployment**: Vercel serverless.
- **UI**: Tailwind CSS.
- **Auth**: Simple single-user personal authentication.

Any proposal to change a fixed technology decision is a constitution-level change and MUST
follow the amendment procedure in Governance.

## Development Workflow & Quality Gates

- Every change MUST pass the Definition of Done checklist (see Governance) before it is
  considered complete.
- `/speckit.plan` MUST evaluate the Constitution Check gates against the principles above
  before design is accepted.
- Behavior changes MUST be accompanied by tests (Principle III) and, when they alter
  observable behavior or setup, by documentation updates (Principle VII).
- Scope is controlled through the spec (Principle V); implementation MUST NOT outrun the
  agreed scope.

## Governance

- **Supremacy & binding gates**: This constitution supersedes ad-hoc practice. Its
  principles are binding gates evaluated during `/speckit.plan`'s Constitution Check. A
  conflict with any MUST is resolved by changing the spec, plan, or tasks — NEVER by quietly
  violating the principle. Unavoidable, justified deviations MUST be recorded explicitly in
  the plan's Complexity/Deviation tracking.
- **Amendment procedure**: Changes to this constitution require an explicit decision, a
  recorded rationale, and a version bump. The Sync Impact Report at the top of this file MUST
  be updated to reflect what changed and which dependent templates were reviewed.
- **Versioning policy** (semantic versioning):
  - **MAJOR**: Backward-incompatible governance change — removing or redefining a principle.
  - **MINOR**: Adding a new principle or materially expanding existing guidance.
  - **PATCH**: Clarifications, wording, and non-semantic refinements.
- **Definition of Done** — every change MUST satisfy all of the following before it is done:
  1. Lint and format (ESLint + Prettier) pass with zero errors.
  2. Type-check passes under TypeScript strict mode.
  3. Tests for the changed behavior are added/updated and pass.
  4. No secrets are committed; required env vars are documented in `.env.example`.
  5. Data-integrity rules (Principle II) are upheld — no silent loss, overwrite, or
     destruction of historical data; server-side validation present.
  6. Documentation (README and relevant docs) is updated when behavior or setup changes.
  7. The change stays within the agreed scope (Principle V).

**Version**: 1.0.0 | **Ratified**: 2026-06-30 | **Last Amended**: 2026-06-30
