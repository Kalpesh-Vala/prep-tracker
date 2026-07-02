# Weekly Review API Contract

All endpoints are Next.js Route Handlers under `app/api/weekly-review` (Node runtime). Requests and
responses are JSON and use the project's consistent envelope (Constitution Principle VII):

- **Success**: `{ "data": <payload> }`
- **Error**: `{ "error": { "code": <string>, "message": <string> } }`

Standard status codes: `200` OK, `201` Created, `400` validation error, `401` unauthorized, `404`
not found, `409` conflict (duplicate week), `503` datastore unavailable, `500` server error.

**Auth required: Yes** for every endpoint (httpOnly `pt_session` cookie). A request without a valid
session is rejected `401 UNAUTHORIZED` before any data access; all operations act only on the single
owner's data (FR-010).

`WeeklyReviewDTO` and `WeeklyPrefillDTO` shapes are in
[data-model.md](data-model.md#dto-shape-typesindexts).

---

## POST /api/weekly-review

Create a review for a week. `weekStartDate`/`weekEndDate` are derived server-side from `weekNumber`.

**Request body**:

```json
{
  "weekNumber": 5,
  "plannedWork": "Finish graphs + 20 DSA problems",
  "completedWork": "Graphs done, 16 problems",
  "totalStudyHours": 18.5,
  "problemsSolved": 16,
  "dsaAccuracyPercent": 80,
  "weakTopics": ["DP", "Tries"],
  "wins": "First hard graph problem solved unaided",
  "nextWeekAdjustments": "More DP practice",
  "prefillSourceUsed": true
}
```

**Validation (server-side, Zod)**: `weekNumber` integer 1–26; required non-empty trimmed text
(`plannedWork`, `completedWork`, `wins`, `nextWeekAdjustments`); `totalStudyHours >= 0`;
`problemsSolved` integer `>= 0`; `dsaAccuracyPercent` 0–100 when present; `weakTopics` array of
trimmed strings (may be empty); unknown keys rejected. Derived dates are set server-side.

**Responses**:

| Status | Body | When |
|--------|------|------|
| `201` | `{ "data": { "review": WeeklyReviewDTO } }` | Created |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Missing/invalid fields or week out of 1–26 |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |
| `409` | `{ "error": { "code": "DUPLICATE_WEEK", "message": "A review for this week already exists. Edit it instead." } }` | Week already reviewed (FR-004) |

---

## GET /api/weekly-review

List reviews newest-first (`weekStartDate` desc), with optional pagination.

**Query parameters**: `page` (integer ≥ 1, default 1), `limit` (integer 1–100, default 26).

| Status | Body | When |
|--------|------|------|
| `200` | `{ "data": { "items": WeeklyReviewDTO[], "page": number, "limit": number, "total": number, "totalPages": number } }` | OK (empty `items` when none) |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Bad pagination params |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |

---

## GET /api/weekly-review/[id]

Fetch a single review by id.

| Status | Body | When |
|--------|------|------|
| `200` | `{ "data": { "review": WeeklyReviewDTO } }` | Found |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Malformed id |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |
| `404` | `{ "error": { "code": "NOT_FOUND", "message": "..." } }` | No review with that id |

---

## PATCH /api/weekly-review/[id]

Update a review in place with a validated subset. `weekNumber` and derived dates are immutable.

| Status | Body | When |
|--------|------|------|
| `200` | `{ "data": { "review": WeeklyReviewDTO } }` | Updated |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Invalid value / attempt to change week / empty patch |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |
| `404` | `{ "error": { "code": "NOT_FOUND", "message": "..." } }` | No review with that id |

---

## GET /api/weekly-review/prefill

Return suggested totals for a week derived from existing Daily Log + DSA data. **Read-only** — never
creates or modifies a review.

**Query parameters**: `weekNumber` (integer 1–26, required).

**Behavior**: derive the week's date range; sum Daily Log study hours and count DSA entries in range;
suggest weak topics via the DSA weak-topic rule; include coverage metadata. Sparse weeks return
zeros/empty lists with metadata, never an error.

| Status | Body | When |
|--------|------|------|
| `200` | `{ "data": WeeklyPrefillDTO }` | OK (zeros/empty + `coverage.hasData=false` when no source data) |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Missing/invalid `weekNumber` |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |

`suggestedDsaAccuracyPercent` is `null` (with a `coverage.notes` explanation) because DSA entries
record only solved problems, so a true success rate is not derivable from stored data.

---

## Notes

- No `DELETE` endpoint (out of scope for this slice).
- Error mapping reuses `handleRouteError`; `DATASTORE_UNAVAILABLE` comes from the connection layer.
- Automated coaching/recommendations are excluded (FR-013).
