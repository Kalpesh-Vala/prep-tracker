# Feature Specification: CS Fundamentals Tracker (Concept Maturity & Readiness)

**Feature Branch**: `feat/05-cs-fundamentals`

**Created**: 2026-07-03

**Status**: Draft

**Input**: User description: "Add a CS Fundamentals Tracker feature to the preparation tracker for the authenticated single user to systematically track interview preparation across core theory domains: DBMS, Operating Systems, Computer Networks, and Object-Oriented Programming. The feature tracks preparation at concept level. Each concept progresses through a clear maturity path: learned → revised → can-explain → interview-ready. For each concept, the user can record: domain, concept title, optional subtopic or tags, current maturity stage, confidence level (1–5), last revised date, optional notes, and optional interview question references linked to the concept. The user can: create a concept entry, update any concept's maturity stage over time, edit concept details, view all concepts with filters, and quickly see which concepts are weak or not yet interview-ready. Filtering: by domain, by maturity stage, by confidence band, and a focused 'not interview-ready' view. Summary insights: total concepts tracked, concepts count by domain, concepts count by maturity stage, interview-ready percentage overall and by domain, and a weak concepts list (low confidence and/or stale revision). Behavioral expectations: concept tracking is longitudinal — updates should preserve the concept record rather than creating duplicates for normal progress updates; user must be able to quickly identify what to revise next; no data should be silently lost during edits or stage updates; all data is private to the authenticated single user. Out of scope: auto-generated learning plans, external content sync, AI tutoring/recommendations. Success: the user can maintain a living map of CS theory readiness, move concepts through maturity stages, and in under a minute identify the highest-priority weak areas before revision sessions or interviews."

## Clarifications

### Session 2026-07-03

- Q: What identifies "the same concept" for the no-duplicates rule? → A: Domain + title + subtopic (all case-insensitive, trimmed); the same title under a different subtopic is a distinct concept. Subtopic is a single optional field (separate from the free-form tags list) and participates in the identity.
- Q: How are weak concepts determined and ranked? → A: By a single combined weakness score blending confidence and revision staleness; a concept is included if low-confidence (1–2) and/or stale, and the list is ranked weakest-first by that score.
- Q: How many days without revision counts as "stale"? → A: 14 days (a concept not revised within the last 14 days is stale).
- Q: How does the confidence-band filter work? → A: Selectable bands — low (1–2), medium (3), high (4–5).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a CS concept to track (Priority: P1)

The authenticated user is studying a core CS theory topic and wants to start tracking it. They add a
concept: its domain (DBMS, OS, Networks, or OOP), a title, optional tags, its current maturity stage,
a confidence rating, the date they last revised it, and optionally notes and interview-question
references. They save, and the concept is now part of their living readiness map.

**Why this priority**: Capturing concepts is the reason the tracker exists. Without reliable creation,
there is nothing to progress, filter, or analyze. This is the minimum viable, demonstrable slice.

**Independent Test**: Sign in, add a concept with valid values, save, and confirm it is persisted and
appears in the concept list.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they complete the add-concept form with valid values and
   save, **Then** the concept is persisted and appears in the list.
2. **Given** the add-concept form, **When** the user leaves the optional fields (tags, notes,
   question references) blank but completes the required fields, **Then** the concept saves
   successfully.
3. **Given** the add-concept form, **When** the user submits an invalid value (e.g., an unknown
   domain, a confidence outside 1–5, or a future last-revised date), **Then** the concept is rejected
   with a clear message and nothing is persisted.

---

### User Story 2 - View and filter concepts (Priority: P1)

The user wants to focus their study. They open the tracker and see all concepts, then filter by domain,
by maturity stage, by confidence band (e.g., low confidence), and can switch to a focused "not
interview-ready" view — individually or combined — to zero in on what matters.

**Why this priority**: Retrieval and filtering are the core of "quickly identify what to revise next."
Once concepts exist, the user must be able to slice them to find weak or not-yet-ready items.

**Independent Test**: With concepts across domains, stages, and confidence values, apply each filter
and combination and confirm only matching concepts are shown.

**Acceptance Scenarios**:

1. **Given** several concepts, **When** the user opens the tracker, **Then** all concepts are listed.
2. **Given** the list, **When** the user filters by a domain and a maturity stage together, **Then**
   only concepts matching both are shown.
3. **Given** the list, **When** the user enables the "not interview-ready" view, **Then** only
   concepts whose stage is not "interview-ready" are shown.
4. **Given** the list, **When** the user filters by the low confidence band, **Then** only concepts in
   that band are shown.
5. **Given** an active filter combination with no matches, **When** the results render, **Then** a
   clear "no matching concepts" message is shown.

---

### User Story 3 - Progress a concept through maturity stages (Priority: P2)

As the user studies, a concept matures: learned → revised → can-explain → interview-ready. The user
updates a concept's maturity stage over time. The update changes that same concept record in place —
it never creates a duplicate — and its last-revised date and confidence can be adjusted alongside.

**Why this priority**: Longitudinal progression is the signature behavior of this tracker and the
reason it is a "living map." Getting the in-place update right protects the concept's history from
duplication.

**Independent Test**: Create a concept at "learned", advance it to "revised" then "interview-ready",
and confirm there is still exactly one record for that concept with the latest stage.

**Acceptance Scenarios**:

1. **Given** a saved concept, **When** the user changes its maturity stage and saves, **Then** the
   same concept record is updated in place with the new stage (no new record is created).
2. **Given** a concept the user is progressing, **When** they update its stage, **Then** its
   last-revised date and confidence may be updated in the same action.
3. **Given** any stage update, **When** it completes, **Then** the concept's other details and its
   record identity are preserved.

---

### User Story 4 - See readiness insights and weak concepts (Priority: P2)

The user wants a fast read on overall readiness and what to fix. The tracker surfaces the total number
of concepts, counts by domain and by maturity stage, the interview-ready percentage overall and per
domain, and a weak-concepts list (low confidence and/or stale revision) so the user can decide what to
revise next.

**Why this priority**: The insights turn the concept map into a prioritized action list, which is the
ultimate success goal ("identify the highest-priority weak areas"). It depends on concepts existing but
adds distinct value.

**Independent Test**: With a known set of concepts across domains, stages, and confidence values,
confirm the totals, per-domain and per-stage counts, interview-ready percentages, and weak-concepts
ranking match the expected values.

**Acceptance Scenarios**:

1. **Given** tracked concepts, **When** the user opens the tracker, **Then** the total concept count,
   counts by domain, and counts by maturity stage are displayed.
2. **Given** concepts with varying stages, **When** the insights render, **Then** the interview-ready
   percentage is shown overall and per domain.
3. **Given** concepts with varying confidence and last-revised dates, **When** the insights render,
   **Then** the weak-concepts list surfaces low-confidence and/or stale concepts using the defined
   measure.
4. **Given** no concepts, **When** the tracker opens, **Then** the counts show zero and an empty state
   invites the user to add their first concept.

---

### User Story 5 - Edit concept details (Priority: P2)

The user refines a concept: fixing a title, adding tags, notes, or interview-question references, or
correcting confidence. They open the concept, change any of its fields, and save; the corrected values
replace the old ones and no other concept is affected.

**Why this priority**: Concept records accrue detail over time. Editing keeps the map accurate and the
insights trustworthy.

**Independent Test**: Open a concept, change one or more fields, save, reopen, and confirm the updated
values persisted and no other concept changed.

**Acceptance Scenarios**:

1. **Given** a saved concept, **When** the user edits its fields with valid values and saves, **Then**
   the concept is updated in place and the new values are shown.
2. **Given** the user edits a concept, **When** they submit an invalid value, **Then** the update is
   rejected with a clear message and the previously saved values remain unchanged.
3. **Given** the user edits one concept, **When** they save, **Then** no other concept is altered.

---

### User Story 6 - Prevent duplicate concepts (Priority: P3)

The user attempts to add a concept that already exists (same domain, title, and subtopic). Instead of
creating a second record for the same concept, the system recognizes the duplicate and routes the user
to update the existing concept.

**Why this priority**: The "no duplicates for normal progress updates" rule keeps the map and its
insights honest. Duplicating a concept would inflate counts and split its history.

**Independent Test**: Create a concept, then attempt to create another with the same domain, title, and
subtopic; confirm the duplicate is prevented and the original concept is intact.

**Acceptance Scenarios**:

1. **Given** a concept already exists for a domain, title, and subtopic, **When** the user attempts to
   add another with the same domain, title, and subtopic, **Then** the system prevents the duplicate
   and directs the user to update the existing concept.
2. **Given** any create or update operation, **When** it completes, **Then** each tracked concept still
   has exactly one record and none has been silently removed or overwritten by an unrelated one.

---

### Edge Cases

- **No concepts yet**: The list shows an empty state and the insights show zeros.
- **Filter with no matches**: A clear "no matching concepts" message is shown; clearing filters
  restores the full list.
- **Duplicate concept**: Adding an already-tracked concept (same domain + title + subtopic) routes the
  user to update the existing one rather than creating a second record.
- **Title normalization**: For the duplicate rule, a concept's domain, title, and subtopic are matched
  case-insensitively and trimmed (e.g., "Normalization" and "normalization " are the same concept
  within a domain and subtopic).
- **Confidence and domain/stage boundaries**: Confidence must be an integer 1–5; domain must be one of
  the four allowed values; maturity stage must be one of the four allowed stages; values outside these
  are rejected.
- **Future last-revised date**: A last-revised date in the future is rejected.
- **Stale revision**: A concept not revised within the staleness window counts as stale for the
  weak-concepts view even if its confidence is moderate.
- **Empty optional fields**: Tags, notes, and interview-question references may be empty without
  blocking the concept.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow the authenticated user to create a CS concept capturing all of its
  fields.
- **FR-002**: Each concept MUST capture: domain (DBMS / OS / Networks / OOP), concept title, an
  optional subtopic, optional tags, current maturity stage (learned / revised / can-explain /
  interview-ready), confidence level (integer 1–5), last-revised date, optional notes, and optional
  interview-question references. Each free-text field is limited to a reasonable maximum length.
- **FR-003**: System MUST allow the user to update a concept's maturity stage over time, changing the
  same concept record in place without creating a duplicate.
- **FR-004**: System MUST allow the user to edit a concept's details in place.
- **FR-005**: System MUST present a list of all tracked (non-archived) concepts. The list MAY be
  paginated for efficiency with a stable ordering; across pages every matching concept appears exactly
  once, with none omitted or duplicated.
- **FR-006**: System MUST allow filtering the list by domain, by maturity stage, and by confidence band
  (low = 1–2, medium = 3, high = 4–5), and MUST provide a focused "not interview-ready" view and a
  "weak only" view (the weak-concepts rule); filters apply individually or in any combination (results
  match all active filters).
- **FR-007**: System MUST surface the total number of tracked concepts.
- **FR-008**: System MUST surface a count of concepts per domain.
- **FR-009**: System MUST surface a count of concepts per maturity stage.
- **FR-010**: System MUST surface the interview-ready percentage overall and per domain, rounded to
  whole numbers.
- **FR-011**: System MUST surface a weak-concepts list of concepts that are low-confidence and/or
  stale, ranked by a single combined weakness score (weakest first) that blends confidence and
  revision staleness deterministically.
- **FR-012**: System MUST enforce one record per concept (unique by domain + title + subtopic, all
  normalized case-insensitively and trimmed), preventing duplicates for normal progress updates and
  directing the user to update the existing concept instead.
- **FR-013**: System MUST validate all input server-side before persisting, rejecting invalid values
  (e.g., unknown domain or stage, confidence outside 1–5, future last-revised date, missing required
  fields) with a clear message and persisting nothing on rejection.
- **FR-014**: System MUST restrict all CS Fundamentals operations (create, update, edit, list,
  insights) to the single authenticated user, rejecting unauthenticated access.
- **FR-015**: System MUST record when each concept was created and last updated.
- **FR-016**: System MUST guarantee that editing a concept or updating its stage never removes,
  overwrites, or corrupts any other concept, and never silently loses the edited concept's data.
- **FR-017**: System MUST exclude auto-generated learning plans, external content sync, and AI
  tutoring/recommendations from this feature.
- **FR-018**: System MUST display clear empty states for both the concept list (no concepts, or no
  matches for the active filters) and the insights (zero total).
- **FR-019**: System MUST allow archiving a concept (soft delete) after explicit user confirmation;
  an archived concept is retained (its data is not destroyed) and is excluded from the default concept
  list and from all counts and insights. There is no permanent (hard) deletion in this slice.

### Key Entities *(include if feature involves data)*

- **CS Concept**: Represents one tracked CS theory concept, owned by the single authenticated user, and
  updated longitudinally (one record per concept). Key attributes: domain (DBMS / OS / Networks / OOP),
  title, optional subtopic, tags (optional list), maturity stage (learned / revised / can-explain /
  interview-ready), confidence (integer 1–5), last-revised date, notes (optional), interview-question
  references (optional list), and creation/last-updated timestamps. Identity is (domain, title,
  subtopic) normalized — at most one record exists per that combination.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can add a concept — from opening the add form to a confirmed save — in under one
  minute.
- **SC-002**: Any single filter or combination of filters (domain, stage, confidence band,
  not-interview-ready) returns exactly the concepts matching all active filters.
- **SC-003**: The total count and the per-domain and per-stage counts always equal the actual set of
  tracked concepts.
- **SC-004**: The interview-ready percentage is computed correctly overall and per domain for any given
  set of concepts.
- **SC-005**: The weak-concepts list correctly reflects the defined combined weakness score (blending
  low confidence and stale revision) and its ranking for any given set of concepts.
- **SC-006**: Updating a concept's maturity stage preserves a single record for that concept (no
  duplicate) and is reflected on the next view 100% of the time.
- **SC-007**: A user can identify the highest-priority weak areas (weak-concepts list or
  not-interview-ready view) in under one minute.

## Assumptions

- **Single user**: The application has exactly one authenticated owner; all concepts belong to that
  account, consistent with the existing foundation.
- **Longitudinal, one record per concept**: A concept is identified by its domain plus its title
  (matched case-insensitively and trimmed). Normal progress updates edit that single record in place;
  a create for an already-tracked (domain, title) is prevented and routes to updating the existing
  concept.
- **Maturity stages**: The ordered path is learned → revised → can-explain → interview-ready. "Not
  interview-ready" means any stage other than interview-ready. Stage changes may move in any direction
  (progress or correction).
- **Tags and question references**: Tags and interview-question references are each captured as an
  optional list of short text entries (a question reference may be a question or a URL); either may be
  empty. The "subtopic" is captured via tags.
- **Confidence and bands**: Confidence is an integer 1–5. The confidence-band filter offers low (1–2),
  medium (3), and high (4–5); the "low" band aligns with the weak-concepts measure.
- **Last-revised date**: A calendar date the user last revised the concept; it defaults to today on
  create, may be a past date, and rejects future dates.
- **Weak-concepts measure**: Each concept has a single combined weakness score that increases as
  confidence decreases and as the last-revised date becomes more stale. The list includes concepts
  that are low-confidence (1–2) and/or stale (not revised within the last 14 days), ranked by the
  combined score weakest-first, with ties broken deterministically by domain then title. Confidence is
  the dominant factor and staleness (days since last revised) is the secondary factor; the exact
  weighting is deterministic and documented in the implementation.
- **Interview-ready percentage**: Computed as interview-ready concepts ÷ total concepts (for the scope
  — overall or a domain) × 100; a domain with no concepts shows 0%.
- **Archive instead of delete**: Concepts are never hard-deleted. A concept may be archived (soft
  delete) after explicit confirmation, which hides it from the list, counts, and insights while
  preserving its data; this slice has no permanent deletion.
- **Reuse of existing platform**: Authentication, navigation shell, and data persistence established by
  the foundation slice are reused; this feature adds the CS Fundamentals tracker on top of them.
- **Out of scope**: Auto-generated learning plans, external content sync, and AI
  tutoring/recommendations are explicitly excluded.
