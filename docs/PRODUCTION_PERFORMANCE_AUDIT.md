# Production performance audit

Written 2026-11-14. Everything here was measured on **one Windows PC** (about 8 GB RAM, often under 1 GB free) running
the app (production build), a local Supabase stack in Docker and the test client together. Nothing was run against
the hosted Supabase project or the live website. Numbers from this PC compare one version of the code with another;
they are **not** capacity figures and say nothing about real users' phones, networks or your hosting regions.

Every figure is labelled **Measured** (I ran it), **Prior** (an earlier run in `docs/PERFORMANCE_REPORT.md`, not
re-run) or **Estimated** (reasoned, not measured). Estimates are never mixed into the measured tables.

## The short answers

| Question | Answer |
|---|---|
| Why is login slow? | **Not proven yet.** Locally a warm login takes about 1.2 to 1.6 s, so most of the slowness you see is probably *distance*: your region, Supabase's region and Vercel's region. Each step in a login is a separate network round trip, and one earlier measurement from Delhi put a single Supabase call at about 170 to 200 ms. I need the two regions to confirm (see "What I still need"). |
| Which operation uses the most time? | Measured locally: the **academy dashboard's data read** (`student_progress`, 2.7 s for a 300-student academy, now 0.8 s), then cold server starts (the first student login after a restart took 5 to 12 s). Student dashboard: it makes 12 data requests in about 2 round trips (Prior). |
| How much time can realistically be saved? | Measured so far: academy dashboard 1.9 s faster, academy performance page 2.6 s faster (large academy); login and navigation work cut by 40 to 100 percent of prefetch requests. The biggest remaining saving is region alignment, **estimated** at several hundred ms per login if the regions differ; it can only be measured once you give me the regions. |
| Is Redis necessary? | **No, not now.** See `docs/PRODUCTION_SCALING_PLAN.md`. The slow parts were query shape and request volume, both fixed without a cache, and the data is per-user and security-sensitive. |
| Can the current architecture handle 100 concurrent users? | **Unknown.** The only concurrency tested is up to **25 users** on one PC (Prior, 2026-10-29); it saturated near 8 to 12 requests per second, which is a limit of that PC. No test has been run against a staging copy. |
| What is the maximum concurrency actually tested? | **25 concurrent users** (Prior, local, 4 roles). Not 100. Not on hosting. |
| What must change before launch? | See "Before production launch" at the end. |

## How a login works today (verified in the code)

1. Browser asks Vercel for `/login` (server-rendered on demand; skips Supabase when there is no auth cookie).
2. Browser sends the email and password **straight to Supabase Auth** (`/auth/v1/token`).
3. Browser reads the user's profile **straight from Supabase** to learn the role and to catch suspended accounts.
4. Browser asks Vercel for the dashboard. The proxy checks the token locally (no network call), reads the profile
   **again** on the server (the route's role check), then the layout and page read what they need.
5. Dashboard content streams in.

Steps 2 and 3 are two sequential browser-to-Supabase trips; step 4 is a browser-to-Vercel trip plus server-to-Supabase
trips. If the browser, Vercel and Supabase are in three different places, every step pays a long round trip.

### Login stages, local (Measured, production build, local Supabase, empty accounts)

All times in ms from the click on "Log in", median of 3 warm runs; the first run after a server start is shown separately.

| Role | Sign-in answered | Profile read done | Dashboard URL | Content visible | All requests settled | First run after restart: URL / settled |
|---|---:|---:|---:|---:|---:|---:|
| Student | 524 | 681 | 1,502 | 1,646 | 3,459 | 8,673 / 17,808 |
| Mentor | 400 | 811 | 1,392 | 1,518 | 2,654 | 1,555 / 2,881 |
| Academy admin | 358 | 491 | 1,170 | 1,304 | 2,488 | 1,332 / 2,671 |
| Admin | 357 | 467 | 1,023 | 1,167 | 2,250 | 1,145 / 2,468 |

The login page itself: 20 to 40 ms to first byte when warm. These times use a database in the same machine, so they
show the **work** a login does, not the **waiting** a real user does; the waiting is what the regions decide.

### What a login triggers, before and after my changes (Measured, per login)

| | Before | After |
|---|---:|---:|
| Times the dashboard is rendered | 2 | 1 |
| Prefetch requests, student / mentor / academy / admin | 37 / 19 / 27 / 26 | 2 / 0 / 0 / 0 |
| Database calls made by the Next server, student / mentor / academy / admin | 61 / 28 / 56 / 43 | 34 / 13 / 29 / 25 (after the sidebar change; not re-captured after the second) |

Why it matters: every workspace page is rendered per request, so each prefetch was a full server render (profile read,
layout reads, page data). **Estimated** (from the request counts above) at roughly 8 to 10 times the server work per page view, all of it competing with the page the
person actually opened, and a direct multiplier on load with many users.

## Dashboards

Counts below are from reading the code unless marked Measured.

| Dashboard | Data requests | Shape | Notes |
|---|---|---|---|
| Student | 12 (Measured by `dashboard-request-budget.test.ts`) | longest chain about 1.6 to 1.8 round trips | slowest login in earlier runs; needs seeded student data to profile further |
| Mentor | about 7, in two stages (inspection) | list of mentor's students limited to 500 | scores read now paged (see below) |
| Academy admin | 15 or more (inspection) | performance read pulls every student, progress row and reviewed score of the academy | the one that grows with academy size: see next section |
| Admin / super admin | platform overview (inspection) | aggregate reads | not profiled with volume yet |

## Database findings (Measured with `EXPLAIN (ANALYZE, BUFFERS)` as the academy admin)

Data: one academy of 300 students, 12 batches, 8 mentors, 72 assessments, 1,800 attempts, 1,435 reviewed scores,
120 sessions, 2,400 attendance rows (`npm run perf:seed-dashboards`). Local only.

### 1. `student_progress` was O(students x subqueries)  (fixed, migration 0036)

| | Before | After |
|---|---:|---:|
| `EXPLAIN` execution, all columns | 6,292 ms | 955 to 1,735 ms (3 runs) |
| The app's exact request through the data API | 2,658 to 2,695 ms | 754 to 914 ms |
| Academy dashboard page, content finished | 3.5 to 3.9 s | 1.5 to 2.0 s |
| Academy performance page, content finished | 3.9 to 5.0 s | 1.3 to 1.65 s |
| A single student's row | about 13 to 21 ms | unchanged |

Cause: the view ran eight correlated subqueries per student, and the score count and score average each re-read the
score view, which re-checks the assessments access policy on every row (about 785,000 buffer hits). It now reads each
table once in a grouped pass. An md5 of every row returned to an academy admin (300 rows), a mentor (50) and a student
(1) is **identical before and after**, so the numbers shown are unchanged.

### 2. A silent 1,000-row cut-off made the academy numbers wrong  (fixed in code)

Supabase's data API returns at most 1,000 rows per request and does not fail beyond that: it answers HTTP 206 with the
first 1,000. The academy performance read asked for every reviewed score without paging, so an academy with more than
1,000 reviewed scores was averaged on part of its data. Measured: one request returned **1,000 of 1,435** scores.
The same read now pages (`lib/supabase/read-all.ts`); the page shows **Reviewed 1,435** and **Average 65.7 percent**,
equal to the database's totals, where the old code would have shown 1,000. A regression test covers it.

### 3. What is left in that query (not changed)

About 0.75 s remains: the score and attendance reads each spend roughly 0.35 to 0.4 s re-checking row-level-security
policies row by row (policy functions are evaluated per row). Reducing it means rewriting access policies, which must be
reviewed for security, so it is a separate, careful change (see the scaling plan). `student_scores` (all rows, 1,435)
takes about 0.27 s and `academy_students` about 0.03 to 0.07 s.

## Changes made (local branches; nothing pushed, merged or deployed)

| Branch | Change | Evidence |
|---|---|---|
| `perf/login-and-prefetch` | Login no longer calls `router.refresh()` after `router.push()` (it rendered the dashboard twice). Links to workspace pages prefetch on hover, focus or touch instead of on sight. | table above; 1,002 tests, lint, typecheck, build pass; 10 browser login-flow tests pass |
| `perf/dashboard-queries` | Migration `0036` (single-pass `student_progress`); paged reads for the academy performance scores/progress/students/assessments and the mentor dashboard's scores; local seed harness | EXPLAIN and page timings above; identical-results checksums; regression test |

## What I decided not to do

**Moving the login profile read to the server** (item 3 of the approved plan) is **not implemented**, deliberately. The
browser's profile read exists to choose the dashboard and show suspended accounts before navigating. Doing it on the
server needs an extra browser-to-Vercel hop (a redirect page) to replace one browser-to-Supabase hop, so it swaps one
long round trip for another of similar length, and the proxy already blocks suspended accounts on the next request.
Estimated effect: roughly zero, possibly slightly worse, until the regions are known. A real saving needs the role in
the login token (a Supabase auth hook, which is a production setting change I must not make unasked) or region alignment.
It can be revisited with real region data.

## What I still need

1. Your **Supabase project region** and **Vercel function region**. Without them I cannot say which hop dominates.
2. Approval for a few unauthenticated page loads of the live `/login`: the `x-vercel-id` header names the serving region.
3. A **staging** Supabase project and Vercel preview, and a second machine to generate load.

## Before production launch

1. Apply migrations to the hosted database in order (`0034`, `0035`, `0036` are local only), following `docs/MIGRATION_READINESS.md`.
2. Align the Vercel function region with the Supabase region (a project setting you approve).
3. Check the hosted email setup (custom SMTP, Site URL, Redirect URLs); see `docs/email.md`.
4. Run the staged load test in `docs/PRODUCTION_SCALING_PLAN.md` and read the real numbers before claiming 100 users.
5. Decide on the one-hour token revocation window (`docs/PERFORMANCE.md`).

## Limits of this audit

- One PC under memory pressure: timings vary by tens of percent run to run; I report ranges, not single numbers.
- No real-network, mobile or field data; no Core Web Vitals field data. Earlier lab CLS was 0 (Prior).
- Student and mentor dashboards were not profiled with seeded data beyond the shared `student_progress` view.
- The gateway log counter used for database-call counts returned 0 in the final runs; the cause is unresolved, so the
  database-call saving of the second prefetch change is expected but not measured.
