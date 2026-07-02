# Quickstart: DSA Tracker Validation

This guide proves the DSA Tracker works end-to-end. It references
[contracts/dsa-api.md](contracts/dsa-api.md) and [data-model.md](data-model.md) rather than
duplicating field rules.

## Prerequisites

- Node.js and dependencies installed (`npm install`).
- A `.env` with `MONGODB_URI` and `AUTH_SECRET` (see `.env.example`). No new variables are required.
- A seeded owner account (`npm run seed`) to sign in with.

## Automated tests (primary validation)

```bash
npm run typecheck      # strict TypeScript passes
npm run lint           # zero lint errors
npm test               # unit + integration suites pass
```

Expected new suites —

- `tests/unit/dsa.test.ts` — field validation (enums, confidence 1–5, positive time, required
  strings), topic normalization, and the weak-topic ranking calculation.
- `tests/integration/dsa.test.ts` — API behavior for: create (201), validation failure (400),
  list with filters (topic/difficulty/needsRevision/interviewWorthy, combined) and pagination,
  single fetch (200/404), update-in-place (200/404), delete (200/404), summary correctness, and
  unauthorized access (401) across all endpoints.

## Manual end-to-end walkthrough

1. Start the app: `npm run dev`, then sign in at `/signin`.
2. Open **DSA** from the sidebar (`/dsa`).
3. **Empty state**: with no records, confirm the list and summary show an empty/zero state inviting
   the first entry (FR-015).
4. **Log a problem (< 1 minute)**: fill the form (title, topic, difficulty, platform, time taken,
   attempt type, solved-without-hints, time/space complexity, confidence, needs-revision,
   interview-worthy; subtopic optional; solved date defaults to today). Save and confirm it appears
   at the top of the list (SC-001).
5. **Filters**: add a few problems across topics/difficulties. Filter by topic, by difficulty, by
   needs-revision, and by interview-worthy — individually and combined — and confirm only matching
   rows show; an impossible combination shows a clear "no matching problems" message (FR-006, SC-002).
6. **Insights**: confirm the summary shows the correct total, per-topic counts, per-difficulty
   counts, and a weak-topics callout ranked by lowest average confidence (tie-break higher
   needs-revision), and that these numbers do **not** change when list filters are applied (FR-007–
   FR-009, FR-016, SC-003, SC-004).
7. **Edit**: open a problem, change fields (e.g., flip needs-revision off), save, reopen, and confirm
   the change persisted and no other row changed (FR-003, SC-006).
8. **Delete with confirmation**: choose delete, cancel once (row remains), then confirm (row is
   removed and insights update); verify no other row was affected (FR-004, FR-013, SC-005).
9. **Auth guard**: without signing in, request `/api/dsa` and expect `401 UNAUTHORIZED` (FR-011).

## Success criteria mapping

| Check | Spec reference |
|-------|----------------|
| Log a problem in under a minute | SC-001 |
| Filters return exactly matching records | SC-002 |
| Total & per-topic counts equal stored records | SC-003 |
| Weak topics ranked by defined measure | SC-004 |
| No deletion without confirmation | SC-005 |
| Edit reflected on next view, no other record changed | SC-006 |
