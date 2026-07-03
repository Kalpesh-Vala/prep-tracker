# CS Fundamentals API Contract

All endpoints are Next.js Route Handlers under `app/api/cs-fundamentals` (Node runtime). JSON uses the
project's consistent envelope (Constitution Principle VII):

- **Success**: `{ "data": <payload> }`
- **Error**: `{ "error": { "code": <string>, "message": <string> } }`

Status codes: `200` OK, `201` Created, `400` validation error, `401` unauthorized, `404` not found,
`409` conflict (duplicate concept), `503` datastore unavailable, `500` server error.

**Auth required: Yes** for every endpoint (httpOnly `pt_session` cookie). Requests without a valid
session get `401 UNAUTHORIZED` before any data access; all operations act only on the single owner's
data (FR-014).

`CsConceptDTO` and `CsSummaryDTO` shapes are in
[data-model.md](data-model.md#dto-shape-typesindexts).

---

## POST /api/cs-fundamentals

Create a concept. `conceptKey` is derived server-side from domain + normalized title + subtopic.

**Request body**:

```json
{
  "domain": "DBMS",
  "title": "Normalization",
  "subtopic": "BCNF",
  "tags": ["schema", "theory"],
  "stage": "revised",
  "confidence": 3,
  "lastRevisedAt": "2026-07-01",
  "notes": "Watch for transitive dependencies",
  "interviewQuestionRefs": ["Explain BCNF vs 3NF"]
}
```

**Validation (Zod)**: `domain`/`stage` enum; `confidence` integer 1–5; required non-empty `title`;
optional trimmed `subtopic`/`notes`; `tags`/`interviewQuestionRefs` arrays of trimmed strings;
`lastRevisedAt` valid, not future (defaults to today); unknown keys rejected.

| Status | Body | When |
|--------|------|------|
| `201` | `{ "data": { "concept": CsConceptDTO } }` | Created |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Invalid fields / future date |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |
| `409` | `{ "error": { "code": "DUPLICATE_CONCEPT", "message": "This concept already exists. Update it instead." } }` | Same (domain, title, subtopic) exists (FR-012) |

---

## GET /api/cs-fundamentals

List non-archived concepts with filters and pagination; stable sort (`createdAt` desc).

**Query parameters** (all optional): `domain`, `stage`, `confidenceMin` (1–5), `confidenceMax` (1–5),
`interviewReady` (`true`/`false`), `notInterviewReady` (`true`/`false`), `weakOnly` (`true`/`false`),
`page` (≥1, default 1), `limit` (1–100, default 20). Filters combine with AND. Malformed → `400`.

| Status | Body | When |
|--------|------|------|
| `200` | `{ "data": { "items": CsConceptDTO[], "page", "limit", "total", "totalPages" } }` | OK (empty when none match) |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Bad filter/pagination params |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |

---

## GET /api/cs-fundamentals/[id]

Fetch a single concept by id.

| Status | Body | When |
|--------|------|------|
| `200` | `{ "data": { "concept": CsConceptDTO } }` | Found |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Malformed id |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |
| `404` | `{ "error": { "code": "NOT_FOUND", "message": "..." } }` | No concept with that id |

---

## PATCH /api/cs-fundamentals/[id]

Update a concept's details/stage/confidence/notes/revision date in place. If domain/title/subtopic
change, `conceptKey` is recomputed and re-checked for uniqueness (duplicate → 409).

**Request body**: any subset of editable fields (same validation as create).

| Status | Body | When |
|--------|------|------|
| `200` | `{ "data": { "concept": CsConceptDTO } }` | Updated |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Invalid value / empty patch |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |
| `404` | `{ "error": { "code": "NOT_FOUND", "message": "..." } }` | No concept with that id |
| `409` | `{ "error": { "code": "DUPLICATE_CONCEPT", "message": "..." } }` | Rename collides with another concept |

---

## DELETE /api/cs-fundamentals/[id]

**Soft archive** — sets `isArchived = true` (no hard delete). The UI requires explicit confirmation
before calling this. Archived concepts are excluded from the default list and summary.

| Status | Body | When |
|--------|------|------|
| `200` | `{ "data": { "archived": true, "id": string } }` | Archived |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Malformed id |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |
| `404` | `{ "error": { "code": "NOT_FOUND", "message": "..." } }` | No concept with that id |

---

## GET /api/cs-fundamentals/summary

Insights over non-archived concepts.

**Response** `200`:

```json
{
  "data": {
    "totalConcepts": 40,
    "countsByDomain": { "DBMS": 12, "OS": 10, "NETWORKS": 9, "OOP": 9 },
    "countsByStage": { "learned": 8, "revised": 14, "can_explain": 10, "interview_ready": 8 },
    "interviewReadyPercentageOverall": 20,
    "interviewReadyPercentageByDomain": { "DBMS": 25, "OS": 20, "NETWORKS": 11, "OOP": 22 },
    "weakConcepts": [{ "id": "...", "domain": "OS", "title": "Deadlocks", "confidence": 1 }]
  }
}
```

`weakConcepts` include concepts with `confidence ≤ 2` OR stale (`lastRevisedAt` > 14 days), ranked by
`weaknessScore = (5 − confidence) × 30 + daysSinceLastRevised` descending, tie-break domain then title.

| Status | Body | When |
|--------|------|------|
| `200` | `{ "data": CsSummaryDTO }` | OK (zeros/empty when none) |
| `401` | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` | No valid session |

---

## Notes

- Error mapping reuses `handleRouteError`; `DATASTORE_UNAVAILABLE` comes from the connection layer.
- Auto-generated plans, external content sync, and AI tutoring/recommendations are excluded (FR-017).
