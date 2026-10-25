# Performance and caching rules

Read this before adding caching to any page, service or route. The app is mostly per-user data behind
row-level security (RLS), so the wrong cache leaks one user's data to another.

## What is cached today

| What | Where | Scope |
|---|---|---|
| Signed-in user + profile, academy name | `lib/auth/session.ts`, wrapped in React `cache()` | One request only. A layout, its page and `requireRole` share one lookup instead of repeating two Supabase calls each. Never shared across requests or users. |
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

## How to check

`npm run build` prints a route table: `○` is static, `ƒ` is rendered per request. After changing
`next.config.ts`, run `npm run start` and `curl -I` an asset to confirm its `Cache-Control`.
