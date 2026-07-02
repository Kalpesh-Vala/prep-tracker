# Prep Tracker

A personal, single-user platform for tracking six months of interview preparation. This
repository is also a flagship engineering project: it is built to demonstrate
production-grade practices (clean structure, tests, security-by-default, serverless-aware
architecture) to a reviewer.

This first slice — the **Foundation Shell** — delivers a secure, navigable, deployable
shell: sign in, see a persistent navigation layout (Dashboard, Daily Log, DSA, Weekly
Review), stay signed in across reloads, and sign out. Tracker features come in later slices.

## Tech stack

- **Next.js** (App Router) + **React**, **TypeScript** (strict mode)
- **MongoDB Atlas** via **Mongoose** (serverless-safe cached connection)
- **Tailwind CSS** for the UI
- **Vercel** for serverless deployment
- **Vitest** + **mongodb-memory-server** for tests
- Custom single-user auth: scrypt-hashed credentials, server-side sessions, HMAC-keyed
  session tokens in an httpOnly cookie

## Project structure

```text
app/            Routes + API route handlers (app/api/auth/*)
  (app)/        Authenticated route group (server-side guarded) + placeholder pages
  signin/       Public sign-in page
components/     Reusable UI (AppShell, Sidebar, SignInForm)
lib/            Shared logic (db connection, auth, rate limiting, env, http helpers)
models/         Mongoose schemas (User, Session, LoginAttempt, DailyLog, DsaProblem, WeeklyReview)
types/          Shared TypeScript types
middleware.ts   Edge cookie-presence redirect for protected pages
scripts/        One-off scripts (seed the single owner)
tests/          Unit + integration tests
```

## Environment variables

Copy [.env.example](.env.example) to `.env.local` and fill in:

| Variable         | Description                                                                    |
| ---------------- | ------------------------------------------------------------------------------ |
| `MONGODB_URI`    | MongoDB Atlas connection string                                                |
| `AUTH_SECRET`    | Random secret; HMAC key for hashing session tokens (`openssl rand -base64 32`) |
| `OWNER_USERNAME` | Owner username (seed only)                                                     |
| `OWNER_EMAIL`    | Owner email (seed only)                                                        |
| `OWNER_PASSWORD` | Owner password (seed only)                                                     |

Secrets are never committed; `.env*` files are git-ignored.

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run seed                 # provision the single owner (run once)
npm run dev                  # http://localhost:3000
```

## Running tests

```bash
npm test          # Vitest: unit + integration (in-memory MongoDB, no network)
npm run lint      # ESLint
npm run format    # Prettier
npm run typecheck # tsc --noEmit (strict)
```

## Daily Log feature

The **Daily Log** is the first tracker slice. It captures one entry per calendar day —
enforced by a unique index on a normalized (midnight-UTC) date, so a day can never be
duplicated and past entries are never overwritten or silently lost.

Each entry records: date, study hours (0–24, at most one decimal), a learning summary,
DSA problems solved, whether revision was completed, the biggest challenge, the next-day
goal, and an optional energy level (`low` / `medium` / `high`). Entries are created for
today (or a backfilled past date — future dates are rejected), viewed individually, edited
in place (the date is immutable), and browsed newest-first.

### Endpoints (`app/api/daily-log`)

| Method & path              | Purpose                                    | Success |
| -------------------------- | ------------------------------------------ | ------- |
| `POST /api/daily-log`      | Create today's / a backfilled entry        | `201`   |
| `GET /api/daily-log`       | List entries newest-first (paginated)      | `200`   |
| `GET /api/daily-log/:id`   | Fetch a single entry                       | `200`   |
| `PATCH /api/daily-log/:id` | Update an entry in place (date immutable)  | `200`   |

All endpoints require a valid session and use the shared `{ data }` / `{ error }` envelope.
Server-side validation rejects invalid input with `400`; a duplicate date returns
`409 DUPLICATE_DATE`. See
[specs/002-daily-log/contracts/daily-log-api.md](specs/002-daily-log/contracts/daily-log-api.md).

## DSA Tracker feature

The **DSA Tracker** logs every practiced data-structures-and-algorithms problem. Each entry is
an independent **practice record** (the same title may recur as first attempt + revisits), and
counts are over records.

Each record captures: title, topic (+ optional subtopic), difficulty (`easy`/`medium`/`hard`),
platform, time taken (whole minutes > 0), attempt type (`first_attempt`/`revisit`),
solved-without-hints, time/space complexity, confidence (1–5), needs-revision, interview-worthy,
and a solved-on date (defaults to today, past allowed, future rejected). Topics are normalized
(trimmed, case-insensitive) for consistent grouping and filtering.

### Endpoints (`app/api/dsa`)

| Method & path            | Purpose                                             | Success |
| ------------------------ | --------------------------------------------------- | ------- |
| `POST /api/dsa`          | Create a problem record                             | `201`   |
| `GET /api/dsa`           | List newest-first; filter by topic/difficulty/needsRevision/interviewWorthy; paginated | `200` |
| `GET /api/dsa/:id`       | Fetch a single record                               | `200`   |
| `PATCH /api/dsa/:id`     | Update a record in place                            | `200`   |
| `DELETE /api/dsa/:id`    | Permanently delete a record (UI-confirmed)          | `200`   |
| `GET /api/dsa/summary`   | Global insights: total, per-topic & per-difficulty counts, weak topics | `200` |

**Weak-topic logic**: topics are ranked by lowest average confidence first, ties broken by higher
needs-revision count, then alphabetically by topic — computed over **all** records regardless of
active list filters. All endpoints require a valid session and use the shared `{ data }` / `{ error }`
envelope with `400`/`401`/`404` as appropriate. See
[specs/003-dsa-tracker/contracts/dsa-api.md](specs/003-dsa-tracker/contracts/dsa-api.md).

## Weekly Review feature

The **Weekly Review** captures one structured retrospective per week over the 26-week prep. A week is
identified by its **week number (1–26)**; the app derives that week's **Monday–Sunday (UTC)** date
range from a documented `PREP_START_DATE` anchor, and uses that range for prefill. **One review per
week** is enforced by a unique index on `weekNumber` (duplicate create → `409`). There is no delete.

Each review captures: planned vs. actually-completed work, total study hours, problems solved, an
optional self-assessed DSA success rate (0–100), weak topics (list), wins, and next-week adjustments.
The list is newest-week first and surfaces each week's weak topics and wins as a trend.

**Prefill** (`GET /api/weekly-review/prefill?weekNumber=N`) suggests the week's study hours (summed
from Daily Log entries in range) and problems solved (counted from DSA entries in range), plus
suggested weak topics (reusing the DSA weak-topic rule). It is **suggestion-only and read-only** — it
never creates or overwrites a review, and confirmed totals are stored as a **snapshot** that does not
change when the underlying Daily Log/DSA data later changes. A true DSA success rate is not derivable
from stored data (only solved problems are recorded), so prefill returns it as `null` with a note.

### Endpoints (`app/api/weekly-review`)

| Method & path                     | Purpose                                          | Success |
| --------------------------------- | ------------------------------------------------ | ------- |
| `POST /api/weekly-review`         | Create a review for a week                       | `201`   |
| `GET /api/weekly-review`          | List reviews newest-week first (paginated)       | `200`   |
| `GET /api/weekly-review/:id`      | Fetch a single review                            | `200`   |
| `PATCH /api/weekly-review/:id`    | Update a review in place (week identity immutable) | `200` |
| `GET /api/weekly-review/prefill`  | Suggested totals for a week (read-only)          | `200`   |

All endpoints require a valid session and use the shared `{ data }` / `{ error }` envelope; a
duplicate week returns `409 DUPLICATE_WEEK`. See
[specs/004-weekly-review/contracts/weekly-review-api.md](specs/004-weekly-review/contracts/weekly-review-api.md).

## Dashboard feature

The **Dashboard** is the authenticated home screen (`/dashboard`, where sign-in and the app root
land). It is a **read-only aggregate** — no new collection — recomputed on every load from the Daily
Log, DSA, and Weekly Review data, so it never shows stale values.

It shows: overall completion %, current week (1–26), total study hours vs the 936-hour target with a
progress bar, the current study streak, all-time and this-week DSA problems solved, this week's goals
(from the current week's Weekly Review), and quick links to the three trackers.

**Formulas** (centralized in `lib/dashboard.ts`, pure and unit-tested):

- **Completion %** = `round(currentWeek / 26 * 100)`, clamped 0–100 (elapsed program time).
- **Current week** = today mapped to the canonical Monday–Sunday UTC week from `PREP_START_DATE`
  (shared with Weekly Review), clamped 1–26.
- **Hours %** = `min(100, round(totalStudyHours / 936 * 100))`; the raw total is preserved.
- **Streak** = consecutive UTC days with a daily log where `studyHours > 0`, ending **today or
  yesterday**; `0` otherwise. A zero-hours day breaks the streak.

### Endpoint (`app/api/dashboard`)

| Method & path                 | Purpose                                   | Success |
| ----------------------------- | ----------------------------------------- | ------- |
| `GET /api/dashboard/summary`  | All dashboard metrics in one response      | `200`   |

The endpoint is session-guarded, read-only, and returns zeros/empty (`weeklyGoalsStatus: 'not_set'`)
for an empty dataset without error. See
[specs/005-dashboard/contracts/dashboard-api.md](specs/005-dashboard/contracts/dashboard-api.md).

## Deploying to Vercel

1. Import the repository into Vercel.
2. Add Environment Variables in the Vercel project: `MONGODB_URI`, `AUTH_SECRET`.
3. Provision the owner against the production database once (run `npm run seed` locally
   with `MONGODB_URI` pointed at the production cluster, plus the `OWNER_*` variables).
4. Deploy, open the hosted URL, and you will land on the sign-in page.

## Validation

See [specs/001-foundation-shell/quickstart.md](specs/001-foundation-shell/quickstart.md),
[specs/002-daily-log/quickstart.md](specs/002-daily-log/quickstart.md),
[specs/003-dsa-tracker/quickstart.md](specs/003-dsa-tracker/quickstart.md), and
[specs/004-weekly-review/quickstart.md](specs/004-weekly-review/quickstart.md), and
[specs/005-dashboard/quickstart.md](specs/005-dashboard/quickstart.md) for end-to-end
validation scenarios mapped to each feature's acceptance criteria.
