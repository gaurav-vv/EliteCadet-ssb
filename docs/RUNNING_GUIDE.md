# Running guide

Step-by-step setup for your own computer, a teammate's computer, and deployment. Commands are for
a terminal in the project root (Git Bash, macOS/Linux terminal or PowerShell).

**You need:** Node.js 22+, npm, Docker Desktop (running), Git.

---

## 1. Fresh computer after `git pull` (the 6 commands)

```bash
git pull
npm ci                      # installs exact package versions
npx supabase start          # starts local database + auth in Docker; applies every migration on first start
npx supabase migration up   # applies any NEW migrations that arrived with your pull (safe: skips applied ones)
npm run dev:local           # starts the website wired to YOUR local Supabase — no .env.local needed
```

Open http://localhost:3000. `npm run dev:local` reads your own local keys from the Supabase CLI and
passes them to Next.js, so **nobody needs to copy anyone else's secrets**. Emails (signup
confirmation, password reset) appear in the local inbox at http://127.0.0.1:54324 — they are never
really sent.

First run downloads Docker images and takes several minutes. Stop with `Ctrl+C`, then
`npx supabase stop` (your data is kept).

> **Never run `npx supabase db reset` on a database you care about** — it wipes all data and users.
> It is only for a throw-away local database, and only if you accept losing everything in it.

---

## 2. Local Supabase in detail

| Step | Command | Notes |
|---|---|---|
| Start | `npx supabase start` | Docker must be running. Local API: `http://127.0.0.1:54321`, Studio: `:54323`, Mail inbox: `:54324`. |
| See your keys | `npx supabase status -o env` | Prints `ANON_KEY`, `SERVICE_ROLE_KEY`, … Keep them private; do not paste in chat or commit. |
| Apply new migrations | `npx supabase migration up` | Applies only the ones not yet recorded. Does not delete data. |
| Check which are applied | `npx supabase migration list --local` | "Local" column filled = applied. |
| Stop | `npx supabase stop` | Data is kept in a Docker volume. |

Migrations live in `supabase/migrations/`, numbered `0001`…`0033`, **one file per number**. A test
(`tests/unit/lib/migrations-layout.test.ts`) fails if two files share a number or one is skipped.
When two people add a migration at the same time, the second person renumbers theirs to the next
free number **before merging**.

### Optional: `.env.local` instead of `dev:local`

Use this if you prefer `npm run dev`:

```bash
cp .env.example .env.local     # PowerShell: Copy-Item .env.example .env.local
```

Fill the values **from your own** `npx supabase status -o env`:

| Variable | Local value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` (or `PUBLISHABLE_KEY`) from `supabase status` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` (or `SECRET_KEY`) — server-only; needed for staff invites |
| `LIVEKIT_URL` | `ws://localhost:7880` (only for live meetings) |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | the values you start your local LiveKit with (see README §4) |

`.env.local` is git-ignored. **Never mix** a local URL with hosted keys, or a hosted URL with local keys
— login then fails with "Invalid API key" or the account is reported as unavailable. After editing
`.env.local`, restart `npm run dev`.

Then: `npm run dev` and open http://localhost:3000.

---

## 3. Deployment (hosted Supabase + your host, e.g. Vercel)

### 3a. Environment variables on the host

Set these in the hosting provider's settings (not in Git):

| Variable | Value | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | No (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the hosted project's anon / publishable key | No (public by design) |
| `SUPABASE_SERVICE_ROLE_KEY` | the hosted project's service-role / secret key | **Yes — server only** |
| `LIVEKIT_URL` | `wss://<project>.livekit.cloud` (never localhost) | No |
| `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | from LiveKit Cloud | **Yes — server only** |

Do not set `DEV_PREVIEW_ENABLED` in production. `NEXT_PUBLIC_` variables are baked in at **build**
time, so **redeploy** after changing them. Also add your site URL under Supabase → Authentication →
URL Configuration → Site URL / Redirect URLs, or email links (confirm, reset) will fail.

### 3b. Database migrations on the hosted project

> Pushing code to GitHub does **not** change the hosted database. Someone with access to the Supabase
> project must apply the migrations. Take a backup first (Supabase → Database → Backups).

**Step 1 — find out what the hosted database already has.** In Supabase → SQL Editor run:

```sql
-- Which migrations did the CLI record? (empty / missing table = applied by hand or never)
select version from supabase_migrations.schema_migrations order by 1;

-- What does the schema really contain? (the app needs all of these)
select
  exists (select 1 from information_schema.columns
          where table_schema='public' and table_name='profiles' and column_name='status') as has_profiles_status,
  to_regclass('public.live_meeting_attendance') is not null                              as has_live_meetings,
  to_regclass('public.independent_mentors')    is not null                              as has_independent_mentors,
  to_regproc('public.can_see_session_row')     is not null                              as has_sessions_fix;
```

**Step 2 — choose the path:**

| What you see | What to do |
|---|---|
| `has_profiles_status` is **false** (database is at `0004`) | Run `supabase/catchup/production_catchup_0005_0033.sql` once in the SQL Editor. It applies `0005`–`0033` in **one transaction** (all or nothing) and refuses to run if `0005` is already there. Then go to Step 3. |
| Some newer features missing, `0005` already applied | Apply only the missing numbered files from `supabase/migrations/`, in order, one at a time. `0026` and `0028`–`0033` are safe to re-run. |
| Everything `true` | Nothing to apply. |

Using the CLI instead: `npx supabase login`, `npx supabase link --project-ref <ref>`, then
`npx supabase db push` (it lists what it will apply and asks before doing it).
**Caution — duplicate `0022`:** the fix for sessions was first committed as
`0022_fix_sessions_read_returning.sql`, which clashed with `0022_live_meetings.sql`; it is now
`0026_…`. If the hosted project recorded version `0022` for the *fix*, `db push` will think live
meetings (also `0022`) is already applied and skip it. Check the `schema_migrations` result from
Step 1 and compare the schema, not only the list, before pushing.

**Step 3 — verify.** Re-run the Step 1 schema query (all `true`), log in on the live site with a real
account, and open the dashboard for that role. Only then is hosted login confirmed.

Regenerate the catch-up file after adding a migration: `bash supabase/catchup/build.sh`.

---

## 4. Diagnosing login and schema errors

The app logs one readable line to the **server terminal** (or host logs), starting with `[auth]`,
containing the database error code. Look there first.

| What you see | Likely cause | Fix |
|---|---|---|
| Login page says **"We couldn't load your account right now"**; log shows `code=42703` (or `42P01`, `PGRST200/204/205`) and `hint=the database schema is behind the app` | The database is missing a column/table the app expects, e.g. `profiles.status` (migration `0005` not applied) | Apply the pending migrations to **the project that `NEXT_PUBLIC_SUPABASE_URL` points at** (section 2 local, 3b hosted). |
| **"Your sign-in worked, but your account isn't fully set up"** | The email/password are right, but the user has **no row in `public.profiles`** (account created before the profile trigger existed, or the row was deleted) | `npx supabase migration up` — migration `0028` creates the missing profile for such users without touching passwords or existing profiles. Hosted: apply `0028` too. |
| **"Incorrect email or password."** | Wrong credentials, **or** the account lives in a different Supabase project (local vs hosted users are separate) | Check the URL in your env; reset the password via the local inbox `:54324`. |
| "Confirm your email first…" | Email confirmation is on | Open the link in the local inbox (`http://127.0.0.1:54324`) or the real mailbox. |
| Error names `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` as missing | `.env.local` missing or incomplete | Section 2; restart `npm run dev`. |
| "Invalid API key" / everything fails on a fresh pull | URL and keys come from different projects (e.g. local URL + hosted key) | Use `npm run dev:local`, or copy keys from **your own** `supabase status`. |
| `supabase start` fails: *database container is not ready: unhealthy* | Docker out of memory/disk or a damaged local volume | Check Docker is running with enough resources, then `npx supabase stop` and `npx supabase start`. Look at `docker logs supabase_db_elitecadet-ssb`. As a last resort for a **throw-away** local DB only, `npx supabase stop --no-backup` removes the local data volume — you lose local data. |
| `supabase start` / `db push` fails with *duplicate key … schema_migrations_pkey* | Two migration files share a number | Renumber one (the layout test catches this) and see the `0022` note in 3b. |
| Password-reset email never arrives locally | Local emails are captured, not sent | Open http://127.0.0.1:54324. |
| Signed in, then bounced back to login with `?reason=account_unavailable` | Same as the first row (profile query failed in the proxy) | Same fix. |
| Cross-checking a hosted user | — | Supabase → Authentication → Users (exists?) and Table Editor → `profiles` (has a row with the same id and a role?). |

Useful read-only check against a local database:

```bash
docker exec supabase_db_elitecadet-ssb psql -U postgres -d postgres -c \
  "select count(*) as users_without_profile from auth.users u where not exists (select 1 from public.profiles p where p.id=u.id)"
```

---

## 5. Checks before you push

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
