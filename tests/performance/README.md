# Performance testing

Repeatable, dependency-free load and latency checks for EliteCadet. Plain Node (no k6, no hosted
service); the Supabase sign-in uses `@supabase/ssr`, which the app already depends on.

## Safety rules (enforced in `lib/config.mjs`)

- A target is always named: `--env local|staging|production` plus `--base <url>`. Nothing defaults to a live site.
- `--env local` only accepts localhost; staging/production only accept remote URLs.
- **Production is smoke-only**: 1 user, 1 request/second, 60 s. It also needs
  `PERF_ALLOW_PRODUCTION=smoke`, set by a person who approved it. Raising the limits needs both
  `--raise-production-limits` and `PERF_PRODUCTION_APPROVED_BY`, and is not part of any default command.
- A level stops on a 429 (it reports Retry-After), on an error rate over `--max-error-rate`, or on p95
  over `--max-p95-ms`. A failed request is never retried.
- Reports are sanitised (JWTs, Supabase keys, bearer tokens, session cookies, passwords removed) and
  `reports/*` is git-ignored.
- Only the **public** Supabase key is used. Never put a service-role key here.

## Commands

```bash
npm run build && PORT=3100 npm run start        # in one terminal: production build of the app

# no accounts needed
npm run perf:public   -- --env local --base http://127.0.0.1:3100 --levels 1,5,10 --duration 20
npm run perf:boundary -- --env local --base http://127.0.0.1:3100 --levels 1,5 --duration 20

# needs test accounts (below)
npm run perf:supabase -- --env local --base http://127.0.0.1:3100
npm run perf:auth     -- --env local --base http://127.0.0.1:3100 --levels 1,5 --duration 30
```

Production low-rate smoke (only after approval):

```bash
PERF_ALLOW_PRODUCTION=smoke npm run perf:public -- --env production --base https://<site> --levels 1 --duration 30
```

## Local authenticated workflow (recommended; no real accounts, no hosted data)

```bash
# 1. Docker running, then the local Supabase (applies pending migrations; never resets):
npx supabase start -x edge-runtime,logflare,vector,imgproxy,realtime,storage-api,supavisor
npx supabase migration up

# 2. Seed one account per role + a second academy (for isolation checks) + realistic data.
#    Writes tests/performance/.env.perf (git-ignored). Refuses any non-local Supabase.
npm run perf:seed-local

# 3. Build and serve a PRODUCTION build against the local stack (port 3100), in its own terminal:
npm run perf:serve-local

# 4. Measure
npm run perf:supabase -- --env local --base http://127.0.0.1:3100
npm run perf:auth     -- --env local --base http://127.0.0.1:3100 --levels 1,5,10,25 --duration 20 --ramp 5 --max-rps 150
PERF_TARGET=local PERF_BASE_URL=http://127.0.0.1:3100 npm run perf:browser
npm run perf:security
```

Notes: each role signs in once per run and its virtual users share that session (otherwise the
ramp would measure the Auth sign-in rate limit). Everything runs on one machine, so the app, the
database and the client compete for the same CPU: use the results to compare releases, not as a
capacity figure. Isolation is checked against names that exist only in the second academy, and
against a student's classmates; seeing your own mentor, mentees or academy is legitimate.

## Test accounts (never real users)

Create dedicated accounts, one per role, in a **local or staging** Supabase. Put the values in
`tests/performance/.env.perf` (git-ignored) or the shell environment:

```
PERF_SUPABASE_URL=...        PERF_SUPABASE_ANON_KEY=...        # public key only
PERF_STUDENT_EMAIL=...       PERF_STUDENT_PASSWORD=...       PERF_STUDENT_NAME=<display name>
PERF_MENTOR_EMAIL=...        PERF_MENTOR_PASSWORD=...        PERF_MENTOR_NAME=...
PERF_ACADEMY_EMAIL=...       PERF_ACADEMY_PASSWORD=...       PERF_ACADEMY_NAME=...
PERF_ADMIN_EMAIL=...         PERF_ADMIN_PASSWORD=...         PERF_ADMIN_NAME=...
```

Each virtual user signs in once, then walks its workspace; the `_NAME` values let the run check that no
page shows another account's name, and that each role is refused on the other workspaces.

## What each scenario measures

| Scenario | Needs | Measures |
|---|---|---|
| `public` | nothing | landing and public pages, repeat-request caching, bytes |
| `boundary` | nothing | anonymous and invalid-session access to every protected workspace redirects to /login |
| `supabase-latency` | public key (+ account) | Auth health, JWKS, REST reads, `getUser()` round trip, profile lookups, refresh, sign-out. HTTP round trips, not PostgreSQL execution time |
| `authenticated` | accounts | every workspace page per role, authorization refusals, isolation |

Request counts and the critical path of the student dashboard are guarded by the unit test
`tests/unit/lib/dashboard-request-budget.test.ts`.

## Browser journeys and session security

`perf:browser` signs in through the real form and records, per role: login-to-dashboard time,
a hard dashboard load (TTFB, JS KB on the wire), sidebar navigation and back/forward times, LCP,
CLS, interaction duration (INP-style), long tasks, failed requests and JS errors. Readiness is the
workspace `<h1>`, never the load event. Vitals are recorded, not asserted: one lab run on one
machine is not a Core Web Vitals pass. `perf:security` tries, against the local stack, what
`getClaims()` does and does not protect (see docs/PERFORMANCE.md).

## Not covered yet

Logout from the UI, mutations (use local/staging only), field (real-user) data, any hosted or
production authenticated run, and capacity on production-like hardware.
