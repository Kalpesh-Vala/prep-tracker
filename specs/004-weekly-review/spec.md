# Feature Specification: Weekly Review (Structured Weekly Retrospective)

**Feature Branch**: `feat/03-weekly-review`

**Created**: 2026-07-02

**Status**: Draft

**Input**: User description: "Add a Weekly Review feature to the preparation tracker. At the end of each week the single authenticated user records a structured retrospective. Each weekly review captures: the week (identified by week number out of 26 and/or date range), planned work versus what was actually completed, total study hours for the week, DSA accuracy or success rate for the week, the weak topics identified that week, the wins for the week, and the adjustments planned for the next week. The user can: create a review for a week, edit it, view a single week's review, and browse all past weekly reviews in order. Each week may have at most one review. Where useful, the review may pre-fill suggested totals (such as the week's study hours and problems solved) derived from that week's daily logs and DSA entries, which the user can confirm or override. Out of scope: automated coaching or recommendations. Success: every Sunday the user can reflect in a consistent structure, see the trend of weak topics and wins across weeks, and adjust the next week's plan."

## Clarifications

### Session 2026-07-02

- Q: How is a week identified and mapped to a calendar date range (for pre-fill)? → A: The user picks a week number (1–26); the app derives that week's 7-day date range from a fixed prep start date, and pre-fill uses the derived range.
- Q: Is "problems solved" a stored field on the review? → A: Yes — the confirmed problems-solved count is stored on the review (pre-filled from DSA entries, editable), alongside study hours and the DSA success rate.
- Q: How is planned-vs-completed captured? → A: Two free-text fields — "planned" and "actually completed" — not a structured checklist.
- Q: How is the DSA success rate determined? → A: User-entered percentage (0–100), self-assessed; it is not auto-derived. Only study hours and problems solved are pre-filled. The success rate is optional (validated to 0–100 when provided).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Record a weekly review (Priority: P1)

At the end of a week the authenticated user opens the Weekly Review area, selects the week, and
fills in a consistent structure: what they planned versus what they actually completed, the total
study hours for the week, their DSA accuracy/success rate, the weak topics they noticed, the wins
they had, and the adjustments they plan for next week. They save, and the week's retrospective is
recorded.

**Why this priority**: Capturing a structured retrospective is the reason the feature exists.
Without reliable creation of a weekly review, there is nothing to browse, compare, or learn from.
This is the minimum viable, demonstrable slice.

**Independent Test**: Sign in, open the create form for a week, complete the fields with valid
values, save, and confirm the review is persisted and retrievable.

**Acceptance Scenarios**:

1. **Given** an authenticated user with no review for a chosen week, **When** they complete the
   review form with valid values and save, **Then** the review is persisted for that week and shown
   back to the user.
2. **Given** the review form, **When** the user submits an invalid value (e.g., a week number
   outside the allowed range or a negative study-hours total), **Then** the review is rejected with
   a clear message and nothing is persisted.

---

### User Story 2 - Browse and view reviews, and see the trend (Priority: P1)

The user wants to look back over their weekly retrospectives. They open the Weekly Review area and
see all past reviews in order, each surfacing at a glance the week and its weak topics and wins, so
the trend across weeks is visible. Selecting a week opens its full review.

**Why this priority**: Retrieval and the across-week view are half of the success statement — "see
the trend of weak topics and wins across weeks." Once reviews can be created, the user needs to
find them and read the trend to adjust future plans.

**Independent Test**: With several reviews saved for different weeks, open the list and confirm each
appears once, in order, showing its weak topics and wins; open one and confirm the full detail.

**Acceptance Scenarios**:

1. **Given** multiple saved reviews, **When** the user opens the list, **Then** all reviews are
   shown in a consistent order, each exactly once, each showing at least its week, weak topics, and
   wins.
2. **Given** no reviews exist yet, **When** the user opens the list, **Then** an empty state invites
   them to record their first weekly review.
3. **Given** the list, **When** the user selects a week, **Then** the full review for that week is
   displayed.

---

### User Story 3 - Pre-filled suggested totals from the week's data (Priority: P2)

When creating a review for a week, the form offers suggested totals — the week's study hours and
the number of DSA problems solved — derived from that week's daily logs and DSA entries. The user
can accept the suggestions or override them; whatever they confirm is what gets saved.

**Why this priority**: Pre-filling reduces friction and improves accuracy, directly supporting the
"reflect every Sunday" goal. It depends on the create flow but adds distinct value; the review must
still work if a user overrides every suggestion.

**Independent Test**: With known daily logs and DSA entries in a week, open that week's create form
and confirm the suggested study hours and problems-solved match the derived totals; override one and
confirm the saved review keeps the overridden value.

**Acceptance Scenarios**:

1. **Given** daily logs and DSA entries exist for a week, **When** the user opens that week's create
   form, **Then** the study-hours and problems-solved fields are pre-filled with totals derived from
   that week's data.
2. **Given** a pre-filled suggestion, **When** the user overrides it and saves, **Then** the saved
   review keeps the overridden value, not the suggestion.
3. **Given** a week with no daily logs or DSA entries, **When** the user opens its create form,
   **Then** the suggested totals are zero (or empty) and the user can still complete the review.

---

### User Story 4 - Edit a weekly review (Priority: P2)

The user realizes a review was incomplete or wants to refine it. They open the week's review, change
any of its fields, and save; the corrected values replace the old ones and no other week's review is
affected.

**Why this priority**: Retrospectives get refined as the user reflects. Editing keeps the record
trustworthy and the trend accurate.

**Independent Test**: Open a saved review, change one or more fields, save, re-open the same week,
and confirm the update persisted and no other review changed.

**Acceptance Scenarios**:

1. **Given** a saved review, **When** the user edits its fields with valid values and saves, **Then**
   the review is updated in place and the new values are shown.
2. **Given** the user edits a review, **When** they submit an invalid value, **Then** the update is
   rejected with a clear message and the previously saved values remain unchanged.
3. **Given** the user edits one week's review, **When** they save, **Then** no other week's review is
   altered.

---

### User Story 5 - Enforce one review per week (Priority: P2)

The user attempts to create a review for a week that already has one. Instead of creating a second,
conflicting review (or silently overwriting the existing one), the system recognizes the week is
already reviewed and routes the user to edit the existing review.

**Why this priority**: The "at most one review per week" rule protects the integrity of the weekly
record; duplicating or overwriting a week's retrospective would corrupt the trend.

**Independent Test**: Create a review for a week, then attempt to create another for the same week;
confirm a duplicate is prevented and the original review's data is intact.

**Acceptance Scenarios**:

1. **Given** a review already exists for a week, **When** the user attempts to create another for
   that same week, **Then** the system prevents the duplicate and directs the user to edit the
   existing review.
2. **Given** any create or edit operation, **When** it completes, **Then** every previously reviewed
   week still has exactly one review and none has been silently removed or overwritten.

---

### Edge Cases

- **No reviews yet**: The list shows an empty state inviting the first review.
- **Duplicate week**: Attempting to review an already-reviewed week routes the user to edit rather
  than creating a second review or overwriting the first.
- **Pre-fill with no source data**: When a week has no daily logs or DSA entries, suggested totals
  are zero/empty and the review can still be completed.
- **Pre-fill is a snapshot**: Once saved, a review's confirmed totals do not silently change if the
  underlying daily logs or DSA entries are later edited; the review preserves what the user
  confirmed.
- **Week-range boundaries**: A week number must be within the allowed prep range (1–26); values
  outside are rejected.
- **Invalid rates/totals**: A negative study-hours total, or a DSA success rate outside 0–100%, is
  rejected as invalid input.
- **Empty weak topics**: A week with no weak topics identified is allowed (the field may be empty)
  without blocking the review.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow the authenticated user to create a weekly review for a selected
  week.
- **FR-002**: Each weekly review MUST capture: the week identifier (a week number in the range 1–26;
  its 7-day calendar date range — Monday to Sunday, in UTC — is derived from a fixed, configured prep
  start date), planned work, actually-completed work, total study hours for the week, the number of
  DSA problems solved that week, an optional DSA accuracy/success rate for the week, weak topics
  identified, wins for the week, and adjustments planned for the next week. Each free-text field is
  limited to a reasonable maximum length, and each weak-topic entry is a short text label.
- **FR-003**: System MUST enforce that each week has at most one review.
- **FR-004**: System MUST prevent creation of a second review for a week that already has one and
  MUST direct the user to edit the existing review instead of duplicating or overwriting it.
- **FR-005**: System MUST allow the user to edit an existing week's review, updating its values in
  place.
- **FR-006**: System MUST allow the user to view a single week's review showing all captured fields.
- **FR-007**: System MUST present a browsable list of all past reviews in a consistent order, each
  appearing exactly once.
- **FR-008**: When creating a review for a week, the System MUST offer suggested totals — the week's
  study hours and problems solved — derived from the daily logs and DSA entries that fall within that
  week's derived date range, which the user can confirm or override before saving.
- **FR-009**: System MUST validate all input server-side before persisting, rejecting invalid values
  (e.g., week number out of range, negative study hours, success rate outside 0–100%, missing
  required fields) with a clear message and persisting nothing on rejection.
- **FR-010**: System MUST restrict all Weekly Review operations (create, edit, view, list) to the
  single authenticated user, rejecting unauthenticated access.
- **FR-011**: System MUST record when each review was created and last updated.
- **FR-012**: System MUST guarantee that creating or editing a review never removes, overwrites, or
  corrupts any other week's review.
- **FR-013**: System MUST exclude automated coaching and recommendations from this feature.
- **FR-014**: System MUST display a clear empty state when no reviews exist yet.
- **FR-015**: The browse view MUST surface each week's weak topics and wins so the trend across weeks
  is visible without opening each review individually.
- **FR-016**: A review's confirmed totals MUST be stored as a snapshot; later changes to the
  underlying daily logs or DSA entries MUST NOT silently alter an already-saved review.
- **FR-017**: System MUST order the browse list by week with the most recent week first, and MAY
  paginate it for efficiency; across pages every review MUST appear exactly once, with none omitted
  or duplicated.

### Key Entities *(include if feature involves data)*

- **Weekly Review**: Represents one week's structured retrospective, owned by the single
  authenticated user. Key attributes: week identifier (week number within the prep range and its
  date range; unique per review), planned work, completed work, total study hours, number of DSA
  problems solved, DSA accuracy/success rate, weak topics, wins, adjustments for next week, and
  creation/last-updated timestamps. At most one Weekly Review exists per week.
- **Derived suggestions** (not stored separately): study hours and problems solved computed from the
  week's Daily Log entries and DSA entries, offered as pre-fill only; the confirmed values are
  stored on the Weekly Review as a snapshot.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can complete and save a structured weekly review in a single focused sitting
  (a few minutes), following the same field structure every week.
- **SC-002**: It is impossible to create two reviews for the same week; a repeat attempt always
  routes the user to editing the existing review.
- **SC-003**: 100% of saved reviews appear in the browse list, each exactly once, in a consistent
  order.
- **SC-004**: Pre-filled suggested totals equal the totals derived from that week's daily logs and
  DSA entries, and any override the user confirms is what gets saved.
- **SC-005**: An edit to one week's review is reflected accurately on the next view of that week and
  changes no other review.
- **SC-006**: The user can see each week's weak topics and wins across weeks from the browse view
  without opening every review.

## Assumptions

- **Single user**: The application has exactly one authenticated owner; all reviews belong to that
  account, consistent with the existing foundation.
- **Week model**: The preparation spans 26 weeks. A week is identified by an integer week number in
  the range 1–26; its 7-day calendar date range is derived deterministically from a fixed prep start
  date (a one-time configuration), so week number is the canonical identity and uniqueness key. The
  user selects the week number when creating a review; the app derives the date range for pre-fill.
  The cadence aligns with the user's Sunday-end review habit.
- **Field types**: Planned work, completed work, wins, and adjustments are captured as free text.
  Weak topics are captured as a list of short text entries (which may be empty). Total study hours is
  a non-negative number; problems solved is a non-negative whole number; DSA accuracy/success rate is
  a user-entered (self-assessed) percentage from 0 to 100 and is not auto-derived — only study hours
  and problems solved are pre-filled from source data.
- **Pre-fill derivation**: Suggested study hours = the sum of that week's Daily Log study hours;
  suggested problems solved = the count of DSA entries solved within that week's date range.
  Suggestions are optional and fully editable; the confirmed values are stored on the review as a
  snapshot and are not live-linked to the source data afterward.
- **Required vs. optional fields**: The week identifier, planned, completed, study hours, problems
  solved, wins, and adjustments are required for a complete review; the DSA success rate and weak
  topics are optional (the success rate is validated to 0–100 when provided; weak topics may be
  empty). Study hours and problems solved may be zero.
- **Ordering**: The browse list is ordered by week (most recent week first) for a consistent,
  predictable trend view.
- **Reuse of existing platform**: Authentication, navigation shell, data persistence, and the
  existing Daily Log and DSA data are reused; this feature adds the Weekly Review on top of them.
- **Out of scope**: Automated coaching, recommendations, and any generated advice are explicitly
  excluded; the feature only captures and retrieves the user's own retrospective.
