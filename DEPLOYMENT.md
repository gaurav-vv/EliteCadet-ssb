# EliteCadet SSB — Production Deployment Plan (full)

Take the app from local-only to a live, working website with **every feature on**: dashboards,
real email invites, AI feedback/interviews, and live video meetings.

> Status legend: ☐ = to do · 🔑 = needs an account/credential only you can create ·
> 🤖 = I (the agent) can do the code/config/CLI work once the prerequisite exists.

> Current state (verified 2026-10-21): `main` is at the latest teammate merge. Local checks all
> pass — `tsc --noEmit` clean, **598 unit/integration tests pass**, `next build` succeeds. The app
> is production-buildable now. What remains is standing up the hosted services below.

---

## 0. Architecture — the FIVE pieces that must run

| # | Piece | What it is | Where it runs | Needed for |
|---|-------|-----------|---------------|------------|
| 1 | **Next.js web app** | The website (`app/`, `components/`) — Next.js 16, App Router, auth middleware (`proxy.ts`) | **Vercel** | Everything users see |
| 2 | **Supabase** | Postgres + Auth + RLS; **25 migrations** in `supabase/migrations/` | **Hosted Supabase project** | Data, login, invites |
| 3 | **Email (SMTP)** | Real mail provider so invites/resets are delivered | Configured inside Supabase | Real mentor/student invites |
| 4 | **AI worker** | Background Node service (`worker/`) → Claude API; processes the `ai_jobs` queue; also runs the overdue-meeting sweep every minute | **Railway / Render** (Mumbai) | AI feedback, AI interview, diagnostics, roadmap |
| 5 | **LiveKit** | WebRTC SFU for live one-to-one and batch video meetings | **LiveKit Cloud** (India region) | In-app live video meetings + attendance |

We are enabling **all five** (full feature set).

---

## 1. Pre-flight

- ☑ 🤖 **PR #32 merged** — the session-scheduling RLS fix is in `main`. Done.
- ☑ 🤖 **Teammate updates pulled & verified** — build/tests/types green on current `main`. Done.
- ☐ 🔑 **Domain** — you don't have one yet. You CAN launch on the free `*.vercel.app` URL, but
  **email deliverability will be limited** (invites may hit spam) until you verify a sending domain.
  Strongly recommended before inviting real mentors/students at scale. Plan: deploy now on
  `*.vercel.app`, add the domain when ready (§7).
- ☐ Pick one **region** and use it everywhere: **Mumbai / ap-south-1** (or Singapore) — Supabase,
  Vercel, worker host, and LiveKit.
- ☐ 🔑 Create a **production** Git branch strategy note: deploy from `main`; never push secrets to
  the repo (all secrets live in each host's dashboard).

---

## 2. Piece 2 — Hosted Supabase (the foundation)

> Do first; every other piece needs its URL/keys/connection string.

- ☐ 🔑 Create a project at <https://supabase.com> (region: Mumbai/Singapore). Save the DB password.
- ☐ 🔑 From **Project Settings → API**, copy:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only secret)
- ☐ 🔑 From **Project Settings → Database**, copy the **Session pooler** connection string →
  `DATABASE_URL` (the AI worker needs this).
- ☐ 🤖 Link the CLI and push all migrations:
  ```bash
  supabase link --project-ref <your-project-ref>
  supabase db push          # applies supabase/migrations/0001 … 0025 in order
  ```
  Migrations include: core (0001–0016), AI (0017–0021), the session-RLS fix
  (`0022_fix_sessions_read_returning`), and live meetings (`0022_live_meetings`, 0023, 0024, 0025).
- ☐ 🤖 Verify all tables + RLS policies exist (optionally run `supabase/tests/workflow-check.sql`).
- ☐ 🔑 **Leave `DEV_PREVIEW_ENABLED` unset** in production (preview is always off in prod builds).
- ☐ 🔑 Create the first **super admin** via `supabase/snippets/grant_super_admin.sql`, then invite
  academy admins from the app.

**⚠️ Minor housekeeping:** two migrations share the number `0022`
(`0022_fix_sessions_read_returning.sql` and `0022_live_meetings.sql`). They touch **different
objects** and apply cleanly in filename order (already green in CI), so this is safe. Optional
future cleanup: renumber the live-meetings one to keep the sequence unique.

**Cost:** Free tier to start; **Pro (~$25/mo)** before real traffic (daily backups, no pausing).

---

## 3. Piece 3 — Real email via Resend

> Decision: **Resend**. Gmail SMTP is NOT for production (limits, spam, bans).

- ☐ 🔑 Create a Resend account (<https://resend.com>).
- ☐ 🔑 **Verify your sending domain** in Resend (add SPF + DKIM, and a DMARC record, at your
  registrar). *Until you own a domain, Resend only reliably sends to your own verified address —
  fine for a first test, not for real users.*
- ☐ 🔑 Create a Resend **API key**.
- ☐ 🔑 **Supabase Dashboard → Authentication → Emails → SMTP Settings → Enable custom SMTP**:
  ```
  Host:         smtp.resend.com
  Port:         587
  Username:     resend
  Password:     <Resend API key>        (stored in Supabase only, never in the repo)
  Sender email: no-reply@<your-domain>  (temporarily a Resend-verified address if no domain yet)
  Sender name:  EliteCadet SSB
  ```
- ☐ 🔑 **Authentication → Rate Limits:** raise "emails per hour" to fit your invite volume.
- ☐ 🔑 **Authentication → URL Configuration:**
  - **Site URL** = your app URL (`https://<project>.vercel.app` now; your domain later).
  - **Redirect URLs** = `https://<project>.vercel.app/**` (+ preview + domain later).
- ☐ 🤖 (Optional) customise Invite/Reset templates (keep `{{ .ConfirmationURL }}`).
- ☐ Test: invite a mentor on the live site → confirm the email arrives (check spam + Resend logs).

Reference: `docs/email.md` (full diagnosis + flow explanation).

---

## 4. Piece 5 — LiveKit (live video meetings)

> New since the last plan. Required for the in-app meeting rooms + attendance. Ref: `docs/live-meetings.md`.

- ☐ 🔑 Create a **LiveKit Cloud** project (<https://cloud.livekit.io>), India region.
- ☐ 🔑 Copy from the project:
  - `wss://<project>.livekit.cloud` → `LIVEKIT_URL`
  - API **key** → `LIVEKIT_API_KEY`
  - API **secret** → `LIVEKIT_API_SECRET`
- ☐ 🔑 **LiveKit → Settings → Webhooks:** add `https://<your-app-domain>/api/livekit/webhook`,
  signed with the **same API key**. (This is how attendance is recorded — without it, no attendance.)
- ☐ These three `LIVEKIT_*` vars are **server-only** (never `NEXT_PUBLIC_`), set in Vercel (§5).
- ☐ Test: as a mentor, schedule a "Live video room" session, start it, join as a student in another
  browser; confirm video connects and attendance is recorded after it ends.

**Note:** LiveKit Cloud includes TURN (needed for users behind strict firewalls). Self-hosting is
possible but needs a public `wss://` domain + open media ports — Cloud is recommended.

**Cost:** LiveKit Cloud has a free tier (generous connection minutes); paid as usage grows.

---

## 5. Piece 1 — Deploy the Next.js app (Vercel)

- ☐ 🔑 Create a Vercel account → **import the GitHub repo** `gaurav-vv/EliteCadet-ssb`.
  - Framework: **Next.js** (auto). Build: `next build`. Root: repo root.
- ☐ 🔑 Set **Environment Variables** (Production + Preview). **All five pieces feed in here:**
  ```
  # Supabase (§2)
  NEXT_PUBLIC_SUPABASE_URL        = https://<project>.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY   = <anon key>
  SUPABASE_SERVICE_ROLE_KEY       = <service_role key>     (mark sensitive)

  # LiveKit (§4) — server-only, NO NEXT_PUBLIC_ prefix
  LIVEKIT_URL                     = wss://<project>.livekit.cloud
  LIVEKIT_API_KEY                 = <livekit key>
  LIVEKIT_API_SECRET              = <livekit secret>        (mark sensitive)

  # Dev preview — leave UNSET in production
  # DEV_PREVIEW_ENABLED
  ```
  (Email/SMTP is configured in Supabase, not here. The AI worker's keys live on the worker host, §6.)
- ☐ 🤖 Confirm a clean production build locally first: `npm run build` (already verified ✅).
- ☐ Deploy (push to `main` → Vercel auto-builds). You get a `*.vercel.app` URL.
- ☐ 🔑 Attach your domain later: Vercel → Settings → Domains (+ registrar DNS). Then update the
  Supabase Site/Redirect URLs and the LiveKit webhook URL to the domain.
- ☐ Smoke test: signup, login, academy/mentor/student dashboards, invite flow.

**Cost:** Hobby (free) for testing; **Pro (~$20/mo)** for custom domain + larger builds.

---

## 6. Piece 4 — Deploy the AI worker (Railway or Render)

> Long-running background service → NOT on Vercel. Enables AI features AND the per-minute
> overdue-meeting sweep. Ref: `worker/README.md`.

- ☐ 🔑 Create a **Railway** or **Render** service **from the same repo**, **root directory = `worker`**.
  - Build: `npm ci` · Start: `npm start` · No public port · Region: Mumbai.
- ☐ 🔑 Get an **Anthropic (Claude) API key** (<https://console.anthropic.com>).
- ☐ 🔑 Worker env vars:
  ```
  DATABASE_URL       = <Supabase SESSION POOLER string from §2>
  ANTHROPIC_API_KEY  = <Claude key>
  # optional: AI_EVALUATION_MODEL, AI_QUESTION_MODEL, WORKER_CONCURRENCY, etc. (defaults are fine)
  ```
- ☐ Deploy. Logs should show it connected + `LISTEN ai_jobs`.
- ☐ Test: a student submits a psychology practice → AI feedback appears once processed.

**Cost:** ~$7+/mo host **plus metered Anthropic usage** (tracked in `ai_usage`, super-admin only).

---

## 7. Add your domain (when you have one)

- ☐ 🔑 Buy a domain (e.g. `elitecadet.in`).
- ☐ 🔑 Vercel → add domain + DNS records.
- ☐ 🔑 Resend → verify the domain (SPF/DKIM/DMARC) and set the sender to `no-reply@<domain>`.
- ☐ 🔑 Supabase → update **Site URL** + **Redirect URLs** to the domain.
- ☐ 🔑 LiveKit → update the **webhook URL** to the domain.

---

## 8. Post-deploy hardening (before public launch)

- ☐ 🔑 Turn ON **email confirmations** in production (`[auth.email] enable_confirmations`).
- ☐ 🔑 Supabase: enable **daily backups** (Pro), re-review RLS, rotate `service_role` if ever shared.
- ☐ 🤖 Point all redirect/site URLs entirely at production (remove any localhost).
- ☐ 🤖 Remove the temporary dev-preview landing links before a public launch (off in prod anyway).
- ☐ 🔑 Monitoring: Vercel logs/analytics, Supabase logs, worker host alerts, LiveKit usage.

---

## 9. Who does what

**You (accounts, payment, secrets, DNS):** create Supabase / Vercel / Resend / Railway(or Render) /
LiveKit Cloud / Anthropic accounts; (later) buy the domain + DNS; generate API keys; paste secrets
into each host's dashboard.

**I (agent) can do (code/config/CLI, all via a reviewed branch — never direct to `main`):** run
`supabase db push`, verify the production build, write `vercel.json` / worker config if needed,
customise email templates, wire `config.toml` SMTP/redirects, prep env-var checklists, and verify
each piece end to end once its credentials exist.

---

## 10. Recommended order (full feature set)

1. ☑ Merge PR #32 + pull teammate updates. **Done.**
2. §2 Hosted Supabase + `db push` (all 25 migrations).
3. §4 LiveKit Cloud project (get the 3 `LIVEKIT_*` values).
4. §5 Vercel deploy with Supabase + LiveKit env vars → live `*.vercel.app`.
5. §3 Resend + SMTP in Supabase → real invites.
6. §6 AI worker (Anthropic key) → AI features + meeting sweep.
7. **→ Full app live:** dashboards, real email, AI, and live meetings. ✅
8. §7 domain, then §8 hardening before public launch.

---

## 11. Rough monthly cost (everything on)

| Item | Testing | Early production |
|------|---------|------------------|
| Supabase | Free | ~$25 (Pro) |
| Vercel | Free | ~$20 (Pro) |
| AI worker host | ~$7 | ~$7+ |
| Anthropic API | metered (low in testing) | metered |
| LiveKit Cloud | Free tier | usage-based |
| Email (Resend) | Free (3k/mo) | Free→paid as volume grows |
| Domain | — | ~$10/yr |

Testing the full stack is low-cost; the main variable at scale is Anthropic (AI) + LiveKit (video)
usage.

---

## 12. Required environment variables (single reference)

| Variable | Where it's set | Secret? | Piece |
|----------|----------------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | no (public) | Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | no (public) | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel **and** worker | **yes** | Supabase |
| `LIVEKIT_URL` | Vercel | no | LiveKit |
| `LIVEKIT_API_KEY` | Vercel | yes | LiveKit |
| `LIVEKIT_API_SECRET` | Vercel | **yes** | LiveKit |
| `DATABASE_URL` | worker host | **yes** | Supabase (pooler) |
| `ANTHROPIC_API_KEY` | worker host | **yes** | AI worker |
| SMTP host/user/pass | Supabase dashboard | **yes** | Email |
| `DEV_PREVIEW_ENABLED` | — (leave unset) | — | off in prod |
