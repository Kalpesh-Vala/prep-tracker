# Feature Specification: Dashboard (At-a-Glance Six-Month Progress)

**Feature Branch**: `feat/04-dashboard`

**Created**: 2026-07-02

**Status**: Draft

**Input**: User description: "Add a Dashboard as the home screen of the preparation tracker, giving the single authenticated user an at-a-glance view of their six-month progress. The dashboard displays: overall completion percentage of the preparation program, the current week number out of 26, total study hours logged so far versus a target of approximately 936 hours (with a visual progress indicator), the current consecutive-day study streak, this week's goals, and quick navigation links into the Daily Log, DSA Tracker, and Weekly Review. The dashboard derives all of its numbers from existing data: study hours and streak come from daily logs; DSA counts come from the DSA tracker; weekly context comes from weekly reviews. The streak counts consecutive days that have a daily log with study hours greater than zero, ending today or yesterday. All displayed metrics must update automatically as underlying data changes. Out of scope: configurable widgets or custom date ranges for v1. Success: when the user opens the app, within a couple of seconds they can see how far along they are, their current streak, hours toward the 936-hour goal, and what to do next."

## Clarifications

### Session 2026-07-02

- Q: What does the "overall completion percentage" measure? → A: Elapsed program time — the current week number divided by 26 (capped at 100%), distinct from the separate hours-vs-936 indicator.
- Q: What does "update automatically as underlying data changes" require? → A: Recompute fresh on each dashboard load/navigation (no caching); no live/realtime push.
- Q: Where do "this week's goals" come from? → A: The current week's Weekly Review planned work; when no review exists for the current week, an empty/prompt state is shown (no fallback to another week).
- Q: Which DSA figure(s) should the dashboard show? → A: Both — the all-time total problems solved and the number solved during the current week.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See overall progress at a glance (Priority: P1)

The authenticated user opens the app and lands on the Dashboard. Within a couple of seconds they
see how far along they are in the six-month program: an overall completion percentage, the current
week number out of 26, and total study hours logged so far against the ~936-hour target with a
visual progress indicator.

**Why this priority**: The at-a-glance progress view is the entire reason the dashboard exists and
is the app's home screen. It orients the user the moment they open the app. This is the minimum
viable, demonstrable slice.

**Independent Test**: Sign in, land on the Dashboard, and confirm the completion percentage, current
week number, and study-hours-vs-target (with progress indicator) are shown and computed from
existing data.

**Acceptance Scenarios**:

1. **Given** an authenticated user with existing daily logs, **When** they open the Dashboard,
   **Then** the overall completion percentage, current week number (out of 26), and total study
   hours versus the ~936-hour target (with a visual progress indicator) are displayed.
2. **Given** total study hours below the target, **When** the Dashboard renders, **Then** the
   progress indicator reflects the proportion of hours toward 936.
3. **Given** total study hours at or above the target, **When** the Dashboard renders, **Then** the
   progress indicator shows complete (capped at 100%) rather than overflowing.

---

### User Story 2 - See the current study streak (Priority: P1)

The user wants to know their momentum. The Dashboard shows the current consecutive-day study streak —
the number of consecutive days, ending today or yesterday, on which a daily log with study hours
greater than zero exists.

**Why this priority**: The streak is a core motivational metric explicitly called out in the success
statement ("their current streak"). It is a distinct, precisely-defined calculation worth building
and testing on its own.

**Independent Test**: With daily logs across several days (some with zero hours, some with positive
hours), confirm the streak equals the count of consecutive positive-hours days ending today or
yesterday.

**Acceptance Scenarios**:

1. **Given** daily logs with positive study hours on today and the preceding consecutive days, **When**
   the Dashboard renders, **Then** the streak equals the number of those consecutive days.
2. **Given** no log for today but a positive-hours log for yesterday and preceding consecutive days,
   **When** the Dashboard renders, **Then** the streak still counts (it ends yesterday).
3. **Given** the most recent positive-hours day is older than yesterday, **When** the Dashboard
   renders, **Then** the streak is zero.
4. **Given** a day with a daily log but zero study hours, **When** the streak is computed, **Then**
   that day does not count and breaks the streak.

---

### User Story 3 - See this week's goals and jump to the trackers (Priority: P2)

The user wants to know what to do next. The Dashboard surfaces this week's goals (from the weekly
review context) and provides quick navigation links into the Daily Log, DSA Tracker, and Weekly
Review so the user can act immediately.

**Why this priority**: "What to do next" is part of the success statement. It turns the dashboard
from a passive readout into a launchpad. It depends on the overview existing but adds distinct value.

**Independent Test**: With a weekly review for the current week, confirm this week's goals appear;
click each quick link and confirm it navigates to the correct tracker page.

**Acceptance Scenarios**:

1. **Given** a weekly review exists for the current week, **When** the Dashboard renders, **Then**
   this week's goals are displayed from that review.
2. **Given** no weekly review exists for the current week, **When** the Dashboard renders, **Then** a
   sensible empty state invites the user to set this week's goals (no fabricated goals).
3. **Given** the Dashboard, **When** the user selects a quick navigation link, **Then** they are taken
   to the corresponding Daily Log, DSA Tracker, or Weekly Review page.

---

### User Story 4 - Metrics reflect current data (Priority: P2)

The user trusts that the dashboard is current. Every time the Dashboard is opened, all displayed
metrics are computed from the latest underlying data, so changes made in the Daily Log, DSA Tracker,
or Weekly Review are reflected without any manual refresh action beyond reopening the dashboard.

**Why this priority**: The success statement requires the dashboard to reflect reality ("update
automatically as underlying data changes"). Stale numbers would undermine trust in every other
metric.

**Independent Test**: Note the dashboard values, add a daily log / DSA entry / weekly review, reopen
the dashboard, and confirm the affected metrics changed accordingly.

**Acceptance Scenarios**:

1. **Given** a displayed set of metrics, **When** the user adds or edits underlying data and reopens
   the Dashboard, **Then** the affected metrics reflect the change.
2. **Given** the Dashboard, **When** it loads, **Then** all metrics are derived fresh from current
   data (no stale or cached values are shown).

---

### Edge Cases

- **No data at all**: With no daily logs, DSA entries, or weekly reviews, the Dashboard shows 0%
  completion (or the time-based baseline), 0 total hours, a 0 streak, and an empty "this week's goals"
  state — without errors.
- **Streak boundary (today vs. yesterday)**: A streak ending today or yesterday counts; if the most
  recent positive-hours day is two or more days before today, the streak is 0.
- **Zero-hours day**: A daily log with zero study hours does not extend the streak and breaks it.
- **Hours above target**: When total study hours meet or exceed ~936, the progress indicator caps at
  100% rather than overflowing.
- **Program boundaries**: Before the program start the current week is 1; after week 26 the week is
  capped at 26 and time-based completion shows 100%.
- **Missing current-week review**: When no weekly review exists for the current week, "this week's
  goals" shows an empty/prompt state rather than pulling an unrelated week's goals.
- **Day convention**: "Today" and "yesterday" for the streak use the same UTC calendar-day convention
  as daily-log dates so the boundary is consistent.
- **Future-dated entries**: A daily log dated in the future does not extend the streak beyond today;
  the streak is evaluated from today (or yesterday) backward.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Dashboard MUST display the overall completion percentage of the preparation
  program, defined as elapsed program time — the current week number divided by 26, capped at 100%.
- **FR-002**: The Dashboard MUST display the current week number out of 26.
- **FR-003**: The Dashboard MUST display total study hours logged so far versus the target of 936
  hours, with a visual progress indicator. Displayed percentages (completion and hours progress) are
  rounded to whole numbers, and the hours progress indicator is capped at 100% while the raw total is
  preserved.
- **FR-004**: The Dashboard MUST display the current consecutive-day study streak.
- **FR-005**: The Dashboard MUST display this week's goals, taken from the current week's Weekly
  Review planned work; when no review exists for the current week, an empty/prompt state MUST be
  shown rather than goals from another week.
- **FR-006**: The Dashboard MUST provide quick navigation links into the Daily Log, DSA Tracker, and
  Weekly Review.
- **FR-007**: The Dashboard MUST derive all displayed numbers from existing data (daily logs, DSA
  entries, weekly reviews) and MUST NOT require or accept any data entry of its own.
- **FR-008**: The streak MUST count the number of consecutive days, ending today or yesterday, each
  having a daily log with study hours greater than zero; if neither today nor yesterday qualifies, the
  streak MUST be zero. Days are identified using the UTC calendar-day convention used for daily-log
  dates.
- **FR-009**: All displayed metrics MUST be computed from the current underlying data each time the
  Dashboard is opened, with no stale or cached values.
- **FR-010**: The Dashboard MUST restrict access to the single authenticated user, rejecting
  unauthenticated access.
- **FR-011**: The Dashboard MUST serve as the application home screen shown after sign-in; the
  post-sign-in landing and the app root MUST route to the Dashboard.
- **FR-012**: The Dashboard MUST handle the no-data and partial-data cases gracefully with sensible
  states (zeros, baseline week, empty goals) and without errors, and MUST present clear loading and
  error states (no silent failures) while metrics are being retrieved or if retrieval fails.
- **FR-013**: The Dashboard MUST exclude configurable widgets and custom date ranges from this
  version.
- **FR-014**: Total study hours MUST equal the sum of all daily-log study hours, compared against the
  ~936-hour target.
- **FR-015**: The Dashboard MUST display two DSA figures derived from the DSA tracker: the all-time
  total problems solved, and the number of problems solved during the current week (within the
  current week's date range).

### Key Entities *(include if feature involves data)*

- **Dashboard summary** (derived, not stored): a read-only aggregate computed on demand from Daily
  Log, DSA, and Weekly Review data. Key figures: overall completion percentage, current week number
  (1–26), total study hours and the ~936-hour target, current study streak, total DSA problems solved
  and problems solved this week, and this week's goals. No new persisted entity is introduced.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Within about 2 seconds of opening the app on a typical connection, the user can see
  their overall progress, current streak, hours toward the 936-hour goal, and where to go next.
- **SC-002**: The displayed streak equals the actual number of consecutive positive-study-hours days
  ending today or yesterday, for any given set of daily logs.
- **SC-003**: The displayed total study hours equal the sum of all daily-log study hours, and the
  progress indicator reflects that total against the ~936-hour target (capped at 100%).
- **SC-004**: After underlying data changes, reopening the Dashboard reflects the change in the
  affected metrics 100% of the time (no stale values).
- **SC-005**: Each quick navigation link reaches the correct tracker page (Daily Log, DSA Tracker,
  Weekly Review).
- **SC-006**: With no underlying data, the Dashboard renders sensible zero/empty states without
  errors.

## Assumptions

- **Single user**: The application has exactly one authenticated owner; all metrics reflect that
  account, consistent with the existing foundation.
- **Read-only, derived view**: The Dashboard performs no writes; it aggregates existing Daily Log,
  DSA, and Weekly Review data and is recomputed on each load (no caching, no realtime push).
- **Overall completion percentage**: Defined as elapsed program time — the current week number
  divided by 26 (0–100%, capped) — distinct from the separate hours-vs-936 metric.
- **Study-hours target**: The target is a fixed 936 hours (26 weeks × 36 hours/week).
- **Current week number**: Derived from today relative to the configured prep start date (reusing the
  Weekly Review week rule), capped to the range 1–26.
- **This week's goals**: Taken from the Weekly Review for the current week (its planned work) when one
  exists; otherwise an empty/prompt state — no goals are fabricated or pulled from another week.
- **DSA figure**: The dashboard shows two DSA numbers derived from the DSA tracker — the all-time
  total of problems solved and the number solved during the current week (using the current week's
  date range from the Weekly Review week rule).
- **Streak day convention**: A day is identified by the same calendar-day (UTC) convention used for
  daily-log dates; a day qualifies for the streak if it has a daily log with study hours greater than
  zero; the streak ends today or yesterday.
- **Reuse of existing platform**: Authentication, navigation shell, data persistence, and the Daily
  Log, DSA, and Weekly Review data are reused; this feature adds only the aggregated home view.
- **Responsive layout**: The Dashboard is laid out responsively for desktop and mobile using the
  existing styling conventions (Tailwind and shared components).
- **Out of scope**: Configurable widgets and custom date ranges are explicitly excluded.
