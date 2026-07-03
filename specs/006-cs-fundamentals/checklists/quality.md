# Requirements Quality Checklist: CS Fundamentals Tracker

**Purpose**: Validate that the CS Fundamentals requirements are complete, clear, consistent, and
measurable before implementation. This is a "unit test for the spec" — every item tests the
*requirements*, not the eventual code. Use it as an author self-review before `/speckit.tasks`.
**Created**: 2026-07-03
**Feature**: [spec.md](../spec.md)

## Requirement Completeness

- [ ] CHK001 Are requirements defined for all captured fields (domain, title, subtopic, tags, stage, confidence, last-revised date, notes, interview-question references)? [Completeness, Spec §FR-002]
- [ ] CHK002 Are all capabilities specified (create, progress stage, edit, view/filter, insights)? [Completeness, Spec §FR-001/§FR-003/§FR-004/§FR-005]
- [x] CHK003 Is a removal/archive capability specified, or is the spec's "no deletion" stance still accurate given the planned archive path? [Conflict, Spec §Assumptions] — Resolved: FR-019 + Assumptions now define soft-delete archive (no hard delete).
- [x] CHK004 Are maximum-length limits for text fields (title, subtopic, notes, tags, refs) specified at the requirements level, or only in the data model? [Gap] — Resolved: FR-002 now notes free-text length limits.
- [x] CHK005 Are created/updated timestamp requirements defined? [Completeness, Spec §FR-015] — Resolved: FR-015 defines them and tasks T012/T017 now assert them.
- [ ] CHK006 Is where the tracker lives (route/navigation entry) specified? [Gap]

## Requirement Clarity

- [ ] CHK007 Is the concept identity key (domain + title + subtopic, normalized) unambiguously defined? [Clarity, Spec §FR-012/§Clarifications]
- [ ] CHK008 Is the maturity-stage set and its ordering (learned → revised → can-explain → interview-ready) clearly defined, including that stages may move in any direction? [Clarity, Spec §Assumptions]
- [ ] CHK009 Is "not interview-ready" defined precisely (any stage other than interview-ready)? [Clarity, Spec §FR-006/§Assumptions]
- [ ] CHK010 Are the confidence bands (low 1–2, medium 3, high 4–5) defined? [Clarity, Spec §FR-006/§Clarifications]
- [ ] CHK011 Is the staleness threshold (14 days) explicitly defined? [Clarity, Spec §Clarifications/§Assumptions]
- [ ] CHK012 Can "identify highest-priority weak areas in under a minute" be objectively evaluated? [Measurability, Spec §SC-007]

## Data Model & Longitudinal Integrity

- [ ] CHK013 Is it required that a stage/detail update edits the existing concept in place (no duplicate record)? [Completeness, Spec §FR-003]
- [x] CHK014 Is the one-record-per-concept uniqueness rule (and duplicate outcome) unambiguous? [Clarity, Spec §FR-012] — Resolved: FR-012 defines it; tasks cover both create-duplicate (T035) and rename-collision (T019) 409 paths.
- [ ] CHK015 Is subtopic clearly a distinct identity field, separate from the free-form tags list? [Consistency, Spec §Clarifications/§FR-002]
- [ ] CHK016 Is it required that editing/updating one concept never removes/overwrites another or silently loses the edited concept's data? [Completeness, Spec §FR-016]
- [ ] CHK017 Is the last-revised date behavior specified (defaults to today, past allowed, future rejected)? [Clarity, Spec §Assumptions/§Edge Cases]

## Insights & Weak-Concept Scoring

- [ ] CHK018 Is the weak-concepts inclusion rule (low confidence 1–2 and/or stale > 14 days) explicitly defined? [Clarity, Spec §FR-011/§Clarifications]
- [ ] CHK019 Is the weak-concepts ranking defined deterministically (combined score, weakest-first, with a tie-break)? [Measurability, Spec §FR-011/§SC-005]
- [ ] CHK020 Is the interview-ready percentage formula defined for overall and per domain (including the empty-domain case)? [Clarity, Spec §FR-010/§Assumptions]
- [x] CHK021 Is the rounding/precision of the interview-ready percentages specified? [Gap] — Resolved: FR-010 now specifies whole-number rounding.
- [ ] CHK022 Are the per-domain and per-stage counts specified as required insights? [Completeness, Spec §FR-008/§FR-009]
- [x] CHK023 Is it specified whether archived concepts are excluded from counts/insights? [Gap, Spec §Assumptions] — Resolved: FR-019 excludes archived from list, counts, and insights.

## Filtering & List Behavior

- [ ] CHK024 Is combined-filter behavior (results match ALL active filters) specified? [Clarity, Spec §FR-006]
- [ ] CHK025 Is the "not interview-ready" focused view specified as a filter? [Completeness, Spec §FR-006]
- [x] CHK026 Is a "weak only" filter part of the requirements, or only introduced in the API/UI design? [Gap, Spec §FR-006] — Resolved: FR-006 now lists a "weak only" view.
- [ ] CHK027 Are empty states defined for both no-data and no-matches-for-filters? [Coverage, Spec §FR-018/§Edge Cases]
- [x] CHK028 Is pagination/stable sort stated as a spec requirement, or only in the API contract? [Gap, Spec §FR-005] — Resolved: FR-005 now states pagination with stable ordering.

## Acceptance Criteria & Measurability

- [ ] CHK029 Are all success criteria (SC-001..SC-007) measurable and technology-agnostic? [Measurability, Spec §Success Criteria]
- [ ] CHK030 Does each functional requirement have at least one corresponding acceptance scenario? [Traceability, Spec §User Scenarios]
- [ ] CHK031 Is the "stage update keeps a single record" outcome expressed as a testable assertion? [Acceptance Criteria, Spec §SC-006/§FR-003]

## Security, Reliability & Scope

- [ ] CHK032 Is authentication required for every operation (create, update, edit, list, insights)? [Coverage, Spec §FR-014]
- [ ] CHK033 Are server-side validation requirements defined for every write path (create and edit/stage update)? [Coverage, Spec §FR-013]
- [ ] CHK034 Are explicit conflict/error states defined (duplicate concept, not found, invalid input)? [Completeness, Spec §FR-012/§FR-013]
- [ ] CHK035 Is the out-of-scope boundary (no auto-plans, no external sync, no AI tutoring) explicitly stated? [Clarity, Spec §FR-017]
- [ ] CHK036 Is the dependency on the existing foundation (auth, session, DB, navigation shell) documented as a precondition? [Dependency, Spec §Assumptions]

## Notes

- Check items off as the spec is confirmed or corrected: `[x]`.
- `[Gap]`/`[Conflict]` items flag likely spec touch-ups before `/speckit.tasks`. CHK003, CHK004,
  CHK021, CHK023, CHK026, and CHK028 were resolved by spec edits (2026-07-03). CHK006 (route/nav
  location) remains and is covered by the plan (new `/cs-fundamentals` route + Sidebar/middleware).
- Each item tests requirement quality, not implementation behavior.
