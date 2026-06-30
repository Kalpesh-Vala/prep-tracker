# Phase 1 Data Model: Foundation Shell

Persistence: MongoDB Atlas via Mongoose. Every model uses `{ timestamps: true }` so each
document carries `createdAt` and `updatedAt` (Constitution Principle II). All names are
consistent across the database, types, API, and UI (Principle VII).

## Entity: User (Owner)

The single account that owns and uses the application. Exactly one document exists; no
self-registration.

| Field | Type | Rules |
|-------|------|-------|
| `_id` | ObjectId | Primary key (auto) |
| `username` | string | Required, unique, lowercased, trimmed, 3–32 chars |
| `email` | string | Required, unique, lowercased, trimmed, valid email format |
| `passwordHash` | string | Required; `scrypt` output stored as `salt:derivedKey` (hex). Never the plaintext password |
| `createdAt` | Date | Auto (timestamps) |
| `updatedAt` | Date | Auto (timestamps) |

- **Indexes**: unique index on `username`; unique index on `email`.
- **Validation**: enforced by Mongoose schema and by Zod at the API boundary.
- **Notes**: Either `username` or `email` can be used as the sign-in identifier (lookup with
  `$or`). The plaintext password is never stored or logged.

## Entity: Session

A server-side, persisted, queryable record representing one authenticated period for the
owner. Created on sign-in, deleted on sign-out, auto-expired by TTL.

| Field | Type | Rules |
|-------|------|-------|
| `_id` | ObjectId | Primary key (auto) |
| `tokenHash` | string | Required, unique; keyed HMAC-SHA-256 (hex) of the opaque session token, using `AUTH_SECRET` as the key. The raw token is only ever in the cookie, never stored |
| `userId` | ObjectId (ref `User`) | Required; the owner this session belongs to |
| `expiresAt` | Date | Required; ~30 days ahead, rolled forward on each authenticated request (sliding window) |
| `createdAt` | Date | Auto (timestamps) |
| `updatedAt` | Date | Auto; also serves as last-activity marker |

- **Indexes**: unique index on `tokenHash`; **TTL index** on `expiresAt`
  (`expireAfterSeconds: 0`) so MongoDB purges expired sessions automatically.
- **Lifecycle / state transitions**:
  - *Created* on successful sign-in.
  - *Refreshed* (expiry extended) on each authenticated request that validates the session.
  - *Ended* by sign-out (record deleted, cookie cleared) or by expiry (TTL removal).
- **Security**: only the keyed (HMAC) token hash is stored, so a DB leak cannot reproduce a
  usable session without also knowing `AUTH_SECRET`. Sessions are scoped to their `userId`;
  a session can only authenticate the owner it references.

## Entity: LoginAttempt

Supports brute-force rate limiting (FR-015, SC-007: 5 failures → 15-minute lockout). One
document per failed sign-in attempt.

| Field | Type | Rules |
|-------|------|-------|
| `_id` | ObjectId | Primary key (auto) |
| `key` | string | Required; normalized (lowercased) submitted identifier |
| `createdAt` | Date | Auto (timestamps); used to count failures within the trailing 15-minute window |

- **Indexes**: index on `key`; **TTL index** on `createdAt` with
  `expireAfterSeconds` ≈ 900 (15 minutes) so stale attempts auto-expire.
- **Logic**:
  - On each sign-in attempt, count `LoginAttempt` docs for `key` created within the last 15
    minutes. If ≥ 5, the account/key is **locked** → reject with HTTP 429 without checking
    credentials.
  - On a **failed** credential check, insert a `LoginAttempt` for `key`.
  - On a **successful** sign-in, delete all `LoginAttempt` docs for `key`.
- **Notes**: Keying on the normalized identifier throttles attempts against any identifier,
  including non-existent ones, so the real account is never an unthrottled target.

## Relationships

```text
User (1) ───< Session (0..*)        # a user may have multiple active sessions (devices/tabs)
LoginAttempt                        # standalone; keyed by identifier string, not a hard FK
```

## Derived / supporting types (in `types/`)

- `SessionUser`: the minimal authenticated user shape exposed to UI/server components
  (`{ id: string; username: string; email: string }`) — never includes `passwordHash`.
- `ApiResponse<T>`: `{ data: T } | { error: { code: string; message: string } }` — the
  consistent envelope returned by all Route Handlers.

## Integrity rules (mapped to Principle II)

- All writes validated server-side (Zod) before persistence.
- Credentials stored only as `scrypt` hashes; never plaintext.
- Timestamps present on every document.
- Deletion is limited to the owner's own session on sign-out (scoped, confirmed by the
  explicit sign-out action).
- Schemas are explicit Mongoose models, not ad-hoc object shapes.
