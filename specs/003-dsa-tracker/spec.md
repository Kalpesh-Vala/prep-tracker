# Feature Specification: DSA Problem Tracker (Log, Filter, and Spot Weak Topics)

**Feature Branch**: `feat/02-dsa-tracker`

**Created**: 2026-07-02

**Status**: Draft

**Input**: User description: "Add a DSA problem tracker to the preparation tracker for the single authenticated user to log every data-structures-and-algorithms problem they practice. Each logged problem captures: a title, topic, subtopic, difficulty (easy/medium/hard), the platform it came from, time taken to solve, whether it was a first attempt or a revisit, whether it was solved without hints, its time complexity, its space complexity, a confidence rating from 1 to 5, whether it still needs revision, and whether it is interview-worthy. The user can: add a problem, edit a problem, delete a problem (with confirmation), and view all problems in a filterable list. The user can filter by topic, difficulty, needs-revision, and interview-worthy. The view also surfaces simple counts: total problems solved, counts per topic, and which topics are weakest (low average confidence or high needs-revision count). Out of scope: spaced-repetition scheduling and external platform syncing. Success: the user can quickly log a solved problem, later filter to 'needs revision' or 'weak topics,' and use that to decide what to practice next."

## Clarifications

### Session 2026-07-02

- Q: Is each entry a distinct problem or a separate practice record, and what does "total problems solved" count? → A: Each entry is a separate practice record; the same problem may be logged multiple times (first attempt and revisits as distinct rows), and total/per-topic counts count practice records (not deduplicated distinct problems).
- Q: How should the weakest topics be ranked? → A: By lowest average confidence first, breaking ties by higher needs-revision count.
- Q: How does the user pick a topic to filter by? → A: From a list of the topics that already exist among logged problems (normalized), matched exactly.
- Q: Do the counts and weakest-topics insights reflect all problems or the filtered subset? → A: All logged problems (global), independent of the active list filters.
- Q: When was a problem solved, and how is the list ordered? → A: Each record has a "solved on" date (defaults to today, past allowed, future rejected); the list is ordered reverse-chronologically by that date. The insights also include a per-difficulty count.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log a solved problem (Priority: P1)

The authenticated user has just finished solving a DSA problem and wants to record it. They open
the DSA tracker, add a new problem, and capture its title, topic and optional subtopic, difficulty,
the platform it came from, how long it took, whether this was a first attempt or a revisit, whether
they solved it without hints, its time and space complexity, a confidence rating, whether it still
needs revision, and whether it is interview-worthy. They save, and the problem is recorded.

**Why this priority**: Capturing solved problems is the reason the tracker exists. Without reliable
logging, there is nothing to filter, count, or learn from. This is the minimum viable, demonstrable
slice.

**Independent Test**: Sign in, add a problem with valid values, save, and confirm it is persisted
and appears in the problem list.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they open the add-problem form and complete the
   required fields with valid values, **Then** the problem is persisted and appears in the list.
2. **Given** the add-problem form, **When** the user leaves the optional subtopic blank but
   completes the required fields, **Then** the problem saves successfully.
3. **Given** the add-problem form, **When** the user submits an invalid value (e.g., a confidence
   outside 1–5, an unknown difficulty, or a non-positive time taken), **Then** the problem is
   rejected with a clear message and nothing is persisted.

---

### User Story 2 - View and filter the problem list (Priority: P1)

The user wants to review what they have practiced and narrow it down. They open the DSA tracker and
see all logged problems. They filter by topic, by difficulty, by "needs revision," and by
"interview-worthy" — individually or in combination — to focus on a specific slice (for example,
all medium Trees problems that still need revision).

**Why this priority**: Retrieval and filtering are the core of the success statement — "filter to
'needs revision' or 'weak topics.'" Once problems can be logged, the user must be able to find the
ones that matter for deciding what to practice next.

**Independent Test**: With several problems logged across different topics and difficulties, apply
each filter and each combination and confirm only matching problems are shown.

**Acceptance Scenarios**:

1. **Given** several logged problems, **When** the user opens the tracker, **Then** all problems are
   listed.
2. **Given** the problem list, **When** the user filters by a topic and a difficulty together,
   **Then** only problems matching both are shown.
3. **Given** the problem list, **When** the user enables the "needs revision" filter, **Then** only
   problems flagged as needing revision are shown.
4. **Given** an active filter combination with no matches, **When** the results render, **Then** a
   clear "no matching problems" message is shown rather than an empty page.

---

### User Story 3 - See counts and weakest topics (Priority: P2)

The user wants a quick read on their overall progress and where they are weak. The tracker surfaces
the total number of problems solved, a count per topic, and which topics are weakest — those with
the lowest average confidence or the highest count of problems still needing revision — so the user
can decide what to practice next.

**Why this priority**: The insights turn raw logs into a practice decision, which is the ultimate
success goal ("use that to decide what to practice next"). It depends on problems existing but adds
distinct value beyond plain filtering.

**Independent Test**: With a known set of problems across topics and confidence values, confirm the
total, per-topic counts, and weakest-topic ranking match the expected values.

**Acceptance Scenarios**:

1. **Given** logged problems, **When** the user opens the tracker, **Then** the total number of
   problems solved is displayed.
2. **Given** problems spread across topics, **When** the insights render, **Then** each topic shows
   its problem count.
3. **Given** problems with varying confidence and needs-revision flags, **When** the insights
   render, **Then** the weakest topics are surfaced using the lowest-average-confidence and
   highest-needs-revision measure.
4. **Given** no problems have been logged, **When** the tracker opens, **Then** the counts show zero
   and an empty state invites the user to log their first problem.

---

### User Story 4 - Edit a problem (Priority: P2)

The user realizes a logged problem was recorded incorrectly or wants to update it (for example, mark
it as no longer needing revision after a successful revisit). They open the problem, change any of
its fields, and save; the corrected values replace the old ones and no other problem is affected.

**Why this priority**: Practice records change over time (confidence rises, revision gets done).
Editing keeps the tracker trustworthy and the insights accurate.

**Independent Test**: Open a logged problem, change one or more fields, save, then re-open it and
confirm the updated values persisted and no other problem changed.

**Acceptance Scenarios**:

1. **Given** a logged problem, **When** the user edits its fields with valid values and saves,
   **Then** the problem is updated in place and the new values are shown.
2. **Given** the user edits a problem, **When** they submit an invalid value, **Then** the update is
   rejected with a clear message and the previously saved values remain unchanged.
3. **Given** the user edits one problem, **When** they save, **Then** no other problem is altered.

---

### User Story 5 - Delete a problem with confirmation (Priority: P3)

The user wants to remove a problem they logged by mistake or no longer wants to track. They choose to
delete it, are asked to confirm, and only upon explicit confirmation is the problem permanently
removed; cancelling leaves it intact.

**Why this priority**: Deletion is useful housekeeping but the least central capability; it must be
guarded so data is never lost accidentally.

**Independent Test**: Delete a problem, confirm the prompt appears, cancel once (problem remains),
then confirm (problem is removed and no longer listed); verify no other problem was affected.

**Acceptance Scenarios**:

1. **Given** a logged problem, **When** the user chooses to delete it, **Then** they are asked to
   confirm before anything is removed.
2. **Given** the delete confirmation, **When** the user cancels, **Then** the problem remains
   unchanged.
3. **Given** the delete confirmation, **When** the user confirms, **Then** the problem is permanently
   removed and no other problem is affected.

---

### Edge Cases

- **No problems yet**: The list shows an empty state and the insights show a total of zero with no
  topic counts.
- **Filter with no matches**: A clear "no matching problems" message is shown rather than a blank
  area; clearing filters restores the full list.
- **Topic grouping consistency**: Topics are grouped case-insensitively and trimmed (e.g., "Trees",
  "trees", and " Trees " count as the same topic) so counts and weakest-topic rankings are accurate.
- **Small-sample weakest topics**: A topic with very few problems can appear weak from a single
  low-confidence entry; the weakness measure still applies but this is an accepted limitation of a
  simple count-based view (no statistical smoothing in this slice).
- **Confidence and difficulty boundaries**: Confidence must be an integer 1–5; difficulty must be one
  of easy/medium/hard; values outside these are rejected.
- **Non-positive time taken**: A time taken of zero or negative is rejected as invalid.
- **Deleting the last problem in a filtered view**: After deletion the list and insights update to
  reflect the removal immediately.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow the authenticated user to add a DSA problem capturing all of its
  fields.
- **FR-002**: Each problem MUST capture: title, topic, optional subtopic, difficulty
  (easy/medium/hard), platform, time taken (positive whole minutes), attempt type (first attempt or
  revisit), solved-without-hints (yes/no), time complexity, space complexity, confidence rating
  (integer 1–5), needs-revision (yes/no), interview-worthy (yes/no), and the date the problem was
  solved ("solved on"; defaults to today, a past date may be chosen, future dates rejected). Each
  free-text field (title, topic, subtopic, platform, time complexity, space complexity) is limited
  to a reasonable maximum length.
- **FR-003**: System MUST allow the user to edit an existing problem, updating its values in place.
- **FR-004**: System MUST allow the user to delete a problem, requiring explicit confirmation before
  the problem is permanently removed.
- **FR-005**: System MUST present a list of all logged problems.
- **FR-006**: System MUST allow filtering the list by topic, by difficulty, by needs-revision, and by
  interview-worthy, applied individually or in any combination (results match all active filters).
  The topic filter MUST offer a selection of the topics that already exist among logged problems
  (normalized), matched exactly rather than by free-text.
- **FR-007**: System MUST surface the total number of problems logged.
- **FR-008**: System MUST surface a count of problems per topic, and a count of problems per
  difficulty (easy/medium/hard).
- **FR-009**: System MUST surface the weakest topics, ranked by lowest average confidence first,
  breaking ties by higher count of problems still needing revision, and breaking any remaining tie
  alphabetically by topic so the ordering is deterministic.
- **FR-010**: System MUST validate all input server-side before persisting, rejecting invalid values
  (e.g., confidence outside 1–5, unknown difficulty, non-positive time taken, missing required
  fields) with a clear message and persisting nothing on rejection.
- **FR-011**: System MUST restrict all DSA tracker operations (add, edit, delete, list, insights) to
  the single authenticated user, rejecting unauthenticated access.
- **FR-012**: System MUST record when each problem was created and last updated.
- **FR-013**: System MUST guarantee that adding, editing, or deleting a problem never removes,
  overwrites, or corrupts any other logged problem.
- **FR-014**: System MUST exclude spaced-repetition scheduling and external platform syncing from
  this feature.
- **FR-015**: System MUST display clear empty states for both the problem list (no problems, or no
  matches for the active filters) and the insights (zero total).
- **FR-016**: The insights (total, per-topic counts, weakest topics) MUST reflect all logged
  problems and MUST NOT be narrowed by the active list filters.
- **FR-017**: System MUST order the problem list in reverse-chronological order by solved date (most
  recent first) and MAY paginate it for efficiency; across pages every record matching the active
  filters MUST appear exactly once, with none omitted or duplicated.

### Key Entities *(include if feature involves data)*

- **DSA Problem**: Represents one practiced data-structures-and-algorithms problem, owned by the
  single authenticated user. Each document is one **practice record**: the same problem title may
  recur across records (e.g., a first attempt and later revisits as distinct rows), and counts are
  over records. Key attributes: title, topic, optional subtopic, difficulty
  (easy/medium/hard), platform, time taken (positive whole minutes), attempt type (first attempt or
  revisit), solved-without-hints (yes/no), time complexity, space complexity, confidence (integer
  1–5), needs-revision (yes/no), interview-worthy (yes/no), the date the problem was solved ("solved
  on"), and creation/last-updated timestamps. Records are listed in reverse-chronological order by
  solved date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can log a solved problem — from opening the add form to a confirmed save — in
  under one minute.
- **SC-002**: Any single filter or combination of filters returns exactly the problems matching all
  active filters, with no false inclusions or exclusions.
- **SC-003**: The total count and per-topic counts always equal the actual set of stored problems.
- **SC-004**: The weakest-topics view correctly ranks topics by the defined weakness measure (lowest
  average confidence first, ties broken by higher needs-revision count) for any given data set.
- **SC-005**: No problem is ever deleted without explicit user confirmation; cancelling a deletion
  always leaves the problem intact.
- **SC-006**: An edit to one problem is reflected accurately on the next view of that problem 100% of
  the time and changes no other problem.

## Assumptions

- **Single user**: The application has exactly one authenticated owner; all problems belong to that
  account, consistent with the existing foundation.
- **Practice records**: Each entry is a separate practice record; the same problem may be logged
  more than once (first attempt and revisits as distinct rows). "Total problems solved" and
  per-topic counts count practice records, not deduplicated distinct problems.
- **Time taken units**: "Time taken" is recorded in whole minutes and must be greater than zero.
- **Solved-on date & list order**: Each record carries a "solved on" calendar date that defaults to
  today, may be set to a past date (honest backfill), and rejects future dates; the problem list is
  ordered reverse-chronologically by this date. The insights include per-difficulty counts alongside
  the total and per-topic counts.
- **Required vs. optional fields**: Subtopic is optional. Title, topic, difficulty, platform, time
  taken, attempt type, solved-without-hints, time complexity, space complexity, confidence,
  needs-revision, and interview-worthy are required for a complete entry.
- **Complexity fields**: Time complexity and space complexity are captured as short free text (e.g.,
  "O(n log n)", "O(1)"); no fixed enumeration is imposed in this slice.
- **Platform field**: Platform is captured as free text (e.g., "LeetCode", "Codeforces").
- **Weakest-topics measure**: Topics are ranked as weakest by lowest average confidence first, with
  ties broken by higher needs-revision count; a small number of weakest topics (for example, up to
  three to five) are surfaced. The exact number surfaced is a presentation detail that does not
  change the capture/retrieval scope.
- **Topic normalization**: Topics are grouped case-insensitively and trimmed so counts and rankings
  are consistent regardless of capitalization or surrounding whitespace. When adding a problem the
  topic is entered as free text (new topics are allowed); the topic *filter* offers the existing
  normalized topics to choose from and matches them exactly. Where the same topic has been entered
  with different casing, the casing from the most recently saved record is used as the display label
  for counts and insights.
- **Insights scope**: The total, per-topic counts, and weakest-topics insights are always computed
  over all logged problems (global) and are not narrowed by the active list filters; filtering only
  affects which problems are shown in the list.
- **Deletion is permanent**: Deleting a problem removes it permanently (hard delete) after explicit
  confirmation; there is no undo/trash in this slice.
- **Reuse of existing platform**: Authentication, navigation shell, and data persistence established
  by the foundation slice are reused; this feature adds the DSA tracker on top of them.
- **Out of scope**: Spaced-repetition scheduling and syncing with external coding platforms are
  explicitly excluded.
