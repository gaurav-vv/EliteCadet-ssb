# Performance report: 2026-10-29

Branch `perf/auth-and-dashboard-requests`. Everything below was measured on one Windows machine
running the app (production build), local Supabase (Docker, all 33 migrations) and the test client
together. They compete for the same CPU, so these numbers compare releases; they are not capacity
figures and say nothing about production or about real users' devices and networks. Nothing was run
against the hosted database or the production site.

Raw sanitised results are in `tests/performance/reports/` (git-ignored); reproduce them with
`tests/performance/README.md`.

## 1. Measured

### Dashboard requests (real services, counting fake client, 30 ms per call, 3 runs each)

| | Supabase calls | Longest dependent chain |
|---|---:|---:|
| Before | 15 | about 3.4 to 4.1 round trips |
| After | 12 | about 1.6 to 1.8 round trips |

The fake client returns empty data, so reads that only happen when data exists (the Library suggestion
for a weak area) are not counted. This is a call-count and ordering measurement, not real latency.
It is a permanent test (`tests/unit/lib/dashboard-request-budget.test.ts`).

### JavaScript on the dashboard (compressed bytes on the wire, headless Chromium, one run each)

| Dashboard | Before | After |
|---|---:|---:|
| Student | 297 KB | 199 KB (-98 KB, -33%) |
| Academy | 297 KB | 298 KB (unchanged: it draws the chart, so the chunk still loads, off the critical path) |
| Mentor | 208 KB | 208 KB |
| Admin | 219 KB | 219 KB |

Both charts still render after lazy loading, with layout shift 0 (`student /student/progress`, `academy /academy`).

### Authenticated load (4 roles, read-only page walks, 20 s per level, 0 errors, 0 timeouts, no automatic stop)

| Users | Requests | req/s | p50 | p95 | p99 |
|---:|---:|---:|---:|---:|---:|
| 1 (student only) | 99 | 4.6 | 126 ms | 392 ms | 2117 ms (<100 samples: about the max) |
| 5 | 200 | 8.1 | 442 ms | 1046 ms | 1404 ms |
| 10 | 210 | 8.6 | 863 ms | 2183 ms | 2806 ms |
| 25 | 374 | 12.4 | 1303 ms | 3361 ms | 4228 ms |

Throughput flattens near 8 to 12 requests/second while latency grows with users: the single machine
is saturated. A second run earlier the same day gave p50 118 / 289 / 782 / 1566 ms for 1 / 5 / 10 / 25
users, so run-to-run spread on this machine is large and small differences between runs mean nothing.
Each role signs in once and its virtual users share that session.

Checks in every level: every workspace page answered 200 for its own role (90 / 181 / 190 / 338 pages);
every role was redirected to `/forbidden` on another workspace; no page showed the second academy's
people or a student's classmates (the check can detect them: the super admin does see them on
`/admin/users`).

### Public and anonymous access (15 s per level, 0 errors)

Public pages: p50 26 / 34 / 38 ms, p95 50 / 132 / 146 ms for 1 / 5 / 10 users. All 1704 protected-route
requests from anonymous or invalid-session visitors redirected to `/login`.

### Browser journeys (one Chromium run per role, lab data)

| Role | Login to dashboard | Hard dashboard load (TTFB) | Sidebar nav median | Back / forward | LCP | CLS | Interaction (INP-style) | Long tasks |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Student | 4527 ms | 6223 ms (2123) | 960 ms | 173 / 88 ms | 1484 ms | 0 | 160 ms | 6 |
| Mentor | 2532 ms | 2190 ms (194) | 500 ms | 29 / 24 ms | 356 ms | 0 | 56 ms | 1 |
| Academy | 2117 ms | 937 ms (365) | 519 ms | 38 / 43 ms | 360 ms | 0 | 64 ms | 2 |
| Admin | 1548 ms | 456 ms (180) | 460 ms | 42 / 66 ms | 344 ms | 0 | 64 ms | 0 |

Zero failed requests and zero JavaScript errors in all four. The student journey is the slowest and the
most variable (its first run after a server start took 12.4 s to the dashboard; warm runs 4.3 to 4.5 s),
and one student run in about eight failed for a reason that was not captured and has not reproduced in
five reruns; the journey now records the step it was in if that happens again. These are single samples:
they show what to look at, not a pass or fail. **This is not a Core Web Vitals result**: it is one lab
browser on one machine, with no field data and no INP from real interactions.

### Session security (local stack, which issues ES256 tokens like the hosted project's JWKS)

- Altered payloads and corrupted signatures: rejected by `getClaims()`.
- Genuine, expired, foreign-key and unknown-key tokens: handled correctly with the real SDK and a generated
  key pair (7 integration tests); the signing keys are fetched once and cached, and `/auth/v1/user` is never called.
- **After a global sign-out, `getUser()` rejects the old token but `getClaims()` still accepts it until it
  expires** (1 hour here). This is the cost of local verification. No feature of the app revokes server
  sessions today, so it matters only for a stolen token or a future "sign out everywhere".
- Suspending an account takes effect on the very next profile read (the proxy and layout read `profiles`
  every request); the token alone never carries status.

### Per-operation Supabase round trips (local stack, noisy)

Auth `getUser()` p50 17 ms and 33 ms in two runs, versus a profile read of 18 and 36 ms: the call
`getClaims()` removes costs about as much as one profile read. Against the hosted project from Delhi
the earlier measurement was about 200 ms for the Auth call and 167 ms for a profile read.

### Migrations

`0028` to `0033` applied cleanly to a real PostgreSQL 17 (local), and `0027_mentor_onboarding` is idempotent.

## 2. Estimated, not measured

- On the hosted project the proxy and layout now skip two Auth round trips per navigation, about
  200 ms each from Delhi at the earlier 200 ms Auth latency: roughly 400 ms per protected navigation.
  Not measured against hosted Supabase (no test account there).
- The unread-badge change removes one sequential round trip per navigation (about 165 ms hosted).
- Parallel progress, assessments and sessions reads should cut the student dashboard's data wait by about
  two round trips; measured only as call ordering (above).
- The single-assessment pages (mentor and student) now run two reads together, saving one round trip each.
- Lazy charts take recharts off the main thread's initial work on the academy dashboard; the effect on
  hydration time was not measured.

## 3. Not tested

Anything against the hosted Supabase or the production site (authenticated or not); Core Web Vitals in
the field; mobile devices and slow networks; production-like hardware and real capacity; the effect of the
Vercel region versus the database region; concurrency above 25; logout from the UI; mutating journeys
(writes); PostgreSQL execution plans (no `EXPLAIN` was run, so the FK indexes are justified by schema
analysis, not measured gains); the meeting room under load (LiveKit); the student dashboard's Library
suggestion path (needs a weak area in the seed data).

## 4. Next steps by impact

1. Run `perf:supabase` and `perf:auth` against a **staging** copy hosted near the production region, to turn the
   estimates in section 2 into measurements.
2. Investigate the student dashboard in the browser (TTFB 2.1 s, 6 long tasks): it is the slowest journey.
3. Check where Vercel runs versus the Supabase region before tuning further; every sequential call costs a
   full round trip.
4. Decide whether the 1-hour revocation window is acceptable, or add `getUser()` on any future
   "sign out everywhere" path.
5. After a production smoke test is approved, compare a single user's real login and dashboard times.
