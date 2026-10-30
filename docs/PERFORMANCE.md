# Performance and caching rules

Read this before adding caching to any page, service or route. The app is mostly per-user data behind
row-level security (RLS), so the wrong cache leaks one user's data to another.

## What is cached today

| What | Where | Scope |
|---|---|---|
| Signed-in user + profile, academy name | `lib/auth/session.ts`, wrapped in React `cache()` | One request only. A layout, its page and `requireRole` share one lookup instead of repeating two Supabase calls each. Never shared across requests or users. |
| Who is signed in (proxy and server pages) | `lib/supabase/claims.ts` (`getVerifiedUser`) | Verified locally from the token's signature with `auth.getClaims()`, using the project's public signing keys (cached in memory by the SDK). No Auth-server round trip per request. Falls back to `getUser()` by itself if the project uses a symmetric key. |
| Public pages with no auth cookie skip Supabase | `lib/supabase/middleware.ts` (`hasAuthCookie`) | Saves a network call per public page view. Protected routes and anyone with a cookie take the full path. |
| Brand image lookup | `lib/academy/brand-images.ts` | In-process, production only (dev re-checks so dropped-in files appear). |
| Static images (`/brand`, `/images`, two `/academy/*` files) | `next.config.ts` `headers()` | Browser/CDN: 1 day, then stale-while-revalidate 7 days. Not `immutable`, because a file can be replaced under the same name. |
| Optimised images (AVIF/WebP) | `next.config.ts` `images` | 30 days. |
| Landing page `/` | Static prerender | CDN (`s-maxage`). |

## Rules

1. **Never cache per-user or role-scoped data across requests** (`unstable_cache`, `"use cache"`, module-level
   variables, CDN headers). RLS decides what each user sees; a shared cache bypasses it.
2. Request-level `cache()` is fine for read helpers that are safe to repeat within one render. Do not wrap
   functions that write.
3. After a mutation, keep calling `revalidatePath` as the existing actions do.
4. `/academy`, `/student`, `/mentor`, `/admin` are real app routes. Never put cache headers on those
   prefixes, only on specific static file paths.
5. Pages that read `searchParams` on the server (`/login`, `/signup`, `/request-demo`, `/forgot-password`)
   render on demand. Making them static means reading the query on the client; do that as its own change.

## Authentication trade-offs

* `getClaims()` proves the token is genuine and unexpired. It cannot know the session was revoked on the
  server (sign-out elsewhere) since the token was issued; that token works until it expires (default 1 hour).
  Role, account status and academy suspension are never read from claims: the proxy and `getCurrentUserAndProfile`
  still read `profiles` on every request, so a suspension or role change applies immediately. Database access is
  unchanged: PostgREST and RLS verify the same token themselves.
* Password and email changes keep `auth.getUser()` (`lib/auth/update-profile.ts`, `lib/api/auth.ts`).
* The proxy and the layout still each read the profile once per navigation. They run in separate request
  contexts and nothing safe can be passed between them (no headers, query strings or unsigned cookies), and the
  proxy lookup is the route-level role check. Do not remove it to save a round trip.

### Revocation window, measured (local stack, ES256)

`npm run perf:security` signs a user in, signs every session out server-side, and then asks both
ways: `getUser()` rejects the old token, `getClaims()` still accepts it until it expires
(`jwt_expiry` is 3600 s locally). Altered payloads and corrupted signatures are rejected, and a
suspended account is seen on the very next profile read. The app has no feature that revokes
server-side sessions (every sign-out is local scope, mentor-invite revocation deletes the account and
its profile), so today this only matters for a stolen token or a future "sign out everywhere".
If that feature is added, check the session with `getUser()` on that path or shorten `jwt_expiry`.

## Charts load on demand

recharts (about 350 KB) is split out: `components/progress/score-trend-chart-lazy.tsx` and
`student-performance-line.tsx` load it with `next/dynamic` (`ssr: false`; the charts only draw
after the browser measures them) and a placeholder of identical height. Add any new chart the same
way. The meeting room is not lazy-loaded: its chunk is already only on the three `/room` routes.

## Dashboards: one owner per dataset

A page that shows data another service also needs starts that read once and passes the in-flight promise down
(see `ProgressInputs` in `lib/server/progress/service.ts`, used by the student dashboard). Do not add a shared
cache to hide duplicate reads, and keep independent reads in one `Promise.all`.

## How to check

`npm run build` prints a route table: `○` is static, `ƒ` is rendered per request. After changing
`next.config.ts`, run `npm run start` and `curl -I` an asset to confirm its `Cache-Control`.
