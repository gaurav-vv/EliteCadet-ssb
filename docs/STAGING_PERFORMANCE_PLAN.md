# Staging performance verification plan

Purpose: turn the estimates in `docs/PERFORMANCE_REPORT.md` section 2 into measurements, on an
environment that resembles production, without touching production. Nothing here has been run yet:
no staging environment or staging test accounts exist today.

## What staging must be

- A **separate** Supabase project (not the production project `ibdlhzdrchcggmtnwbyj`), created in the
  same region as production, with every migration `0001`-`0033` applied.
- The app deployed from this branch to a separate hosting project (a Vercel preview or a second
  Vercel project) in the same region as production, pointing at the staging Supabase.
- Test data only: one academy with a batch, a mentor, about a dozen students, three reviewed
  assessments and a few sessions, plus a **second academy** with its own people (for isolation).
- Four dedicated test accounts (student, mentor, academy admin, super admin) and the second academy's
  names as isolation markers. No real person's data.

## Access the owner needs to provide (never in chat or Git)

| Need | Where it goes |
|---|---|
| Staging Supabase URL and its **public** anon/publishable key | `tests/performance/.env.perf` (`PERF_SUPABASE_URL`, `PERF_SUPABASE_ANON_KEY`) |
| Passwords of the four staging test accounts | `.env.perf` (`PERF_*_EMAIL/_PASSWORD`) |
| Names of the second academy's people, and the student's classmates | `.env.perf` (`PERF_FOREIGN_MARKERS`, `PERF_PEER_MARKERS`) |
| Staging site URL | `--base` on the command line |
| The region of the production app, and of the production Supabase project | the staging plan's "same region" requirement |
| (optional) a Postgres connection string for staging | enables `EXPLAIN (ANALYZE, BUFFERS)` of the dashboard queries |

The seed script refuses non-local databases on purpose; staging data is created by the owner (or by a
staging seed written and reviewed separately), not by the load tool.

## Runs, in order (stop at the first failure)

Every command uses `--env staging`, which only accepts a remote URL and enforces the configured
limits (50 users, 50 req/s by default, automatic stop on 429, error rate, or p95).

1. **Smoke, 1 user** (checks access and data):
   `npm run perf:auth -- --env staging --base https://<staging> --levels 1 --duration 30`
2. **Per-operation round trips** (the hosted numbers that replace the estimates):
   `npm run perf:supabase -- --env staging --base https://<staging>`
3. **Browser journeys** (login to dashboard, navigation, LCP, CLS, interaction, JS size):
   `PERF_TARGET=staging PERF_BASE_URL=https://<staging> npm run perf:browser`
4. **Progressive concurrency** (only if steps 1-3 are clean):
   `npm run perf:auth -- --env staging --base https://<staging> --levels 1,5,10,25 --duration 60 --ramp 15 --max-rps 50`
5. **Isolation and authorization**: reported by the same `perf:auth` run (each role refused on other
   workspaces; no other-academy names; no classmate names).
6. **Session security**: needs a staging service key, so it is **not** run on staging. It was run
   locally (`npm run perf:security`); see `docs/SESSION_REVOCATION.md`.

## What to record

Per role: login-to-dashboard, hard dashboard load (TTFB), JavaScript KB, sidebar navigation median and
max, back/forward, LCP, CLS, interaction duration, long tasks, requests per load. Per concurrency level:
requests, requests/second, p50/p90/p95/p99, errors, timeouts, stop reason. From `perf:supabase`: Auth
`getUser()`, profile read, unread count, refresh and sign-out round trips. Always with the date,
region, hosting plan and the commit under test.

## Pass criteria (set before running, so they are not fitted to the result)

| Measure | Criterion |
|---|---|
| Errors / timeouts at 1, 5, 10 users | 0 |
| Error rate at 25 users | under 1% with no automatic stop |
| Isolation and authorization checks | all pass; any failure is a release blocker |
| Dashboard hard load, p50, student/mentor/academy/admin | under 2.5 s (matches the LCP target) |
| Sidebar navigation median | under 1 s |
| LCP, CLS | LCP at most 2.5 s, CLS at most 0.1 (lab values only) |
| p95 of authenticated pages at 10 users | recorded; the target is set from the 1-user baseline, no more than 3x |
| Hosted Auth `getUser()` versus profile read | recorded, to confirm the saving the changes assumed |

Lab results from one runner are not field data and are never reported as Core Web Vitals.

## Not allowed

Writes, password logins per virtual user, traffic above the configured limits, any run against the
production project, and any key other than the public one in the tool.
