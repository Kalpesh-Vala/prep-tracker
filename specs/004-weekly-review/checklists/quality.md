# Requirements Quality Checklist: Weekly Review

**Purpose**: Validate that the Weekly Review requirements are complete, clear, consistent, and
measurable before implementation. This is a "unit test for the spec" — every item tests the
*requirements*, not the eventual code. Use it as an author self-review before `/speckit.tasks`.
**Created**: 2026-07-02
**Feature**: [spec.md](../spec.md)

## Requirement Completeness

- [ ] CHK001 Are requirements defined for all captured fields (week identifier, planned, completed, study hours, problems solved, success rate, weak topics, wins, next-week adjustments)? [Completeness, Spec §FR-002]
- [ ] CHK002 Is the create/edit/view/browse capability set fully specified (noting delete is out of scope)? [Completeness, Spec §FR-001/§FR-005/§FR-006/§FR-007]
- [x] CHK003 Are maximum-length limits for the free-text fields specified at the requirements level, or only in the data model? [Gap] — Resolved: FR-002 now notes free-text length limits.
- [x] CHK004 Is the browse ordering ("most recent week first") stated as a numbered requirement rather than only an assumption? [Gap, Spec §Assumptions] — Resolved: FR-017 states the ordering.
- [x] CHK005 Is pagination stated as a spec requirement, or only present in the API contract? [Gap, Spec §FR-007] — Resolved: FR-017 states the pagination requirement.
- [ ] CHK006 Are created/updated timestamp requirements defined? [Completeness, Spec §FR-011]

## Requirement Clarity

- [x] CHK007 Is the canonical week-boundary rule (which weekday starts a week, and the timezone) pinned in the spec, not just implied by "7-day range" and "Sunday-end"? [Ambiguity, Spec §FR-002/§Assumptions] — Resolved: FR-002 now states Monday–Sunday, UTC, from a configured prep start date.
- [ ] CHK008 Is the fixed prep start date (the anchor for week 1) defined or referenced as a documented configuration? [Gap, Spec §Assumptions]
- [ ] CHK009 Is the success-rate field unambiguous as an optional user-entered percentage (0–100), not derived? [Clarity, Spec §FR-002/§Clarifications]
- [ ] CHK010 Is "problems solved" clearly a stored, editable field distinct from the prefill suggestion? [Clarity, Spec §Clarifications/§FR-002]
- [ ] CHK011 Can "reflect in a few minutes / consistent structure" be objectively evaluated? [Measurability, Spec §SC-001]

## Requirement Consistency

- [x] CHK012 Are weak topics represented consistently — the spec Field-types assumption says "free text" but the design models them as an array of strings? [Conflict, Spec §Assumptions] — Resolved: spec now describes weak topics as a list of short text entries, matching the array model.
- [ ] CHK013 Are field definitions and validation rules consistent between create and edit (same ranges; week number immutable on edit)? [Consistency, Spec §FR-002/§FR-005]
- [ ] CHK014 Is the one-review-per-week rule stated consistently across create, duplicate, and integrity requirements? [Consistency, Spec §FR-003/§FR-004/§FR-012]
- [ ] CHK015 Is week terminology (week number vs. date range) used consistently, with week number as the identity? [Consistency, Spec §FR-002]

## Acceptance Criteria Quality & Measurability

- [ ] CHK016 Are all success criteria (SC-001..SC-006) measurable and technology-agnostic? [Measurability, Spec §Success Criteria]
- [ ] CHK017 Is "prefilled totals equal the derived totals; overrides persist" expressed as an objectively verifiable criterion? [Measurability, Spec §SC-004/§FR-008]
- [ ] CHK018 Does each functional requirement have at least one corresponding acceptance scenario? [Traceability, Spec §User Scenarios]
- [ ] CHK019 Is the duplicate-week outcome (route to edit, original intact) defined as a testable assertion? [Acceptance Criteria, Spec §SC-002/§FR-004]

## Week Model & Data Integrity

- [ ] CHK020 Is the week-number range (1–26) and its rejection of out-of-range values specified? [Completeness, Spec §FR-009/§Edge Cases]
- [ ] CHK021 Is the uniqueness key (week number) and the duplicate outcome unambiguously defined? [Clarity, Spec §FR-003/§FR-004]
- [ ] CHK022 Is it required that editing one review never removes/overwrites another week's review? [Completeness, Spec §FR-012]
- [x] CHK023 Is the snapshot rule (saved totals do not change when source data later changes) stated as a requirement? [Completeness, Spec §FR-016] — Resolved: FR-016 states it and task T020 now adds an automated snapshot-integrity test.
- [ ] CHK024 Is the immutability of the week identity on edit specified? [Gap, Spec §FR-005]

## Prefill & Cross-Feature Derivation

- [ ] CHK025 Are the prefill derivation rules (study hours from Daily Log; problems solved from DSA entries in the week range) explicitly specified? [Completeness, Spec §FR-008/§Assumptions]
- [ ] CHK026 Is it required that prefill is suggestion-only and never auto-creates or overwrites a review? [Coverage, Spec §FR-008/§FR-016]
- [ ] CHK027 Is the behavior for a sparse/no-data week (zeros/empty, not an error) specified? [Edge Case, Spec §Edge Cases]
- [ ] CHK028 Is the limitation that a DSA success rate is NOT derivable from stored data acknowledged in the requirements (vs. only in the plan)? [Gap]
- [ ] CHK029 Is whether prefill is available during edit (not only create) specified? [Ambiguity, Spec §FR-008]

## Data Model & Validation

- [ ] CHK030 Are server-side validation requirements defined for every write path (create and edit)? [Coverage, Spec §FR-009]
- [ ] CHK031 Are required vs. optional fields unambiguous (success rate and weak topics optional; others required)? [Clarity, Spec §Assumptions]
- [ ] CHK032 Are numeric ranges (study hours ≥ 0, problems solved integer ≥ 0, success rate 0–100) specified and consistent? [Clarity, Spec §FR-009]

## Security, Error Handling & Scope

- [ ] CHK033 Is authentication required for every Weekly Review operation (create, edit, view, list, prefill)? [Coverage, Spec §FR-010]
- [ ] CHK034 Are explicit error/conflict states defined (duplicate week, not found, invalid input)? [Completeness, Spec §FR-004/§FR-009]
- [ ] CHK035 Is the out-of-scope boundary (no automated coaching/recommendations) explicitly stated? [Clarity, Spec §FR-013]
- [ ] CHK036 Is the dependency on existing Daily Log, DSA, and foundation infrastructure documented as a precondition? [Dependency, Spec §Assumptions]

## Notes

- Check items off as the spec is confirmed or corrected: `[x]`.
- `[Gap]`/`[Ambiguity]`/`[Conflict]` items flag likely spec touch-ups before `/speckit.tasks`.
  CHK003, CHK004, CHK005, CHK007, CHK012, and CHK023 were resolved by spec/task edits (2026-07-02).
  CHK008 (prep-start anchor value), CHK024 (week immutable on edit), CHK028 (accuracy-not-derivable),
  and CHK029 (prefill during edit) remain and are covered by the design artifacts.
- Each item tests requirement quality, not implementation behavior.
