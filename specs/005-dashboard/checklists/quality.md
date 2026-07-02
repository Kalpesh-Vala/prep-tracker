# Requirements Quality Checklist: Dashboard

**Purpose**: Validate that the Dashboard requirements are complete, clear, consistent, and measurable
before implementation. This is a "unit test for the spec" — every item tests the *requirements*, not
the eventual code. Use it as an author self-review before `/speckit.tasks`.
**Created**: 2026-07-02
**Feature**: [spec.md](../spec.md)

## Requirement Completeness

- [ ] CHK001 Are requirements defined for every displayed metric (completion %, current week, hours vs target, streak, this week's goals, DSA figures, quick links)? [Completeness, Spec §FR-001–§FR-006/§FR-015]
- [x] CHK002 Is the Dashboard's role as the post-sign-in home screen specified, including how the app root/landing routes to it? [Gap, Spec §FR-011] — Resolved: FR-011 now requires the landing and app root to route to the Dashboard.
- [x] CHK003 Are loading and error states required in addition to the empty-data state? [Gap, Spec §FR-012] — Resolved: FR-012 now requires clear loading and error states (no silent failures).
- [ ] CHK004 Is the requirement that the Dashboard performs no data entry of its own stated? [Completeness, Spec §FR-007]
- [ ] CHK005 Are quick navigation targets (Daily Log, DSA Tracker, Weekly Review) enumerated? [Completeness, Spec §FR-006]

## Requirement Clarity

- [x] CHK006 Is the study-hours target defined precisely (exactly 936 vs "approximately")? [Ambiguity, Spec §FR-003/§FR-014] — Resolved: target fixed at 936 in FR-003 and Assumptions.
- [x] CHK007 Is the rounding/precision of completion % and hours % specified? [Gap, Spec §FR-001/§FR-003] — Resolved: FR-003 now specifies whole-number rounding.
- [x] CHK008 Is the streak day boundary timezone stated as a rule (not only an assumption)? [Ambiguity, Spec §FR-008/§Assumptions] — Resolved: FR-008 now states the UTC calendar-day rule.
- [ ] CHK009 Is "this week's goals" source unambiguous (current week's Weekly Review planned work, empty otherwise)? [Clarity, Spec §FR-005/§Clarifications]
- [x] CHK010 Is "within a couple of seconds" expressed as a measurable performance expectation? [Measurability, Spec §SC-001] — Resolved: SC-001 now targets ~2 seconds.

## Metric Definitions & Formulas

- [ ] CHK011 Is the completion-% formula (current week ÷ 26, capped) explicitly defined? [Clarity, Spec §FR-001/§Clarifications]
- [ ] CHK012 Is the current-week computation defined and consistent with the Weekly Review week rule? [Consistency, Spec §Assumptions]
- [ ] CHK013 Is total study hours defined as the sum of all daily-log study hours? [Clarity, Spec §FR-014]
- [ ] CHK014 Is the hours progress indicator defined as capped at 100% while the raw total is preserved? [Clarity, Spec §FR-003/§Edge Cases]
- [ ] CHK015 Is the streak defined precisely (consecutive days with study hours > 0, ending today or yesterday, else 0)? [Clarity, Spec §FR-008]
- [ ] CHK016 Are the two DSA figures (all-time total and current-week solved) defined, including the current-week boundary? [Clarity, Spec §FR-015]

## Cross-Feature Derivation & Freshness

- [ ] CHK017 Are the data sources for each metric documented (study hours/streak → Daily Log; DSA → DSA tracker; goals → Weekly Review)? [Completeness, Spec §FR-007]
- [ ] CHK018 Is "update automatically" defined as recompute-on-load (no caching, no realtime)? [Clarity, Spec §FR-009/§Clarifications]
- [ ] CHK019 Is it required that no stale/cached values are shown? [Completeness, Spec §FR-009]
- [ ] CHK020 Is it stated that changes in underlying data are reflected on the next Dashboard open? [Acceptance Criteria, Spec §SC-004]

## Acceptance Criteria & Measurability

- [ ] CHK021 Are all success criteria (SC-001..SC-006) measurable and technology-agnostic? [Measurability, Spec §Success Criteria]
- [ ] CHK022 Does each functional requirement have at least one corresponding acceptance scenario? [Traceability, Spec §User Scenarios]
- [ ] CHK023 Is the streak's correctness expressed as an objectively verifiable criterion across boundary cases? [Measurability, Spec §SC-002/§FR-008]
- [ ] CHK024 Can the hours-progress correctness (sum + capped %) be objectively verified? [Measurability, Spec §SC-003]

## Edge Cases & Data Handling

- [ ] CHK025 Is the no-data case specified (zeros, baseline week, empty goals, no errors)? [Edge Case, Spec §FR-012/§Edge Cases]
- [ ] CHK026 Are the streak boundary cases (today vs yesterday, gap ≥ 2 days, zero-hours day) specified? [Coverage, Spec §Edge Cases/§FR-008]
- [ ] CHK027 Is the over-target case (hours ≥ 936 caps at 100%) specified? [Edge Case, Spec §Edge Cases]
- [ ] CHK028 Are the program-boundary cases (before start → week 1; after week 26 → capped) specified? [Edge Case, Spec §Edge Cases]
- [x] CHK029 Is the handling of future-dated daily-log entries in the streak documented? [Gap, Spec §Edge Cases] — Resolved: an edge case now documents future-dated entries.

## Security & Reliability

- [ ] CHK030 Is authentication required for the Dashboard and its data endpoint? [Coverage, Spec §FR-010]
- [ ] CHK031 Is the Dashboard required to be read-only (no writes to any source data)? [Completeness, Spec §Assumptions]
- [ ] CHK032 Is graceful failure required (no silent failures; stable fallback on errors)? [Gap, Spec §FR-012]

## Dependencies, Assumptions & Scope

- [ ] CHK033 Is the dependency on Daily Log, DSA, and Weekly Review data (and the shared week rule) documented? [Dependency, Spec §Assumptions]
- [ ] CHK034 Is the out-of-scope boundary (no configurable widgets, no custom date ranges) explicitly stated? [Clarity, Spec §FR-013]
- [x] CHK035 Is responsive/mobile layout an explicit expectation, or only implied? [Gap] — Resolved: an Assumptions bullet now states responsive desktop/mobile layout.

## Notes

- Check items off as the spec is confirmed or corrected: `[x]`.
- `[Gap]`/`[Ambiguity]` items flag likely spec touch-ups before `/speckit.tasks`. CHK002, CHK003,
  CHK006, CHK007, CHK008, and CHK029 were resolved by spec edits (2026-07-02). CHK010 ("couple of
  seconds" measurability) and CHK035 (responsive layout) remain and are covered by the plan/design.
- Each item tests requirement quality, not implementation behavior.
