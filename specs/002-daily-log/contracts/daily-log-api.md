# Daily Log API Contract

All endpoints are Next.js Route Handlers under `app/api/daily-log` (Node runtime). Requests and
responses are JSON and use the project's consistent envelope (Constitution Principle VII):

- **Success**: `{ "data": <payload> }`
- **Error**: `{ "error": { "code": <string>, "message": <string> } }`

Standard status codes: `200` OK, `201` Created, `400` validation error, `401` unauthorized,
`404` not found, `409` conflict (duplicate date), `503` datastore unavailable, `500` server error.

**Auth required: Yes** for every endpoint. The session is carried in the httpOnly `pt_session`
cookie. A request without a valid session is rejected with `401 UNAUTHORIZED` before any data
access. All operations act only on the single owner's data (FR-012).

The `DailyLogDTO` payload shape is defined in [data-model.md](data-model.md#derived--dto-shape-typesindexts).

---

## POST /api/daily-log

Create an entry for a calendar date that **defaults to today**. A **past** date may be supplied to
backfill a missed day; **future** dates are rejected.

**Request body**:

```json
{
  "date": "2026-06-29",
  "studyHours": 2.5,
  "summary": "Reviewed graph traversal and built a BFS template.",
  "problemsSolved": 4,
  "revisionCompleted": true,
  "biggestChallenge": "Cycle detection in directed graphs.",
  "nextDayGoal": "Practice topological sort.",
  "energyLevel": "high"
}
```

**Validation (server-side, Zod)**:

- `studyHours`: required number, `0 ≤ x ≤ 24`.
- `summary`, `biggestChallenge`, `nextDayGoal`: required, non-empty after trim.
- `problemsSolved`: required integer, `≥ 0`.
- `revisionCompleted`: required boolean.
- `energyLevel`: optional, one of `low` / `medium` / `high`.
- `date`: optional ISO date; defaults to today (UTC midnight). A past date is accepted (backfill);
  a future date is rejected.

**Behavior**: validate → insert a new document (never upsert). If an entry for today already
exists (unique-index duplicate-key), return `409` and do not modify the existing entry.

**Responses**:

| Status | Body | When |
|--------|------|------|
| `201` | `{ "data": { "entry": DailyLogDTO } }` | Created |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Missing/invalid fields or future date |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |
| `409` | `{ "error": { "code": "DUPLICATE_DATE", "message": "An entry for this date already exists. Edit it instead." } }` | Date already logged (FR-004) |
| `503` | `{ "error": { "code": "DATASTORE_UNAVAILABLE", "message": "..." } }` | Datastore unreachable |

---

## GET /api/daily-log

List entries in reverse-chronological order (newest `date` first), with optional pagination.

**Query parameters**:

- `limit` (optional): integer `1..100`, default `30`.
- `cursor` (optional): ISO date; returns entries with `date` strictly older than the cursor
  (keyset pagination). Omitted → newest page.

**Responses**:

| Status | Body | When |
|--------|------|------|
| `200` | `{ "data": { "entries": DailyLogDTO[], "nextCursor": string \| null } }` | OK (empty array when none exist) |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Bad `limit`/`cursor` |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |
| `503` | `{ "error": { "code": "DATASTORE_UNAVAILABLE", "message": "..." } }` | Datastore unreachable |

---

## GET /api/daily-log/[id]

Fetch a single entry by its id.

**Responses**:

| Status | Body | When |
|--------|------|------|
| `200` | `{ "data": { "entry": DailyLogDTO } }` | Found |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Malformed id |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |
| `404` | `{ "error": { "code": "NOT_FOUND", "message": "..." } }` | No entry with that id |
| `503` | `{ "error": { "code": "DATASTORE_UNAVAILABLE", "message": "..." } }` | Datastore unreachable |

---

## PATCH /api/daily-log/[id]

Update an existing entry by id. The `date` is immutable and cannot be changed; no other entry is
affected (FR-005, FR-011).

**Request body**: any subset of the editable fields (`studyHours`, `summary`, `problemsSolved`,
`revisionCompleted`, `biggestChallenge`, `nextDayGoal`, `energyLevel`). Provided fields are
validated with the same rules as create. Sending `energyLevel: null` clears the optional value.

**Responses**:

| Status | Body | When |
|--------|------|------|
| `200` | `{ "data": { "entry": DailyLogDTO } }` | Updated |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Invalid field value or attempt to change `date` |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |
| `404` | `{ "error": { "code": "NOT_FOUND", "message": "..." } }` | No entry with that id |
| `503` | `{ "error": { "code": "DATASTORE_UNAVAILABLE", "message": "..." } }` | Datastore unreachable |

---

## Notes

- No `DELETE` endpoint in this slice (out of scope, spec Assumptions).
- Error mapping reuses `handleRouteError` from `lib/http.ts`; `DATASTORE_UNAVAILABLE` is produced by
  `DatastoreUnavailableError` from the connection layer.
- Aggregation, streaks, and charts are explicitly excluded (FR-014); they belong to the Dashboard.
