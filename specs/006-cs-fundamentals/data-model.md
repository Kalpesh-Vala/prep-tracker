# Phase 1 Data Model: CS Fundamentals Tracker

Persistence: MongoDB Atlas via the existing cached Mongoose connection (`lib/db.ts`). The model uses
`{ timestamps: true }` so every document carries `createdAt`/`updatedAt` (Principle II). Names are
consistent across the database, types, API, and UI (Principle VII).

## Entity: CsFundamentalConcept

One tracked CS theory concept, owned by the single owner, updated longitudinally (one record per
concept). At most one record per `(domain, normalized title, normalized subtopic)`.

| Field | Type | Rules |
|-------|------|-------|
| `_id` | ObjectId | Primary key (auto) |
| `domain` | string | Required; enum `DBMS` \| `OS` \| `NETWORKS` \| `OOP` |
| `title` | string | Required; trimmed; non-empty; max 200 chars (display casing preserved) |
| `subtopic` | string (optional) | Optional; trimmed; max 200 chars |
| `conceptKey` | string | Derived, required, **unique**; `domain + '|' + lower(trim(title)) + '|' + lower(trim(subtopic))`; set server-side |
| `tags` | string[] | Optional; each entry trimmed, non-empty, max 60 chars; may be empty |
| `stage` | string | Required; enum `learned` \| `revised` \| `can_explain` \| `interview_ready` |
| `confidence` | number | Required; integer `1..5` |
| `lastRevisedAt` | Date | Required; normalized midnight UTC; defaults to today; past allowed; future rejected |
| `notes` | string (optional) | Optional; trimmed; max 4000 chars |
| `interviewQuestionRefs` | string[] | Optional; each trimmed, non-empty, max 500 chars; may be empty |
| `isArchived` | boolean | Default `false`; soft-delete flag |
| `createdAt` | Date | Auto (timestamps) |
| `updatedAt` | Date | Auto (timestamps) |

### Indexes

- **Unique index on `conceptKey`** — enforces one record per (domain, title, subtopic) (FR-012);
  duplicate insert → duplicate-key (11000) → `409`.
- `domain`, `stage`, `confidence`, `lastRevisedAt`, `createdAt` — support filters and stable listing.

### Validation (two layers)

- **Zod (API boundary, `lib/csFundamentals.ts`)**: enum membership (`domain`, `stage`); `confidence`
  integer 1–5; required non-empty trimmed `title`; optional trimmed `subtopic`/`notes`; `tags` and
  `interviewQuestionRefs` arrays of trimmed strings; `lastRevisedAt` valid and not future; unknown
  keys rejected (`.strict()`). `conceptKey` is derived server-side.
- **Mongoose schema**: mirrors constraints (`enum`, `min`/`max`, `required`, `maxlength`, unique index)
  as defense in depth.

### Lifecycle & integrity

- **Create**: normalize → derive `conceptKey` → resolve `lastRevisedAt` → insert (no upsert). Duplicate
  key → `409` (original untouched).
- **Update (stage/details)**: id-scoped `PATCH` of a validated subset; recompute `conceptKey` if
  domain/title/subtopic change (re-checking uniqueness → 409); no other concept touched (FR-016). In
  place — never creates a duplicate (FR-003).
- **Archive (soft delete)**: `DELETE` sets `isArchived = true` after UI confirmation; document is
  retained; default list/summary exclude archived. No hard delete.
- **No silent loss**: create inserts only; update/archive are id-scoped; every other concept is
  unaffected.

## Derived: Summary (computed, not stored)

Computed over non-archived concepts:

```text
CsSummaryDTO {
  totalConcepts: number;
  countsByDomain: { DBMS: number; OS: number; NETWORKS: number; OOP: number };
  countsByStage: { learned: number; revised: number; can_explain: number; interview_ready: number };
  interviewReadyPercentageOverall: number;                       // round(ready / total * 100)
  interviewReadyPercentageByDomain: { DBMS; OS; NETWORKS; OOP }; // per-domain %, 0 when empty
  weakConcepts: CsConceptDTO[];                                  // ranked weakest-first (see rule)
}
```

**Weak rule**: include if `confidence ≤ 2` OR `daysSince(lastRevisedAt) > 14`; rank by
`weaknessScore = (5 − confidence) × 30 + daysSince(lastRevisedAt)` descending, tie-break domain then
title.

## DTO shape (types/index.ts)

```text
CsConceptDTO {
  id: string;
  domain: 'DBMS' | 'OS' | 'NETWORKS' | 'OOP';
  title: string;
  subtopic?: string;
  tags: string[];
  stage: 'learned' | 'revised' | 'can_explain' | 'interview_ready';
  confidence: number;      // 1..5
  lastRevisedAt: string;   // ISO date (UTC midnight)
  notes?: string;
  interviewQuestionRefs: string[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Relationships: none beyond implicit single-owner ownership.
