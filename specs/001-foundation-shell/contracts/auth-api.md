# Auth API Contract — Foundation Shell

All endpoints are Next.js Route Handlers under `app/api`. Requests and responses are JSON.
Every response uses the consistent envelope (Constitution Principle VII):

- **Success**: `{ "data": <payload> }`
- **Error**: `{ "error": { "code": <string>, "message": <string> } }`

Standard status codes: `200` OK, `204` No Content, `400` validation error, `401`
unauthorized, `429` rate-limited/locked, `500` server error.

The session is carried in an httpOnly cookie named `pt_session` (see
[session-cookie.md](session-cookie.md)). Clients do not read or set it directly.

---

## POST /api/auth/signin

Authenticate the single owner and start a session.

**Auth required**: No (public).

**Request body**:

```json
{
  "identifier": "string (username or email)",
  "password": "string"
}
```

**Validation (server-side, Zod)**:

- `identifier`: required, non-empty string, trimmed, lowercased before lookup.
- `password`: required, non-empty string.

**Behavior**:

1. If the normalized `identifier` is currently locked (≥ 5 failed attempts in the last 15
   minutes) → `429` without checking credentials.
2. Look up the owner by `username` OR `email` (normalized). Verify `password` against the
   stored `scrypt` hash with a constant-time comparison.
3. On success: clear failed attempts for the key, create a `Session`, set the `pt_session`
   cookie, return `200`.
4. On failure (no such user OR wrong password): record a failed attempt, return `401` with a
   generic message that does NOT reveal which field was wrong.

**Responses**:

| Status | Body | When |
|--------|------|------|
| `200` | `{ "data": { "user": { "id", "username", "email" } } }` + `Set-Cookie: pt_session=...` | Valid credentials |
| `400` | `{ "error": { "code": "INVALID_INPUT", "message": "..." } }` | Missing/invalid fields |
| `401` | `{ "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid username/email or password." } }` | Wrong identifier or password |
| `429` | `{ "error": { "code": "TOO_MANY_ATTEMPTS", "message": "Too many attempts. Try again later." } }` | Locked (5 fails / 15 min) |

---

## POST /api/auth/signout

End the current session.

**Auth required**: Yes (valid `pt_session` cookie).

**Request body**: none.

**Behavior**: Validate the session cookie, delete the matching `Session` record, and clear
the `pt_session` cookie. Idempotent — clearing an already-absent session still succeeds.

**Responses**:

| Status | Body | When |
|--------|------|------|
| `204` | _(empty)_ + `Set-Cookie` clearing `pt_session` | Session ended (or already absent) |

---

## GET /api/auth/session

Return the current authentication status. Used by UI and tests.

**Auth required**: No (returns unauthenticated state rather than erroring).

**Behavior**: If a valid, unexpired session exists, return the owner summary and roll the
expiry forward; otherwise return an unauthenticated payload.

**Responses**:

| Status | Body | When |
|--------|------|------|
| `200` | `{ "data": { "authenticated": true, "user": { "id", "username", "email" } } }` | Valid session |
| `200` | `{ "data": { "authenticated": false } }` | No/expired/invalid session |

---

## Route protection summary

| Path pattern | Protection |
|--------------|------------|
| `/signin`, `/api/auth/signin`, `/api/auth/session` | Public |
| `/`, `/dashboard`, `/daily-log`, `/dsa`, `/weekly-review` | Protected — middleware redirects to `/signin` if `pt_session` cookie absent; `(app)` layout validates server-side |
| `/api/auth/signout` and any future data routes | Protected — server-side session validation; `401` if invalid |

- Unauthenticated requests to protected **pages** → `302` redirect to `/signin`.
- Unauthenticated requests to protected **API routes** → `401` JSON error.
- Expired/forged cookies that pass the edge presence check are rejected by server-side
  validation.
