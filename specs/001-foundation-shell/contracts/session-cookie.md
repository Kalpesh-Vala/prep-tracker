# Session Cookie Contract — Foundation Shell

The authenticated session is carried in a single cookie. The cookie holds an opaque random
token; the server stores only a keyed hash of that token (HMAC-SHA-256 using `AUTH_SECRET`)
(see [../data-model.md](../data-model.md), Session entity).

## Cookie attributes

| Attribute | Value | Reason |
|-----------|-------|--------|
| Name | `pt_session` | Consistent, namespaced name |
| Value | 32-byte random token, base64url-encoded | Unguessable; only its keyed (HMAC) hash is stored server-side |
| `HttpOnly` | `true` | Not readable by JavaScript (mitigates XSS token theft) |
| `Secure` | `true` (production) | Sent only over HTTPS |
| `SameSite` | `Lax` | CSRF mitigation while allowing top-level navigation |
| `Path` | `/` | Valid across the whole app |
| `Max-Age` | ~30 days (rolling) | Matches the ~30-day rolling session; refreshed on activity |

## Lifecycle

- **Set** on successful `POST /api/auth/signin`.
- **Refreshed**: on each authenticated request that validates the session, the server rolls
  `Session.expiresAt` forward and re-issues the cookie with a fresh `Max-Age`.
- **Cleared** on `POST /api/auth/signout` (and whenever a session is found invalid/expired)
  by setting `pt_session` with an expired/`Max-Age=0` value.

## Validation flow

1. **Edge middleware** (`middleware.ts`): checks only for the *presence* of `pt_session` on
   protected paths; redirects to `/signin` if absent. No DB access (Edge runtime limit).
2. **Server (Node runtime)**: re-derives the keyed HMAC of the cookie token (using
   `AUTH_SECRET`), looks up the `Session` by `tokenHash`, rejects if missing or
   `expiresAt` is in the past, otherwise loads the owner and rolls the expiry. This is the
   authoritative check for pages (in the `(app)` layout) and for protected API routes.

## Security notes

- The raw token never touches the database; a database leak cannot reproduce a usable
  session without also knowing `AUTH_SECRET` (the HMAC key). Rotating `AUTH_SECRET`
  invalidates all existing sessions.
- A forged or stale cookie that passes the edge presence check still fails server-side
  validation (defense in depth).
- The cookie is `HttpOnly` + `Secure` + `SameSite=Lax` by default.
