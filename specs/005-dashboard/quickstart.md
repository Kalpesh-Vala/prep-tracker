# Quickstart: Dashboard Validation

This guide proves the Dashboard works end-to-end. It references
[contracts/dashboard-api.md](contracts/dashboard-api.md) and [data-model.md](data-model.md) rather
than duplicating formulas.

## Prerequisites

- Node.js and dependencies installed (`npm install`).
- A `.env` with `MONGODB_URI` and `AUTH_SECRET` (see `.env.example`). No new variables required.
- A seeded owner account (`npm run seed`) to sign in with.
- Optional: some Daily Log, DSA, and Weekly Review data to see non-zero metrics.

## Automated tests (primary validation)

```bash
npm run typecheck      # strict TypeScript passes
npm run lint           # zero lint errors
npm test               # unit + integration suites pass
```

Expected new suites —

- `tests/unit/dashboard.test.ts` — current-week computation, completion-% formula, hours aggregation
  and percentage (incl. cap), streak calculation across today/yesterday/broken/zero-hours boundaries,
  and weekly-goals resolution.
- `tests/integration/dashboard.test.ts` — `GET /api/dashboard/summary`: correct values against seeded
  Daily Log/DSA/Weekly Review data, empty-data zeros/empty, and unauthorized (401).

## Manual end-to-end walkthrough

1. Start the app: `npm run dev`, then sign in at `/signin`. Confirm you land on the **Dashboard**
   (`/dashboard`) as the home screen (FR-011).
2. **Empty state**: with no data, confirm the dashboard renders zeros/empty (0 hours, 0 streak,
   "goals not set yet") without errors (FR-012, SC-006).
3. **Progress metrics**: add several daily logs with study hours. Reopen the dashboard and confirm the
   total hours, the hours-vs-936 progress indicator, and the completion % + current week are shown
   (FR-001–FR-003, SC-003).
4. **Streak**: create daily logs with `studyHours > 0` for today and the preceding consecutive days;
   confirm the streak count matches. Add a zero-hours day in the middle and confirm it breaks the
   streak; remove today's log (keep yesterday's) and confirm the streak still counts (FR-004, FR-008,
   SC-002).
5. **This week's goals**: create a Weekly Review for the current week; confirm its planned work shows
   as this week's goals. With no such review, confirm the "not set yet" state links to Weekly Review
   (FR-005).
6. **DSA figures**: add DSA entries (some solved this week); confirm the all-time total and
   this-week counts (FR-015).
7. **Quick links**: click each quick link/card and confirm it navigates to the Daily Log, DSA Tracker,
   and Weekly Review pages (FR-006, SC-005).
8. **Auto-update**: note a metric, change underlying data, reopen the dashboard, and confirm the metric
   updated with no stale value (FR-009, SC-004).
9. **Auth guard**: without signing in, request `/api/dashboard/summary` and expect `401` (FR-010).

## Success criteria mapping

| Check | Spec reference |
|-------|----------------|
| See progress/streak/hours/next within seconds | SC-001 |
| Streak equals actual consecutive qualifying days | SC-002 |
| Hours total + capped progress indicator correct | SC-003 |
| Reopening reflects underlying data changes | SC-004 |
| Quick links reach the right pages | SC-005 |
| Sensible empty states, no errors | SC-006 |
