# Quickstart: CS Fundamentals Tracker Validation

This guide proves the CS Fundamentals Tracker works end-to-end. It references
[contracts/cs-fundamentals-api.md](contracts/cs-fundamentals-api.md) and
[data-model.md](data-model.md) rather than duplicating field rules.

## Prerequisites

- Node.js and dependencies installed (`npm install`).
- A `.env` with `MONGODB_URI` and `AUTH_SECRET` (see `.env.example`). No new variables required.
- A seeded owner account (`npm run seed`) to sign in with.

## Automated tests (primary validation)

```bash
npm run typecheck      # strict TypeScript passes
npm run lint           # zero lint errors
npm test               # unit + integration suites pass
```

Expected new suites —

- `tests/unit/csFundamentals.test.ts` — normalization + `conceptKey` generation, duplicate detection,
  enum/range validation, the weak-concept rule + ranking, and summary percentage calculations.
- `tests/integration/cs-fundamentals.test.ts` — API behavior for: create (201), validation failure
  (400), duplicate-concept conflict (409), list with filters (domain/stage/confidence range/weak-only/
  not-interview-ready) and pagination, single fetch (200/404), update-in-place (200), archive
  (soft-delete, 200), summary correctness, and unauthorized (401) across endpoints.

## Manual end-to-end walkthrough

1. Start the app: `npm run dev`, then sign in at `/signin`.
2. Open **CS Fundamentals** from the sidebar (`/cs-fundamentals`).
3. **Empty state**: with no concepts, confirm the list and summary show empty/zero states (FR-018).
4. **Add a concept (< 1 minute)**: fill domain, title, optional subtopic/tags, stage, confidence,
   last-revised date, optional notes/question refs; save; confirm it appears in the list (SC-001).
5. **Duplicate guard**: attempt to add the same domain + title + subtopic; confirm a `409` routes you
   to update the existing concept and the original is intact (FR-012, SC-006).
6. **Progress a stage**: from the list, quick-update a concept's stage (learned → revised →
   interview-ready) and confidence; confirm the same record updates in place (no duplicate) (FR-003,
   US3).
7. **Filters**: filter by domain, by stage, by confidence band (low/medium/high), by "not
   interview-ready", and "weak only" — individually and combined; confirm only matching concepts show;
   an impossible combination shows a clear "no matching concepts" message (FR-006, SC-002).
8. **Insights**: confirm the summary shows total, per-domain and per-stage counts, interview-ready %
   overall and per domain, and a weak-concepts list ranked weakest-first (FR-007–FR-011, SC-003–SC-005).
9. **Edit**: open a concept, change fields, save, reopen, and confirm the change persisted and no other
   concept changed (FR-004, US5).
10. **Archive**: choose delete/archive, confirm in the dialog, and verify the concept leaves the list
    and the counts update while its data is retained (soft delete, FR-016).
11. **Auth guard**: without signing in, request `/api/cs-fundamentals` and expect `401` (FR-014).

## Success criteria mapping

| Check | Spec reference |
|-------|----------------|
| Add a concept in under a minute | SC-001 |
| Filters return exactly matching concepts | SC-002 |
| Total / per-domain / per-stage counts correct | SC-003 |
| Interview-ready % correct overall and per domain | SC-004 |
| Weak-concepts list ranked by the combined score | SC-005 |
| Stage update keeps one record, reflected on next view | SC-006 |
| Identify highest-priority weak areas in under a minute | SC-007 |
