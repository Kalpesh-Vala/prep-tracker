# Dashboard API Contract

One Next.js Route Handler under `app/api/dashboard` (Node runtime). JSON responses use the project's
consistent envelope (Constitution Principle VII):

- **Success**: `{ "data": <payload> }`
- **Error**: `{ "error": { "code": <string>, "message": <string> } }`

Status codes: `200` OK, `401` unauthorized, `503` datastore unavailable, `500` server error.

**Auth required: Yes** (httpOnly `pt_session` cookie). A request without a valid session is rejected
`401 UNAUTHORIZED` before any data access; all data belongs to the single owner (FR-010).

The `DashboardSummaryDTO` shape is defined in
[data-model.md](data-model.md#derived-dashboardsummarydto-computed-not-stored).

---

## GET /api/dashboard/summary

Return all dashboard metrics in one response, computed fresh from current data (no caching).

**Query parameters**: none. (Any future param would be Zod-validated; unknown params are ignored.)

**Behavior**: derive `currentWeek`; sum Daily Log study hours and compute the streak from one Daily
Log read; count all DSA and current-week DSA; look up the current week's Weekly Review goals; assemble
the DTO with a `lastUpdated` timestamp. Empty datasets yield zeros/empty, never an error.

**Response** `200`:

```json
{
  "data": {
    "currentWeek": 5,
    "totalWeeks": 26,
    "completionPercentage": 19,
    "totalHoursLogged": 84.5,
    "targetHours": 936,
    "hoursProgressPercentage": 9,
    "currentStreakDays": 6,
    "dsaTotalSolved": 42,
    "dsaSolvedThisWeek": 7,
    "weeklyGoals": "Finish graphs + 20 DSA problems",
    "weeklyGoalsStatus": "set",
    "lastUpdated": "2026-07-02T12:00:00.000Z"
  }
}
```

**Empty-data response** `200`:

```json
{
  "data": {
    "currentWeek": 1,
    "totalWeeks": 26,
    "completionPercentage": 4,
    "totalHoursLogged": 0,
    "targetHours": 936,
    "hoursProgressPercentage": 0,
    "currentStreakDays": 0,
    "dsaTotalSolved": 0,
    "dsaSolvedThisWeek": 0,
    "weeklyGoals": null,
    "weeklyGoalsStatus": "not_set",
    "lastUpdated": "2026-07-02T12:00:00.000Z"
  }
}
```

**Responses**:

| Status | Body | When |
|--------|------|------|
| `200` | `{ "data": DashboardSummaryDTO }` | OK (zeros/empty when no source data) |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |
| `503` | `{ "error": { "code": "DATASTORE_UNAVAILABLE", "message": "..." } }` | Datastore unreachable |

---

## Notes

- Read-only endpoint; never writes. Error mapping reuses `handleRouteError`; `DATASTORE_UNAVAILABLE`
  comes from the connection layer.
- Formulas are documented in [data-model.md](data-model.md#formula-definitions-pure-in-libdashboardts)
  and implemented once in `lib/dashboard.ts` (shared, not duplicated).
- Configurable widgets and custom date ranges are excluded (FR-013).
