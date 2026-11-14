# Production scaling plan: 100 concurrent users

Companion to `docs/PRODUCTION_PERFORMANCE_AUDIT.md`. Read that first for what was measured and what was not.
Honest status: **100-user readiness is not demonstrated.** The most that has been tested is 25 users, on one PC.

## Recommended architecture (no new infrastructure)

```
 Browser (India)
    |  1. page + RSC requests            2. sign-in and profile (direct)
    v                                          |
 Vercel (Next.js, server components)           |
    |  server-side reads (RLS as the user)     |
    v                                          v
 Supabase API gateway  ------------------->  Supabase Auth
    |
    v
 Postgres (single project, same region as Vercel)
```

Nothing more is justified by the evidence: no Redis, no queue, no separate API service. The app is mostly per-user
reads behind row-level security on one Postgres database; the measured problems were query shape and request volume.

### The one setting that probably matters most (estimated until confirmed)

Put **Vercel's function region next to the Supabase region** (project settings, no code). Every server-side read in a
dashboard is a round trip; with the regions apart each one costs an ocean crossing, and a dashboard makes 12 to 15 of
them in 2 to 3 sequential stages. Estimated saving: several hundred ms per navigation when the regions differ. It
cannot be measured until I know both regions.

## Load test: 1 to 100 users on staging

**Do not run against production, and do not run past 25 users on a development PC.** The harness already exists
(`tests/performance/`, see its README) with guard rails: a named target, only the public Supabase key, automatic stop on
a 429, an error-rate limit or a p95 limit, sanitised reports.

### Environment

- A **staging Supabase project** in the production region, schema from `supabase/migrations/` (all of them), and a
  **Vercel preview** pointing at it, both in the same region as production.
- A **load generator on a different machine** (a cloud VM near the users), so the client does not compete with the app.
- Seed volume like launch: reuse `tests/performance/scripts/seed-dashboard-load.sql` (local script; for staging a person
  runs it with `psql` after approving the target) plus test accounts per role through the Auth admin API. Isolation:
  one academy for the academy and student accounts, another academy as a leak check, as the harness already does.

### Levels (each 60 to 120 s, never jump)

| Level | Users | Mix | Stop immediately if |
|---|---:|---|---|
| 1 | 1 | all roles in turn | any error |
| 2 | 5 | 60% student, 20% mentor, 15% academy, 5% admin | error rate over 1% |
| 3 | 10 | same | p95 over 3 s |
| 4 | 25 | same | any 429 |
| 5 | 50 | same | database CPU over 80% |
| 6 | 75 | same | Vercel function errors or timeouts |
| 7 | 100 | same | any of the above |

Per level report: requests, failures, p50/p95/p99 per page, requests per second, error rate, and from the Supabase
dashboard the database CPU, connection count and slow queries. The result is **the highest level that stays under the
targets**, not "100 passed".

### Workflows (read-only, no production writes)

Login then dashboard for every role; student: dashboard, assessments, sessions, profile, practice; mentor: dashboard,
mentees, one student; academy: dashboard, students, mentors, performance, a search; admin: dashboard and management pages.
Writes (sign-up, invites, assignments) are tested separately at low rate on staging only.

### Targets (starting points, from the brief)

Login p95 under 2.5 s; dashboard useful content p95 under 2.5 s; internal request p95 under 500 ms; typical query p95
under 200 ms; failures under 1%; CLS under 0.1. If the staging numbers show a target is unrealistic for the
infrastructure, the report will say why and propose a measurable alternative.

## Redis: evaluated, not recommended now

I did not add Redis. Reasons, from the measurements:

| Candidate use | Verdict | Why |
|---|---|---|
| Cache the signed-in user's profile | **No** | The proxy and layout read it on every request on purpose, so a suspension or role change applies at once. A cached copy must be re-checked every request to stay safe, which removes the benefit. It is one small indexed row, not a bottleneck. |
| Cache dashboard data | **No** | It is per user and protected by row-level security; a shared cache bypasses RLS, so it risks showing one person's data to another (`docs/PERFORMANCE.md` rule 1). The slow query was fixed in SQL (3x faster), so a cache would only hide a design problem. |
| Cache reference data (practice banks, library lists) | **Not needed yet** | Small, public to signed-in users; Next's own caching can serve it if profiling ever shows it matters. |
| Rate limiting | **Maybe later** | Supabase Auth already rate-limits sign-ins; add Redis-backed limits only if abuse appears, as a security feature, not a speed feature. |
| Session storage | **No** | Supabase Auth owns sessions; Redis must never replace it. |

Three-way comparison:

| Approach | Latency effect (measured or estimated) | Cost / risk |
|---|---|---|
| 1. As it was | academy dashboard 3.5 to 3.9 s on a 300-student academy (Measured) | none |
| 2. Optimised queries, no Redis (done) | 1.5 to 2.0 s (Measured) | one reversible view change, paging helper |
| 3. Add Redis cache | Estimated to save the remaining read cost only if the same data is re-read by many users, but dashboards are per user | new service, bill, secrets, invalidation bugs, stale-permission risk, another network hop |

**Revisit Redis if** staging shows a read that is identical for many users and expensive after optimisation (for example
a platform-wide admin aggregate), or abuse needs rate limiting. Then it would be a separate, approved change: cache only
non-sensitive aggregates, with a short TTL (tens of seconds) and invalidation on write, fail open to the database if
Redis is down, never cache roles, permissions, tokens or per-student data, keys prefixed by role scope, and an env var
for the connection string that only the server sees. Cost depends on the provider's current plan: check its pricing page;
at this scale a small or free tier is the usual starting point.

## Next optimisations, in order

1. **Region alignment** (setting). Highest expected effect; needs the two regions.
2. **Row-level-security policy cost.** Score and attendance reads spend about 0.35 to 0.4 s each evaluating policy
   functions per row (the assessments policy runs a nested lookup per row). Rewriting policies so the cheap, selective
   condition is checked first and `auth.uid()` is wrapped in `(select ...)` is a known fix, but it touches access
   control, so it needs its own review and tests that prove no one gains or loses access.
3. **Aggregate in the database.** The academy performance read still sends every reviewed score to the server and
   groups it in JavaScript. A database function returning per-student and per-batch aggregates would send hundreds of
   rows instead of thousands, and removes the paging. Do this when academies grow past a few thousand scores.
4. **Student dashboard.** Profile with seeded student data (EXPLAIN on its reads) like the academy dashboard.
5. **Cold starts.** The first request after a restart took 5 to 12 s locally. On Vercel check function duration, memory
   and cold-start behaviour in the dashboard; consider a lighter first page.
6. **Bundle size.** Charts are already lazy. Check the route table and first-load JavaScript per dashboard after region alignment.

## Beyond 100 users

Postgres is the first limit. In order: confirm connection usage (Supabase's pooler), add the indexes the staging
`EXPLAIN` runs justify (none added blindly), move heavy aggregates into database functions, then a larger Supabase
compute size. Separate services are not warranted until a measured limit says so.

## Monitoring before launch

Vercel function duration and error rate; Supabase database CPU, connections and slow-query log; a weekly look at the
p95 of login and the academy dashboard; an alert when the error rate passes 1%.
