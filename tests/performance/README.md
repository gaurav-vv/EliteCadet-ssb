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

## Not covered yet

Browser-level LCP/CLS/INP and route-transition timing, logout from the UI, mutations (use local/staging
only), and concurrency levels above 10 against anything but a local build.
