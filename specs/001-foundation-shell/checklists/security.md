# Security, Persistence & Serverless Readiness Checklist: Foundation Shell

**Purpose**: Validate that the requirements for security (authentication, authorization,
secret handling), data persistence reliability, and serverless deployment readiness are
complete, clear, consistent, and measurable — before implementation proceeds. This is a
requirements-quality gate ("unit tests for the spec"), not an implementation test.
**Created**: 2026-06-30
**Feature**: [spec.md](../spec.md)

## Authentication Requirements Quality

- [x] CHK001 Are the accepted sign-in identifier forms (username and email) explicitly and unambiguously specified? [Clarity, Spec §FR-001]
- [x] CHK002 Are server-side credential validation requirements defined independently of any client-side validation? [Completeness, Spec §FR-003]
- [x] CHK003 Is the failed-sign-in error requirement specified to be non-revealing (not disclosing which field was wrong)? [Clarity, Spec §FR-004]
- [x] CHK004 Are requirements defined for how credentials are stored (hashed, never plaintext) with a specific non-recoverable form? [Completeness, Spec §FR-011]
- [x] CHK005 Is the brute-force protection requirement quantified with a concrete threshold and cooldown (5 attempts / 15 minutes)? [Measurability, Spec §FR-015, SC-007]
- [x] CHK006 Is it specified what state the lockout is keyed on (e.g., submitted identifier) so the requirement is testable? [Clarity, Spec §FR-015]
- [x] CHK007 Are requirements defined for behavior when a locked account later submits correct credentials during the cooldown? [Coverage, Edge Case, Spec §FR-015]
- [x] CHK008 Is the session lifetime requirement quantified (rolling ~30 days, refreshed on activity) rather than vague? [Measurability, Spec §FR-006]
- [x] CHK009 Are sign-out requirements defined to explicitly end/invalidate the session, not merely hide UI? [Completeness, Spec §FR-005, §FR-016]

## Authorization & Access Scoping Requirements Quality

- [x] CHK010 Is the requirement that every page except sign-in rejects unauthenticated access stated unambiguously? [Clarity, Spec §FR-002]
- [x] CHK011 Are the redirect-vs-error expectations for unauthenticated access distinguished between page routes and API routes? [Consistency, Spec §FR-002; Contract auth-api.md]
- [x] CHK012 Is single-owner scoping (a user only ever reads/writes their own data) stated as an explicit requirement? [Completeness, Spec §FR-007]
- [x] CHK013 Is the absence of any registration or multi-user flow specified as an intentional requirement, not an omission? [Coverage, Spec §FR-007]
- [x] CHK014 Are requirements defined for treating an expired or invalid session as unauthenticated on the next request? [Completeness, Spec §FR-014]
- [x] CHK015 Is it specified that a forged/stale session passing a surface check is still rejected by authoritative validation? [Coverage, Gap, Plan Constitution Check §IV]
- [x] CHK016 Are requirements consistent on which routes are public vs protected across spec and contracts? [Consistency, Contract auth-api.md "Route protection summary"]

## Secret & Configuration Handling Requirements Quality

- [x] CHK017 Is it required that all secrets (datastore URI, auth/session secret) come only from environment variables? [Completeness, Spec §FR-013, Constitution §IV]
- [x] CHK018 Is a requirement present that secrets are never committed and that a `.env.example` documents required variables without real values? [Completeness, Spec Assumptions; Constitution §IV]
- [x] CHK019 Are the specific required environment variables enumerated and named consistently across plan, quickstart, and contracts? [Consistency, Plan Technical Context; quickstart.md]
- [x] CHK020 Is the requirement to externalize config that differs between local and hosted environments (no hardcoding) stated? [Clarity, Spec §FR-013, Constitution §VI]
- [x] CHK021 Are requirements defined for how the single owner's credentials are provisioned (out-of-band/seed, not self-registration)? [Completeness, Spec Assumptions; Research D9]

## Data Persistence Reliability Requirements Quality

- [x] CHK022 Is the requirement that preparation/session data is never silently lost, overwritten, or corrupted stated as a binding rule? [Completeness, Constitution §II]
- [x] CHK023 Are created-at/updated-at timestamp requirements specified for every persisted document? [Completeness, Data-model.md; Constitution §II]
- [x] CHK024 Is server-side validation required before any write that modifies stored data? [Completeness, Spec §FR-003, Constitution §II]
- [x] CHK025 Is the data shape defined via explicit validated schemas rather than ad-hoc object shapes? [Clarity, Data-model.md; Constitution §II]
- [x] CHK026 Are session persistence requirements explicit that sessions are stored, queryable records and that sign-out removes/invalidates the record? [Completeness, Spec §FR-016]
- [x] CHK027 Is it specified that only a hash of the session token is persisted (raw token never stored)? [Clarity, Contract session-cookie.md; Data-model.md]
- [x] CHK028 Are requirements defined for automatic expiry/cleanup of stale sessions and login attempts (TTL)? [Coverage, Data-model.md]
- [x] CHK029 Is the behavior when the datastore is unreachable at runtime specified to fail safely rather than appear to succeed? [Coverage, Edge Case, Spec Edge Cases]
- [x] CHK030 Are destructive operations limited to the owner's own data and gated by an explicit action? [Completeness, Spec §FR-016, Constitution §II]

## Serverless Deployment Readiness Requirements Quality

- [x] CHK031 Is a cached/pooled datastore-connection requirement specified to prevent a new connection per invocation? [Completeness, Constitution §VI; Research D1]
- [x] CHK032 Is the requirement that request handlers are stateless (no reliance on in-memory state between invocations) stated? [Clarity, Constitution §VI]
- [x] CHK033 Are the runtime constraints of the edge cookie-check vs Node-side validation split documented as requirements/assumptions? [Coverage, Research D4; Contract session-cookie.md]
- [x] CHK034 Is the requirement that the app is deployable to and reachable from a hosted URL specified and measurable? [Measurability, Spec §FR-012, SC-001]
- [x] CHK035 Is a runtime requirement to connect to a persistent datastore (for later slices) explicitly stated? [Completeness, Spec §FR-013]
- [x] CHK036 Are expensive/long-running operations addressed (none in this slice) or explicitly noted as out of scope to avoid serverless limit risks? [Coverage, Gap, Constitution §VI]

## Acceptance Criteria & Measurability

- [x] CHK037 Can each success criterion (SC-001–SC-007) be objectively measured without reference to implementation details? [Measurability, Spec Success Criteria]
- [x] CHK038 Are the session-persistence success criteria (reload + revisit remain signed in; sign-out blocks access) stated as verifiable outcomes? [Measurability, Spec §SC-004, §SC-005]
- [x] CHK039 Does every security/persistence functional requirement have at least one corresponding acceptance scenario or success criterion? [Traceability, Spec User Scenarios + Success Criteria]

## Ambiguities, Conflicts & Gaps

- [x] CHK040 Is the term "secure" / "secure-by-default" backed by concrete, testable requirements (hashing, route protection, validation) rather than left vague? [Ambiguity, Constitution §IV]
- [x] CHK041 Are there any conflicts between the rolling-session refresh requirement and the fixed ~30-day expiry that need reconciling? [Conflict, Spec §FR-006]
- [x] CHK042 Are non-functional gaps explicitly acknowledged as out of scope for this slice (observability, reliability targets, accessibility) rather than silently missing? [Gap, Spec Assumptions]

## Notes

- Check items off as completed: `[x]`
- Each item validates the QUALITY of a requirement (is it written well?), not whether code works.
- ≥ 80% of items carry a traceability reference (`[Spec §…]`, contract/plan/research link, or a `[Gap]`/`[Ambiguity]`/`[Conflict]` marker).
- Items marked `[Gap]` indicate a requirement that may be missing or only implied; resolve by adding/clarifying spec text before implementation.
