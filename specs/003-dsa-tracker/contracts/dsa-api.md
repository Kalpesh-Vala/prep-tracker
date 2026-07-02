# DSA Tracker API Contract

All endpoints are Next.js Route Handlers under `app/api/dsa` (Node runtime). Requests and responses
are JSON and use the project's consistent envelope (Constitution Principle VII):

- **Success**: `{ "data": <payload> }`
- **Error**: `{ "error": { "code": <string>, "message": <string> } }`

Standard status codes: `200` OK, `201` Created, `204` No Content, `400` validation error, `401`
unauthorized, `404` not found, `503` datastore unavailable, `500` server error.

**Auth required: Yes** for every endpoint. The session is carried in the httpOnly `pt_session`
cookie; a request without a valid session is rejected with `401 UNAUTHORIZED` before any data
access, and all operations act only on the single owner's data (FR-011).

The `DsaProblemDTO` and `DsaSummaryDTO` shapes are defined in
[data-model.md](data-model.md#dto-shape-typesindexts).

---

## POST /api/dsa

Create a new problem record.

**Request body** (all required except `subtopic`; `solvedOn` optional, defaults to today):

```json
{
  "title": "Course Schedule",
  "topic": "Graphs",
  "subtopic": "Topological Sort",
  "difficulty": "medium",
  "platform": "LeetCode",
  "timeTakenMinutes": 35,
  "attemptType": "first_attempt",
  "solvedWithoutHints": false,
  "timeComplexity": "O(V + E)",
  "spaceComplexity": "O(V + E)",
  "confidence": 3,
  "needsRevision": true,
  "interviewWorthy": true,
  "solvedOn": "2026-07-02"
}
```

**Validation (server-side, Zod)**: enum membership (`difficulty`, `attemptType`); `confidence`
integer 1–5; `timeTakenMinutes` integer > 0; required non-empty strings (trimmed); `solvedOn` a
valid date, not in the future; unknown keys rejected. `topicKey` is derived server-side.

**Responses**:

| Status | Body | When |
|--------|------|------|
| `201` | `{ "data": { "problem": DsaProblemDTO } }` | Created |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Missing/invalid fields or future `solvedOn` |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |
| `503` | `{ "error": { "code": "DATASTORE_UNAVAILABLE", "message": "..." } }` | Datastore unreachable |

---

## GET /api/dsa

List problem records newest-first (`solvedOn` desc, then `createdAt` desc), with filters and
pagination.

**Query parameters** (all optional):

- `topic` — exact match on normalized topic key.
- `difficulty` — one of `easy` \| `medium` \| `hard`.
- `needsRevision` — `true` \| `false`.
- `interviewWorthy` — `true` \| `false`.
- `page` — integer ≥ 1 (default 1).
- `limit` — integer 1–100 (default 20).

Multiple filters combine with AND. Malformed params → `400`.

**Responses**:

| Status | Body | When |
|--------|------|------|
| `200` | `{ "data": { "items": DsaProblemDTO[], "page": number, "limit": number, "total": number, "totalPages": number } }` | OK (empty `items` when none match) |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Bad filter/pagination params |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |

---

## GET /api/dsa/[id]

Fetch a single record by id.

| Status | Body | When |
|--------|------|------|
| `200` | `{ "data": { "problem": DsaProblemDTO } }` | Found |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Malformed id |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |
| `404` | `{ "error": { "code": "NOT_FOUND", "message": "..." } }` | No record with that id |

---

## PATCH /api/dsa/[id]

Update a record in place with a validated subset of fields (same rules as create). Sending `topic`
recomputes `topicKey`.

| Status | Body | When |
|--------|------|------|
| `200` | `{ "data": { "problem": DsaProblemDTO } }` | Updated |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Invalid field value / empty patch |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |
| `404` | `{ "error": { "code": "NOT_FOUND", "message": "..." } }` | No record with that id |

---

## DELETE /api/dsa/[id]

Permanently delete a record by id. (The UI requires explicit confirmation before calling this.)

| Status | Body | When |
|--------|------|------|
| `200` | `{ "data": { "deleted": true, "id": string } }` | Deleted |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Malformed id |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |
| `404` | `{ "error": { "code": "NOT_FOUND", "message": "..." } }` | No record with that id |

---

## GET /api/dsa/summary

Return insights computed over **all** records (independent of list filters, FR-016).

**Response** `200`:

```json
{
  "data": {
    "totalSolved": 42,
    "countsByTopic": [{ "topic": "Graphs", "count": 12 }],
    "countsByDifficulty": { "easy": 10, "medium": 20, "hard": 12 },
    "weakTopics": [{ "topic": "DP", "averageConfidence": 2.1, "needsRevisionCount": 5 }]
  }
}
```

`weakTopics` is ranked by `averageConfidence` ascending, ties broken by `needsRevisionCount`
descending, with any remaining tie broken alphabetically by topic, surfacing up to a small fixed
number (e.g., 5).

| Status | Body | When |
|--------|------|------|
| `200` | summary payload above (zeros/empty arrays when no records) | OK |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |

---

## Notes

- Error mapping reuses `handleRouteError` from `lib/http.ts`; `DATASTORE_UNAVAILABLE` comes from the
  connection layer.
- Spaced-repetition scheduling and external platform syncing are excluded (FR-014).
