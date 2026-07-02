# Requirements Quality Checklist: DSA Problem Tracker

**Purpose**: Validate that the DSA Tracker requirements are complete, clear, consistent, and
measurable before implementation. This is a "unit test for the spec" — every item tests the
*requirements*, not the eventual code. Use it as an author self-review before `/speckit.tasks`.
**Created**: 2026-07-02
**Feature**: [spec.md](../spec.md)

## Requirement Completeness

- [ ] CHK001 Are requirements defined for all captured fields, including title, topic, subtopic, difficulty, platform, time taken, attempt type, solved-without-hints, time/space complexity, confidence, needs-revision, interview-worthy, and solved-on date? [Completeness, Spec §FR-002]
- [ ] CHK002 Is the create-with-past-solved-date (backfill) behavior and future-date rejection specified? [Completeness, Spec §FR-002 / §Assumptions]
- [x] CHK003 Are maximum-length limits for free-text fields (title, topic, platform, complexity) specified at the requirements level, or only in the data model? [Gap] — Resolved: FR-002 now caps free-text fields.
- [x] CHK004 Is the default list sort order stated as a numbered requirement (not only in Key Entities/Assumptions)? [Gap, Spec §Key Entities] — Resolved: FR-017 states reverse-chronological ordering.
- [ ] CHK005 Are requirements defined for the edit and delete flows, including the delete confirmation step? [Completeness, Spec §FR-003 / §FR-004]
- [ ] CHK006 Are created/updated timestamp requirements defined? [Completeness, Spec §FR-012]

## Requirement Clarity

- [ ] CHK007 Is "time taken" clearly defined with a unit and lower bound (whole minutes, > 0)? [Clarity, Spec §FR-002 / §Assumptions]
- [ ] CHK008 Are the difficulty and attempt-type value sets enumerated unambiguously? [Clarity, Spec §FR-002]
- [ ] CHK009 Is the confidence scale explicitly bounded to an integer 1–5? [Clarity, Spec §FR-002]
- [ ] CHK010 Is topic normalization (case-insensitive, trimmed) defined precisely enough to be testable? [Clarity, Spec §Edge Cases / §Assumptions]
- [x] CHK011 When a topic group has mixed casing, is the representative display label for counts/insights specified? [Ambiguity, Spec §Assumptions] — Resolved: most-recently-saved casing is the display label.
- [ ] CHK012 Can "log a solved problem in under a minute" be objectively measured (defined start/end)? [Measurability, Spec §SC-001]

## Requirement Consistency

- [ ] CHK013 Is the practice-record model applied consistently (counts over records, same title may recur) across FR-007, FR-008, and the insights? [Consistency, Spec §Clarifications / §FR-007]
- [ ] CHK014 Are field definitions and validation rules consistent between create and edit (same enums, ranges, future-date rejection)? [Consistency, Spec §FR-002 / §FR-003 / §FR-010]
- [ ] CHK015 Is the topic filter's exact-normalized-match behavior consistent with the topic-grouping used for counts? [Consistency, Spec §FR-006 / §FR-008]
- [ ] CHK016 Is entity terminology ("problem" / "practice record") used consistently throughout the spec? [Consistency]

## Acceptance Criteria Quality & Measurability

- [ ] CHK017 Are all success criteria (SC-001..SC-006) measurable and technology-agnostic? [Measurability, Spec §Success Criteria]
- [ ] CHK018 Is the weakest-topics ranking expressed as an objectively verifiable rule (avg confidence asc, tie-break needs-revision desc)? [Measurability, Spec §FR-009 / §SC-004]
- [ ] CHK019 Does each functional requirement have at least one corresponding acceptance scenario? [Traceability, Spec §User Scenarios]
- [ ] CHK020 Is the delete-confirmation outcome (cancel leaves intact, confirm removes only that record) defined as testable assertions? [Acceptance Criteria, Spec §SC-005 / §FR-004]

## Data Model & Validation

- [ ] CHK021 Are server-side validation requirements defined for every write path (create and edit)? [Coverage, Spec §FR-010]
- [ ] CHK022 Are required vs. optional fields unambiguous (only subtopic optional)? [Clarity, Spec §Assumptions]
- [ ] CHK023 Are invalid-input cases (confidence out of range, unknown difficulty/attempt type, non-positive time, blank required text) explicitly required to be rejected with nothing persisted? [Completeness, Spec §FR-010]
- [ ] CHK024 Are complexity fields specified as validated non-empty strings without imposing a fixed enumeration? [Clarity, Spec §Assumptions]

## Filtering & List Behavior

- [ ] CHK025 Is combined-filter behavior (results match ALL active filters) specified? [Clarity, Spec §FR-006]
- [ ] CHK026 Is it specified whether a single topic or multiple topics can be selected in the topic filter? [Ambiguity, Spec §FR-006]
- [ ] CHK027 Are empty states defined for both no-data and no-matches-for-filters? [Coverage, Spec §FR-015 / §Edge Cases]
- [x] CHK028 Is pagination stated as a spec requirement, or only present in the API contract? [Gap, Spec §FR-005] — Resolved: FR-017 states the pagination requirement.

## Insights & Analytics Correctness

- [ ] CHK029 Is it required that insights (total, per-topic, per-difficulty, weak topics) reflect ALL problems, independent of active list filters? [Consistency, Spec §FR-016]
- [ ] CHK030 Are per-topic and per-difficulty counts both specified as required insights? [Completeness, Spec §FR-008]
- [ ] CHK031 Is the number of weak topics surfaced, and the small-sample limitation, acknowledged? [Clarity, Spec §Assumptions / §Edge Cases]
- [x] CHK032 Is the final tie-break defined when two topics share the same average confidence AND needs-revision count? [Ambiguity, Spec §FR-009] — Resolved: FR-009 now breaks remaining ties alphabetically.

## Security, Data Integrity & Scope

- [ ] CHK033 Is authentication required for every DSA operation (add, edit, delete, list, insights)? [Coverage, Spec §FR-011]
- [ ] CHK034 Is it required that add/edit/delete never removes, overwrites, or corrupts any other record? [Completeness, Spec §FR-013]
- [ ] CHK035 Is permanent (hard) deletion after confirmation, with no undo/trash, explicitly stated? [Clarity, Spec §Assumptions / §FR-004]
- [ ] CHK036 Is the out-of-scope boundary (no spaced-repetition scheduling, no external syncing) explicitly stated? [Clarity, Spec §FR-014 / §Assumptions]
- [ ] CHK037 Is the dependency on existing foundation infrastructure (auth, session, DB, navigation shell) documented as a precondition? [Dependency, Spec §Assumptions]

## Notes

- Check items off as the spec is confirmed or corrected: `[x]`.
- `[Gap]`/`[Ambiguity]` items flag likely spec touch-ups before `/speckit.tasks`. CHK003, CHK004,
  CHK011, CHK028, and CHK032 were resolved by spec edits (2026-07-02). CHK026 (single vs multi topic
  filter) remains open and is treated as single-topic selection by the design.
- Each item tests requirement quality, not implementation behavior.
