# Quickstart: Daily Log Validation

This guide proves the Daily Log feature works end-to-end. It references
[contracts/daily-log-api.md](contracts/daily-log-api.md) and
[data-model.md](data-model.md) rather than duplicating field rules.

## Prerequisites

- Node.js installed and dependencies present (`npm install`).
- A `.env` file with `MONGODB_URI` and `AUTH_SECRET` (see `.env.example`). No new variables are
  required for this feature.
- A seeded owner account (`npm run seed`) so you can sign in.

## Automated tests (primary validation)

```bash
npm run typecheck      # strict TypeScript passes
npm run lint           # zero lint errors
npm test               # unit + integration suites pass
```

Expected: the new suites pass —

- `tests/unit/dailyLog.test.ts` — payload validation, date normalization, and the
  one-entry-per-day rule.
- `tests/integration/daily-log.test.ts` — API behavior for: create success (`201`), validation
  failure (`400`), duplicate-date conflict (`409`), unauthorized access (`401`), list ordering
  (reverse-chronological), single fetch, and update-in-place without touching other entries.

## Manual end-to-end walkthrough

1. Start the app: `npm run dev`, then sign in at `/signin` with the seeded credentials.
2. Open **Daily Log** from the sidebar (`/daily-log`).
3. **Empty state**: with no entries, confirm the page shows an invitation to log the first day
   (SC — empty state).
4. **Log today (< 1 minute)**: fill study hours (e.g., `2.5`), a learning summary, problems solved
   (e.g., `4`), the revision toggle, biggest challenge, next-day goal, and optionally energy level
   (low / medium / high). The date defaults to today but can be changed to a past date to backfill
   a missed day. Save. Expect the entry to appear in the history list immediately (SC-001, SC-002).
5. **Duplicate guard**: attempt to create today's entry again. Expect to be routed to edit the
   existing entry rather than create a second one; the original data stays intact (FR-004, SC-004).
6. **History order**: with entries on multiple dates (seed a couple via the API or on different
   days), confirm the list is newest-first and each shows date, hours, problems solved, and
   revision status (FR-007).
7. **View + edit**: open an entry, confirm all fields display (energy level only when recorded),
   edit a field, save, reopen, and confirm the change persisted and the date is unchanged (FR-005,
   FR-006, SC-005).
8. **No silent loss**: confirm every previously logged date still has exactly one entry after the
   edits above (FR-011, SC-003).
9. **Auth guard**: in a private window without signing in, request `/api/daily-log` and expect
   `401 UNAUTHORIZED` (FR-012).

## Success criteria mapping

| Check | Spec reference |
|-------|----------------|
| Log a day in under a minute | SC-001 |
| Entry appears in history immediately, exactly once | SC-002 |
| No previously logged date lost across create/edit | SC-003 |
| Cannot create two entries for the same date | SC-004 |
| Edit changes only that day, reflected on next view | SC-005 |
| Invalid submissions rejected, nothing persisted | SC-006 |
