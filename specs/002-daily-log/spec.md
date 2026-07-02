# Feature Specification: Daily Log (Accurate Daily Preparation Capture)

**Feature Branch**: `feat/01-daily-log`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: "Add a Daily Log feature to the preparation tracker. The single authenticated user records one log entry per day to capture that day's preparation. Each daily log entry captures: the date, total study hours for the day, a free-text summary of what was learned, the number of DSA problems solved that day, whether revision was completed that day, the biggest challenge faced, the goal for the next day, and an optional energy level. The user can: create today's entry, edit an existing day's entry, view a single day's entry, and browse a reverse-chronological list of all past entries. Each calendar date may have at most one entry. Past entries must never be silently lost when new entries are added. Out of scope: aggregation, charts, or streaks (those belong to the Dashboard). This slice is only accurate capture and retrieval of daily entries. Success: the user can log a day in under a minute, see it appear in the history list, edit it later, and trust that no previously logged day disappears."

## Clarifications

### Session 2026-06-30

- Q: Can the user create an entry for a date other than today (backfill a missed day)? → A: Yes — the create form defaults to today, but the user may select a past date to backfill a missed day. Future dates are rejected.
- Q: What precision should total study hours use? → A: Decimal hours allowed (e.g., 2.5), range 0–24, limited to one decimal place.
- Q: What form should the optional energy level take? → A: A small enum — low / medium / high.
- Q: Which free-text fields are required for a complete entry? → A: All three (learning summary, biggest challenge, goal for next day) are required; only energy level is optional.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log today's preparation (Priority: P1)

The authenticated user finishes a day of preparation and wants to record it. They open the
Daily Log, the form defaults to today's date, and they fill in how many hours they studied,
a short summary of what they learned, how many DSA problems they solved, whether they
completed revision, the biggest challenge they faced, and the goal for tomorrow. They
optionally note their energy level. They save, and the day is captured.

**Why this priority**: Capturing a day's preparation is the core reason this feature exists.
Without reliable creation of a daily entry, none of the other capabilities (viewing, editing,
browsing) have anything to operate on. This is the minimum viable, demonstrable slice.

**Independent Test**: Sign in, open the Daily Log create form, fill in the required fields for
today, save, and confirm the entry is persisted and retrievable. Delivers immediate value: the
user has captured one real day of preparation.

**Acceptance Scenarios**:

1. **Given** an authenticated user with no entry for today, **When** they open the Daily Log
   create form, **Then** the date defaults to today (and may be changed to a past date) and the
   form is empty and ready for input.
2. **Given** a completed create form with valid values, **When** the user saves, **Then** the
   entry is persisted for that calendar date and the user is shown the saved entry (or the
   history list with the new entry present).
3. **Given** the user is creating today's entry, **When** they leave the optional energy level
   blank but complete the other fields, **Then** the entry saves successfully without an energy
   level.
4. **Given** the user submits the form with an invalid value (e.g., negative hours or negative
   DSA count), **When** they save, **Then** the entry is rejected with a clear validation
   message and nothing is persisted.

---

### User Story 2 - Browse past entries in reverse-chronological order (Priority: P2)

The user wants to look back over their preparation. They open the Daily Log history and see a
list of all previously logged days, newest first, each showing enough at-a-glance information
(date, study hours, DSA problems solved, and revision status) to locate the day they care about.

**Why this priority**: Retrieval is the second half of "accurate capture and retrieval." Once
days can be captured, the user needs to confirm they appear and find them again. This validates
the data-integrity promise that nothing is silently lost.

**Independent Test**: With several entries on different dates already saved, open the history
list and confirm every saved day appears exactly once, ordered newest-to-oldest.

**Acceptance Scenarios**:

1. **Given** multiple saved entries on different dates, **When** the user opens the history
   list, **Then** all entries are shown in reverse-chronological order (most recent date first).
2. **Given** no entries have ever been saved, **When** the user opens the history list, **Then**
   an empty-state message is shown inviting them to log their first day.
3. **Given** the history list is displayed, **When** the user selects an entry, **Then** they are
   taken to the full view of that single day's entry.

---

### User Story 3 - View a single day's entry (Priority: P2)

The user selects a specific day from the history and sees the complete captured detail for that
day: date, study hours, learning summary, DSA problems solved, revision status, biggest
challenge, goal for the next day, and energy level if one was recorded.

**Why this priority**: Viewing the full detail of a day is required for the user to verify what
they recorded and to decide whether to edit it. It is a thin but necessary read capability that
supports both browsing and editing.

**Independent Test**: With a saved entry, open its single-day view and confirm every captured
field is displayed accurately, with the optional energy level shown only when present.

**Acceptance Scenarios**:

1. **Given** a saved entry for a date, **When** the user opens that day's view, **Then** all
   captured fields are displayed accurately for that date.
2. **Given** a saved entry with no energy level recorded, **When** the user views it, **Then**
   the energy level is omitted or shown as not recorded rather than as a misleading value.
3. **Given** the user is viewing a day's entry, **When** they choose to edit, **Then** they are
   taken to the edit form pre-filled with that day's current values.

---

### User Story 4 - Edit an existing day's entry (Priority: P2)

The user realizes an earlier entry was incomplete or inaccurate. They open that day's entry,
edit any of its fields, and save. The corrected values replace the old ones for that same
calendar date, and no other day's entry is affected.

**Why this priority**: Preparation logging is imperfect in the moment; the ability to correct a
past day is essential for the log to stay trustworthy. It directly supports the success
criterion "edit it later."

**Independent Test**: Open a saved entry, change one or more fields, save, then re-open the same
date and confirm the updated values persisted and the date itself is unchanged.

**Acceptance Scenarios**:

1. **Given** a saved entry, **When** the user edits its fields and saves valid values, **Then**
   the entry for that date is updated in place and the updated values are shown.
2. **Given** the user edits an entry, **When** they submit an invalid value, **Then** the update
   is rejected with a clear message and the previously saved values remain unchanged.
3. **Given** the user edits one day's entry, **When** they save, **Then** no other day's entry
   is altered in any way.

---

### User Story 5 - Enforce one entry per calendar date (Priority: P1)

The user attempts to log a day that already has an entry. Instead of creating a second,
conflicting record for the same date (or silently overwriting the existing one), the system
recognizes that the date is already taken and routes the user to edit the existing entry.

**Why this priority**: The "at most one entry per calendar date" rule and the promise that "past
entries must never be silently lost" are the data-integrity heart of this feature. Getting this
wrong would either duplicate days or destroy logged work — both unacceptable.

**Independent Test**: Create an entry for a date, then attempt to create another entry for the
same date; confirm the system prevents a duplicate and the original entry's data is intact.

**Acceptance Scenarios**:

1. **Given** an entry already exists for a date, **When** the user attempts to create a new entry
   for that same date, **Then** the system prevents creating a duplicate and directs the user to
   edit the existing entry instead.
2. **Given** an entry already exists for today, **When** the user opens the Daily Log, **Then**
   they are guided to edit today's existing entry rather than presented with an empty create
   form that could overwrite it.
3. **Given** any create or edit operation, **When** it completes, **Then** every previously
   logged date still has exactly one entry and none has been silently removed or replaced by an
   unrelated record.

---

### Edge Cases

- **Same date, different time zone interpretation**: A "calendar date" is interpreted in a single
  consistent reference (the user's local date). The uniqueness rule applies to that calendar date
  value, not to a timestamp, so logging at 11:59 PM and 12:01 AM correctly maps to two different
  days.
- **Future dates**: Attempting to log a date in the future is rejected, since a future day cannot
  yet have been prepared for.
- **Missed past days**: A day that was never logged can be backfilled by selecting its date on the
  create form; the one-entry-per-date rule still applies, so backfilling a date that already has an
  entry routes the user to edit the existing entry instead.
- **Empty required free-text fields**: Submitting with required text fields blank (summary,
  biggest challenge, goal for next day) is rejected with a clear message; see Assumptions for which
  fields are required.
- **Zero values**: Zero study hours or zero DSA problems solved are valid, recordable values (a day
  with no DSA practice is still a loggable day).
- **Boundary values**: Study hours accept decimal values (e.g., 2.5) within 0–24; values above 24
  or below 0 are rejected as invalid input.
- **Concurrent duplicate creation**: If two create attempts for the same date occur close together,
  at most one entry is persisted for that date and the second is rejected rather than overwriting.
- **Navigating away mid-entry**: Unsaved input that is abandoned does not create a partial entry;
  only an explicit save persists data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow the authenticated user to create a daily log entry for a calendar
  date, defaulting the date to today on the create form and allowing selection of a past date to
  backfill a missed day; creation MUST reject any future date.
- **FR-002**: Each daily log entry MUST capture: the calendar date, total study hours for the day
  (a decimal value from 0 to 24 with at most one decimal place, e.g., 2.5), a free-text summary of
  what was learned, the number of DSA problems solved that day, whether revision was completed that
  day, the biggest challenge faced, the goal for the next day, and an optional energy level. Each
  free-text field (summary, biggest challenge, goal for the next day) is limited to a reasonable
  maximum length of 2000 characters.
- **FR-003**: System MUST enforce that each calendar date has at most one entry.
- **FR-004**: System MUST prevent creation of a second entry for a date that already has one, and
  MUST direct the user to edit the existing entry instead of creating a duplicate or overwriting it.
- **FR-005**: System MUST allow the user to edit an existing day's entry, updating its values in
  place for the same calendar date without changing the date.
- **FR-006**: System MUST allow the user to view a single day's entry showing all captured fields,
  displaying the energy level only when it was recorded.
- **FR-007**: System MUST present a browsable list of all past entries in reverse-chronological
  order (most recent date first), with each row showing at least the date, study hours, DSA problems
  solved, and revision status.
- **FR-008**: System MUST display a clear empty state when no entries exist yet.
- **FR-009**: System MUST validate all input server-side before persisting, rejecting invalid
  values (e.g., negative hours, negative DSA counts, study hours exceeding a single day, or a
  future date) with a clear message and persisting nothing on rejection.
- **FR-010**: System MUST treat the energy level as an optional value chosen from a small enum —
  low, medium, or high — allowing entries to be saved and displayed without it and rejecting any
  value outside that set.
- **FR-011**: System MUST guarantee that creating or editing an entry never silently removes,
  overwrites, or corrupts any other previously logged date's entry.
- **FR-012**: System MUST restrict all Daily Log create, read, edit, and list operations to the
  single authenticated user, rejecting unauthenticated access.
- **FR-013**: System MUST record when each entry was created and last updated so edits are
  distinguishable from original capture, and MUST surface the last-updated time on the single-entry
  view.
- **FR-014**: System MUST exclude aggregation, charts, streaks, and cross-day computation from this
  feature; it provides only capture and retrieval of individual daily entries.
- **FR-015**: The history list MAY be loaded incrementally (paginated) for efficiency, provided the
  pages together represent every logged entry exactly once — no day omitted or duplicated — while
  preserving reverse-chronological order.
- **FR-016**: The Daily Log UI MUST present a clear loading state while the history list or a single
  entry is being retrieved, and a clear error state (without losing entered data) if retrieval or
  saving fails.

### Key Entities *(include if feature involves data)*

- **Daily Log Entry**: Represents one calendar day of recorded preparation, owned by the single
  authenticated user. Key attributes: calendar date (unique per entry), total study hours (decimal,
  0–24), learning summary (free text), DSA problems solved (count), revision completed (yes/no),
  biggest challenge (free text), goal for next day (free text), energy level (optional; one of low,
  medium, high), and creation/last-updated timestamps. At most one Daily Log Entry exists per
  calendar date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can capture a complete daily log entry — from opening the create form to a
  confirmed save — in under one minute.
- **SC-002**: 100% of saved entries appear in the reverse-chronological history list, each exactly
  once, immediately after saving.
- **SC-003**: No previously logged date is ever lost: across any sequence of create and edit
  operations, every date that was logged still has exactly one entry afterward.
- **SC-004**: It is impossible to create two entries for the same calendar date; a repeat attempt
  always routes the user to editing the existing entry.
- **SC-005**: An edit to one day's entry changes only that day and is reflected accurately on the
  next view of that date 100% of the time.
- **SC-006**: Invalid submissions are rejected with a clear message and never persist partial or
  malformed data.

## Assumptions

- **Single user**: The application has exactly one authenticated owner; "the user" and "their data"
  refer to that single account, consistent with the existing foundation.
- **Required vs. optional fields**: Energy level is the only optional field. The date, total study
  hours, learning summary, DSA problems solved, revision-completed flag, biggest challenge, and goal
  for the next day are all required for a complete entry. Study hours and DSA count may be zero.
- **Calendar date semantics**: A "day" is identified by a calendar date in the user's local
  reference, not by a precise timestamp; uniqueness is enforced on that date value.
- **Backfilling allowed**: New entries default to today but may target any past calendar date so a
  missed day can be backfilled; future dates are rejected. The one-entry-per-date rule applies
  regardless of which date is chosen.
- **Energy level form**: The optional energy level is captured as a small enum — low, medium, or
  high. When omitted, the entry is still complete and valid.
- **No deletion in this slice**: Removing an entry is not part of this feature's described scope;
  the slice covers create, view, edit, and browse only. (Any future delete capability would follow
  the project's confirmation-and-integrity rules.)
- **Reuse of existing platform**: Authentication, navigation shell, and data persistence
  established by the foundation slice are reused; this feature adds the Daily Log capability on top
  of them.
- **Out of scope**: Aggregation, charts, streaks, and any cross-day statistics belong to the
  Dashboard and are explicitly excluded here.
