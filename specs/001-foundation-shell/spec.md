# Feature Specification: Foundation Shell (Secure, Navigable, Deployable App)

**Feature Branch**: `001-foundation-shell`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: "Build the foundational shell of a personal preparation-tracking application for a single user. This foundation slice delivers a working, deployable, authenticated empty application that later feature slices build on."

## Clarifications

### Session 2026-06-30

- Q: How long should an authenticated session persist before it expires? → A: Long-lived rolling session (~30 days), refreshed on each visit/activity
- Q: How should repeated failed sign-in attempts be handled? → A: Lightweight rate limiting — temporary lockout/backoff after N failed attempts
- Q: Where are authenticated sessions stored? → A: Server-side sessions persisted in the datastore (Session is a stored, queryable record)
- Q: What form does the sign-in identifier take? → A: Accept either a username or an email address as the identifier
- Q: What are the concrete rate-limit threshold and cooldown for failed sign-ins? → A: 5 consecutive failed attempts → 15-minute lockout

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure single-user sign-in and sign-out (Priority: P1)

The sole owner of the application opens the hosted URL, is presented with a sign-in
page, enters their personal credentials, and gains access to the private application.
When finished, they sign out and can no longer reach any protected page until they sign
in again. Anyone who is not signed in cannot reach any page other than the sign-in page.

**Why this priority**: Security is the foundation everything else depends on. Without
trustworthy authentication and route protection, the private preparation data that later
slices add would be exposed. This is the minimum viable, demonstrable slice — a private
app that only its owner can enter.

**Independent Test**: Deploy the app, attempt to open a protected URL while signed out
(expect redirect to sign-in), sign in with valid credentials (expect access granted),
sign in with invalid credentials (expect rejection), then sign out (expect protected
URLs become inaccessible again). Delivers a secure, private entry point with no tracker
features required.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor, **When** they request any protected application
   page, **Then** they are redirected to the sign-in page and the protected content is not
   served.
2. **Given** the sign-in page, **When** the user submits valid personal credentials,
   **Then** they are authenticated and taken into the application.
3. **Given** the sign-in page, **When** the user submits invalid credentials, **Then**
   authentication is rejected with a clear, non-revealing error message and no session is
   created.
4. **Given** an authenticated user, **When** they sign out, **Then** their session is
   ended and any subsequent request to a protected page redirects to the sign-in page.

---

### User Story 2 - Authenticated application shell with navigation (Priority: P2)

After signing in, the user lands on a persistent application shell: a navigation layout
(sidebar or top navigation) showing placeholder entries for the planned areas —
Dashboard, Daily Log, DSA, and Weekly Review — alongside a main content region and a way
to sign out. The navigation is present on every authenticated page so later slices can
attach real screens to each entry.

**Why this priority**: The shell is the structural frame every future feature plugs into.
It proves the authenticated experience is navigable and consistent, but it depends on
authentication (P1) being in place first.

**Independent Test**: While signed in, confirm the navigation layout renders with all
four placeholder entries and a sign-out control, the main content region is visible, and
the layout persists as the user moves between placeholder areas. Delivers a navigable
empty shell without any tracker functionality.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** the application shell loads, **Then** a
   persistent navigation layout is shown with placeholder entries for Dashboard, Daily
   Log, DSA, and Weekly Review, plus a sign-out control.
2. **Given** the application shell, **When** the user selects a placeholder navigation
   entry, **Then** the navigation layout remains visible and the main content region
   reflects the selected area (placeholder content is acceptable).
3. **Given** the application shell, **When** it is viewed, **Then** the main content
   region is clearly distinguished from the navigation region.

---

### User Story 3 - Session persistence across reloads (Priority: P3)

Once signed in, the user can reload the page or return to the hosted URL and remain
signed in without re-entering credentials, until they explicitly sign out. This makes the
app usable for daily, repeated visits across a multi-month preparation period.

**Why this priority**: Persistence is what makes the app pleasant for daily use, but it is
only meaningful once authentication and the shell exist, so it sits below them.

**Independent Test**: Sign in, reload the page (and separately reopen the hosted URL in a
new tab), and confirm the user remains authenticated and inside the shell without a fresh
sign-in. Then sign out and confirm a reload no longer grants access.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they reload the page, **Then** they remain
   signed in and stay within the application shell.
2. **Given** an authenticated user, **When** they reopen the hosted URL in the same
   browser before signing out, **Then** they remain signed in.
3. **Given** a user who has signed out, **When** they reload or revisit the hosted URL,
   **Then** they are treated as unauthenticated and sent to the sign-in page.

---

### Edge Cases

- What happens when a session expires or its credential token becomes invalid while the
  user is on a protected page? The user MUST be treated as unauthenticated on the next
  request and redirected to sign-in.
- How does the system handle a direct request (e.g., bookmarked deep link) to a protected
  page while signed out? It MUST redirect to sign-in rather than expose any content.
- What happens when the persistent datastore is unreachable at runtime? The application
  MUST fail safely with a clear error state rather than granting access or appearing to
  succeed.
- What happens when repeated invalid sign-in attempts occur? Error responses MUST NOT
  reveal whether the failure was due to the identifier or the secret, and the system MUST
  apply lightweight rate limiting — after 5 consecutive failed attempts, further attempts
  MUST be locked out for a 15-minute cooldown before being allowed again.
- What happens when a user navigates to the sign-in page while already authenticated? They
  SHOULD be taken into the application rather than shown the sign-in form again.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a sign-in page where the single owner authenticates
  with personal credentials. The identifier MUST accept either the owner's username or
  their email address, paired with a secret.
- **FR-002**: The system MUST reject access to every application page except the sign-in
  page when the requester is not authenticated, redirecting them to the sign-in page.
- **FR-003**: The system MUST validate submitted credentials on the server side and MUST
  reject invalid credentials without creating a session.
- **FR-004**: The system MUST present a clear, non-revealing error on failed sign-in that
  does not disclose which part of the credentials was incorrect.
- **FR-005**: The system MUST establish an authenticated session upon successful sign-in
  and MUST allow the user to end that session via an explicit sign-out action.
- **FR-006**: The system MUST persist the authenticated session across page reloads and
  revisits to the hosted URL until the user signs out or the session expires. The session
  MUST be a rolling session with an expiry of approximately 30 days that is refreshed on
  each authenticated visit/activity, so an actively used app rarely forces re-sign-in while
  an abandoned session still expires.
- **FR-007**: The system MUST scope all access to a single owner; the user MUST only ever
  access their own account and data, and no multi-user or registration flow is exposed.
- **FR-008**: After successful sign-in, the system MUST present a persistent navigation
  layout containing placeholder entries for Dashboard, Daily Log, DSA, and Weekly Review,
  plus a sign-out control and a main content region.
- **FR-009**: The navigation layout MUST remain visible across authenticated pages, and
  selecting a placeholder entry MUST update the main content region (placeholder content
  is acceptable for this slice).
- **FR-010**: The system MUST NOT include any tracker functionality, charts, or progress
  data in this slice; navigation entries lead to placeholders only.
- **FR-011**: The system MUST store credential secrets in a non-recoverable (hashed) form
  and MUST NOT store or transmit them in plaintext.
- **FR-012**: The system MUST be deployable to and reachable from a hosted environment via
  a public URL.
- **FR-013**: The system MUST connect to a persistent datastore at runtime that later
  slices will use to store preparation data, and MUST source its connection configuration
  and secrets from environment configuration rather than hardcoded values.
- **FR-014**: The system MUST treat an expired or invalid session as unauthenticated on
  the next request and redirect to the sign-in page. (This is the session-expiry
  specialization of FR-002's general unauthenticated-access rule.)
- **FR-015**: The system MUST apply lightweight rate limiting to sign-in attempts: after 5
  consecutive failed attempts, further attempts MUST be locked out for a 15-minute cooldown
  period before being permitted again, without disclosing which credential field was
  incorrect.
- **FR-016**: The system MUST persist authenticated sessions server-side in the datastore
  as queryable records; the client MUST reference a session by an identifier (e.g., a
  cookie), and sign-out MUST invalidate/remove the corresponding server-side session record
  so it can no longer authenticate requests.

### Key Entities *(include if feature involves data)*

- **Owner (User account)**: Represents the single person who owns and uses the
  application. Key attributes: a username and an email address (either of which can be used
  as the sign-in identifier) and a securely stored credential secret. There is exactly one
  owner; no self-registration or additional accounts are supported in this slice.
- **Session**: Represents an authenticated period of access tied to the owner, persisted
  server-side in the datastore as a stored, queryable record. Key attributes: a session
  identifier referenced by the client (e.g., via cookie), the owner it belongs to, a
  rolling expiry timestamp (~30 days, refreshed on activity), and creation/last-activity
  timestamps. A session ends when the owner signs out (the record is invalidated/removed)
  or when it expires.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can deploy the application and reach the hosted sign-in page from a
  public URL.
- **SC-002**: 100% of attempts to open a protected page while signed out result in a
  redirect to sign-in with no protected content served.
- **SC-003**: A user with valid credentials can sign in and reach the navigation shell in
  under 30 seconds, and the shell shows all four planned placeholder areas plus sign-out.
- **SC-004**: After signing in, the user can reload the page and revisit the hosted URL and
  remain signed in 100% of the time until they sign out, for the full rolling session window
  (~30 days, refreshed on each authenticated visit/activity).
- **SC-005**: After signing out, 100% of subsequent attempts to reach a protected page
  redirect to sign-in.
- **SC-006**: Invalid credential submissions are rejected 100% of the time with no session
  created and no disclosure of which credential field was wrong.
- **SC-007**: After 5 consecutive failed sign-in attempts, further attempts are blocked for
  a 15-minute cooldown before a valid sign-in is accepted again.

## Assumptions

- The single owner's credentials are provisioned out of band (e.g., seeded or configured
  through environment configuration) rather than through a self-service registration flow,
  consistent with a private single-user system.
- "Personal credentials" means an identifier plus a secret; standard session-based
  authentication is acceptable and no third-party SSO/OAuth is required for this slice.
- Standard modern web browser and stable internet connectivity are assumed for the user.
- The persistent datastore is provisioned and reachable in the hosted environment; this
  slice only needs to establish and verify connectivity, not store preparation data yet.
- Placeholder navigation content (empty or "coming soon" regions) is acceptable; real
  tracker screens are delivered in later slices.
- Visual styling beyond a clear, usable navigation shell is not constrained by this slice.
