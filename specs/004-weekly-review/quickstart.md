# Quickstart: Weekly Review Validation

This guide proves the Weekly Review feature works end-to-end. It references
[contracts/weekly-review-api.md](contracts/weekly-review-api.md) and
[data-model.md](data-model.md) rather than duplicating field rules.

## Prerequisites

- Node.js and dependencies installed (`npm install`).
- A `.env` with `MONGODB_URI` and `AUTH_SECRET` (see `.env.example`). No new variables required.
- A seeded owner account (`npm run seed`) to sign in with.
- Optional: some Daily Log and DSA entries within a week's date range to exercise prefill.

## Automated tests (primary validation)

```bash
npm run typecheck      # strict TypeScript passes
npm run lint           # zero lint errors
npm test               # unit + integration suites pass
```

Expected new suites —

- `tests/unit/weeklyReview.test.ts` — week-boundary/week-key math, uniqueness helper, prefill
  aggregation (study-hours sum + DSA count) and weak-topic derivation, field validation.
- `tests/integration/weekly-review.test.ts` — API behavior for: create (201), validation failure
  (400), duplicate-week conflict (409), list ordering + pagination, single fetch (200/404),
  update-in-place (200/404), prefill with full/partial/no source data, and unauthorized (401) across
  all endpoints.

## Manual end-to-end walkthrough

1. Start the app: `npm run dev`, then sign in at `/signin`.
2. Open **Weekly Review** from the sidebar (`/weekly-review`).
3. **Empty state**: with no reviews, confirm the list invites the first review (FR-014).
4. **Prefill**: choose a week number, click "Prefill from this week's data", and confirm the study
   hours and problems-solved fields populate from that week's Daily Log/DSA entries; a week with no
   data shows zeros/empty with a coverage note (FR-008, SC-004).
5. **Create (a few minutes)**: complete the structured fields (planned, completed, study hours,
   problems solved, optional success rate, weak topics, wins, next-week adjustments), override a
   suggestion, and save. Confirm the saved review keeps the overridden value (SC-001, SC-004).
6. **Duplicate guard**: attempt to create a review for the same week; confirm you are routed to edit
   the existing review and the original is intact (FR-004, SC-002).
7. **Browse + trend**: with reviews for several weeks, confirm the list is newest-first and each row
   shows the week plus its weak topics and wins (FR-007, FR-015, SC-003, SC-006).
8. **View + edit**: open a week, confirm all fields; edit one, save, reopen, and confirm the change
   persisted and no other review changed (FR-005, FR-006, SC-005).
9. **Snapshot**: after saving, edit an underlying Daily Log/DSA entry for that week and confirm the
   saved review's totals do NOT change (FR-016).
10. **Auth guard**: without signing in, request `/api/weekly-review` and expect `401` (FR-010).

## Success criteria mapping

| Check | Spec reference |
|-------|----------------|
| Complete a structured review in a few minutes | SC-001 |
| Cannot create two reviews for the same week | SC-002 |
| All reviews appear once, in order | SC-003 |
| Prefill equals derived totals; overrides persist | SC-004 |
| Edit reflected, no other review changed | SC-005 |
| Weak topics & wins visible across weeks | SC-006 |
