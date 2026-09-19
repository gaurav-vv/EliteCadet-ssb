# status.md — SSB Academy Web Platform State Snapshot

**Type:** Current project state. Reporting only — never a source of requirements.
**Question this file answers:** *If I open this project today, what is the exact state?*
**Last updated:** 2026-09-19 (design system rebuild)

---

## 0. Evidence Basis (read this first)

T001 (repository inspection) has run. The repository now exists: a Next.js/TypeScript/Tailwind
scaffold generated with `create-next-app`, installed, built and committed to git. Statements below
about the scaffold are `VERIFIED` by direct inspection (`npm install`, `npm run lint`, `npm run build`
all run clean). Everything under Phase 1 onward remains `UNVERIFIED` — no feature code has been
written yet.

Status vocabulary used throughout: `VERIFIED` · `UNVERIFIED` · `PARTIAL` · `BROKEN` · `BLOCKED` ·
`DEFERRED`.

---

## 1. Current State

| Field | Value |
|---|---|
| Stage | Foundation (T001–T005) + public shell/landing (T010/T011) + full Student (T020, T030–T038 except T034/T035) + full Mentor (T021, T040–T045) + full Academy (T022, T050–T055) experiences + **real Supabase authentication and role-based access (T013/T014)** complete |
| Current focus | Web platform MVP — auth is real now. Only AI feedback (T034/T035) and Phase 6 audits remain |
| Documentation | `VERIFIED` — all four files rewritten and reconciled 2026-09-16; re-sequenced 2026-09-18 |
| Codebase | `VERIFIED` — Next.js scaffold + Glass Capsule tokens + capsule primitives + shadcn/ui base UI system + public site + full Student, Mentor and Academy experiences + Supabase auth, committed to git (`.env.local` holds real project credentials, gitignored, not committed) |
| Build | `VERIFIED` — `npm run build`, `npm run lint`, `npx tsc --noEmit` all succeed (Next.js 16.3.5, Turbopack). Middleware redirect behavior smoke-tested with curl (unauthenticated → `/login`, confirmed for `/student`, `/mentor`, `/academy`, `/onboarding`) |
| Tests | `UNVERIFIED` — no test runner configured yet. Real signup/login has not been click-tested in a browser this session (no Chrome extension connection) — user should verify manually |
| Next action | Resolve B3 (AI provider) to unblock T034/T035 — the only remaining MVP feature gap. Then Phase 6 quality/security audits (T060–T066), which must also close the mock-data gap under T014 (see Technical Debt) |

Core loop being built:

```text
Onboard → Practice → AI Feedback → Improve → Practice Again
```

---

## 2. Documentation State — `VERIFIED`

| File | State | Notes |
|---|---|---|
| `AGENTS.md` | Rewritten | Glass Capsule design system added as §7 (mandatory); regression-prevention rules added; `CLAUDE.md` retired |
| `specs.md` | Rewritten | Scope contradictions resolved; acceptance criteria added per feature; non-SSB (media player / rooms) requirements excluded |
| `task.md` | Rewritten | Every task now carries priority, dependencies, requirements, acceptance criteria and tests |
| `status.md` | Rewritten | This file; all implementation claims marked `UNVERIFIED` |
| `CLAUDE.md` | **Retired** | No longer authoritative. Reduce to a pointer to `AGENTS.md`, or delete |

---

## 3. Architecture State

| Area | State |
|---|---|
| Project structure | `VERIFIED` — App Router scaffold (`app/`, `public/`), no `src/` dir, matches `AGENTS.md` §5 target (subdirectories not yet created) |
| Installed versions | `VERIFIED` — Next.js 16.3.5, React 19.2.8, TypeScript 5.9.3, Tailwind CSS 4.3.3, ESLint 9.x, eslint-config-next 16.3.5 |
| Routing | `VERIFIED` — App Router default (`/`, `/_not-found`); no product routes yet |
| Design tokens | `VERIFIED` — `app/globals.css`: navy scale, bg/text, semantic status colors, glass opacity/blur/border, two shadow levels, capsule radii, motion duration/easing + reduced-motion override; spacing intentionally reuses Tailwind's default scale (no second system) |
| Capsule primitive components | `VERIFIED` — `components/ui/capsule.tsx`: `CapsulePrimary`/`CapsuleSecondary`/`CapsuleSmall`, all 8 states, keyboard focus, responsive at 320/768px (see Decisions Register for a cascade-layer bug found and fixed) |
| Base UI system | `VERIFIED` — shadcn/ui (Radix + Nova preset) installed: button, input, select, dialog, tabs, badge, table, alert, label, textarea, separator, skeleton; all remapped from shadcn's default neutral palette onto the navy design tokens (see Decisions Register). Custom `EmptyState`/`ErrorState`/`LoadingState` in `components/ui/` cover `AGENTS.md` §12. Typography scale uses Tailwind's default `text-*` scale (no second system, same precedent as spacing) |
| API client layer | `VERIFIED` — `lib/api/*` (read paths) + `lib/actions/*` (Server Action mutations) per domain; see §4/§5 below |
| Authentication | `VERIFIED` — real Supabase Auth: `lib/api/auth.ts` (signUp/logIn/password reset), `lib/auth/actions.ts` (logout), `lib/auth/session.ts` (server-side current-user helper). No email confirmation required (dashboard setting, by decision) |
| Authorization / academy isolation | `PARTIAL` — role-based route access is `VERIFIED` (middleware + RLS on `profiles`/`academies`); per-academy data isolation for students/mentees/batches is `UNVERIFIED` — that data is still mock, not real Postgres (Technical Debt) |
| AI feedback integration | `UNVERIFIED` + `BLOCKED` (provider undecided, B3) |
| Backend / database | `PARTIAL` — Supabase Postgres is live for auth (`profiles`, `academies` — migration `supabase/migrations/0001_init_auth.sql`, must be run in the Supabase SQL Editor); every other domain (students, batches, mentees, evaluations, sessions, resources, practice) is still mock/in-memory |
| Storage | `UNVERIFIED` + `BLOCKED` |
| Testing infrastructure | `UNVERIFIED` — no test runner installed |
| Lint | `VERIFIED` — `npm run lint` passes clean |
| Build | `VERIFIED` — `npm run build` (Turbopack) succeeds |
| Git | `VERIFIED` — repository initialized, ongoing commits |
| Environment variables | `VERIFIED` — `.env.local` (gitignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (service role used only server-side, for the real mentor-invite Server Action) |

**Note:** the rows above this line (project structure, routing, design tokens, etc.) reflect the
2026-09-16 T001–T005 snapshot and have not been re-audited since — `app/`, `components/`, `lib/` and
`types/` have grown substantially (see §4/§5 and the task.md roadmap for what actually exists now). A
full re-audit is due before Phase 6.

Intended architecture (target, not observed):

```text
Browser → Next.js App → Backend API → PostgreSQL / AI Provider / Storage
```

---

## 4. UI State

> **2026-09-19 — design system replaced.** Everything below this notice describing "Glass Capsule"
> (navy brand colour, `CapsulePrimary`/`Secondary`/`Small`) is **superseded** and kept only as a
> historical record of the T003–T005 build. The live design system is now **Apple-Inspired Glass UI
> v3** (`AGENTS.md` §7, full spec in `UI design.md`) — see the Decisions Register entry below for
> rationale and the summary immediately following this notice for current state.

### 4.0 Current design system — Apple-Inspired Glass UI v3 — `VERIFIED`

- **Tokens** (`app/globals.css`): ink/ink-secondary/surface-base/hairline, single brand-accent
  (indigo) + brand-accent-2, three status colours, three glass material tiers (thin/regular/thick),
  five-step radius scale, shadow-soft/elevated/glow-accent, motion duration/easing. `--brand-accent`
  deliberately not named bare `--accent`, to avoid colliding with shadcn's own `--accent` semantic
  slot (used internally for hover-highlight backgrounds).
- **Shell** (`components/layout/`): `AppShell` composes `Sidebar` (glass-thick, pill nav items, active
  = accent gradient + glow), `TopHeader` (glass-thick, search capsule + notifications + avatar menu),
  `MobileTabBar` (floating glass-thick bottom bar, <900px). One shell, parameterized by role — used
  identically by `app/student/layout.tsx`, `app/mentor/layout.tsx`, `app/academy/layout.tsx`.
- **Shared content patterns** (`components/ui/`): `StatCard`, `PageHeader`, `ListPanel`/`ListRow`,
  `EmptyState` (redesigned), `ErrorState`/`LoadingState` (redesigned), `StatusTag` (colour + text/dot,
  never colour-only), `FilterChip`, `DetailHeader`, `nav-icons.tsx` (icon registry, replaces the old
  `capsuleIcons`).
- **Retired:** `components/ui/capsule.tsx` and the per-role `*-header.tsx`/`*-nav.tsx` components
  (`components/{student,mentor,academy}/`) — deleted, replaced by the shared shell above.
- **Ambient background:** one persistent `.ambient-wash` div in `app/layout.tsx` (root layout, never
  remounted per route), indigo→cyan radial wash, `prefers-reduced-motion` freezes it via the existing
  global reduced-motion rule.
- **Migration scope:** every page under `app/`, every component under `components/{student,mentor,
  academy,auth,shared,practice}/`, and the public site were swept for the old token names
  (`glass-surface`, `text-text-primary/muted`, `brand-navy*`, `bg-bg-base/ambient`) and either
  mechanically renamed or structurally rewritten (Capsule usages) onto the new system. Verified via
  `npm run build` + `npm run lint` + `npx tsc --noEmit` (all clean) and rendered-HTML checks for `/`,
  `/login`, `/signup`.
- **Known remaining polish (not blocking):** dropdown menus (profile menu, select dropdowns) still use
  shadcn's default solid `bg-popover` chrome rather than being explicitly restyled as `glass-thick`;
  visually acceptable but not yet swept for full §7.13 screen-acceptance-test compliance page by page.
  Track under a future T070-equivalent consistency pass.

### 4.1 Historical (superseded 2026-09-19) — original Glass Capsule build record

- **Design system:** Glass Capsule (`AGENTS.md` §7) — `VERIFIED` implemented (tokens T003, primitives
  T004, base UI T005).
- **Design tokens:** `VERIFIED` — see §3 Architecture State.
- **Capsule primitives:** `VERIFIED` — see §3 Architecture State; extended with `dashboard`/`resources`/
  `profile` icon registry entries (`components/ui/capsule.tsx`) for the student nav.
- **Public site:** `VERIFIED` — `SiteHeader`/`SiteFooter` (`components/layout/`), landing page
  (`app/(public)/page.tsx`) covering role benefits and the core loop. `/login`, `/signup`,
  `/forgot-password`, `/reset-password` are real (T013), no longer placeholders. Verified visually at
  ~390px and desktop widths (pre-auth version; not re-screenshotted after the auth forms replaced the
  placeholders — Chrome extension not connected this session).
- **Student shell (T020):** `VERIFIED` — `app/student/layout.tsx` + `StudentHeader`/`StudentNav`
  (`components/student/`). Nav: Dashboard/Practice/Progress/Resources/Profile as `CapsuleSmall`,
  vertical rail on `md+`, horizontal-scroll row on mobile. Header has a notifications popover (empty
  state — no fake notifications) and a profile dropdown menu with a real logout item
  (`components/ui/popover.tsx`, `dropdown-menu.tsx`). **Now has a real server-side auth guard** —
  `middleware.ts` (T014) — see Decisions Register, 2026-09-19.
- **Student onboarding (T030):** `VERIFIED` — `app/onboarding/page.tsx` +
  `components/student/onboarding-form.tsx`. Single-page form (name, target exam, preparation stage,
  optional academy, goals), field validation, draft persisted to `localStorage` so a refresh mid-flow
  doesn't lose input, and a client-side "already completed" flag so it can't be trivially repeated.
  This flag is per-browser only until real auth exists (documented, not hidden).
- **Student dashboard (T031):** `VERIFIED` — `app/student/page.tsx`. Zero-activity and populated
  states both implemented and both rendered-checked (`/student` vs `/student?preview=active` — the
  query param is a dev-only preview switch, documented in code, not user-facing chrome). Sections:
  header greeting, overall readiness, activity metrics, Today's Mission (primary capsule), upcoming
  session, My Progress (compact trend), recent activity, recommendations. Achievements/Leaderboard
  correctly absent. `/student/practice`, `/student/progress`, `/student/resources`, `/student/profile`
  are explicit "coming soon" stubs (same pattern as the earlier `/login`/`/signup` placeholders), not
  silently broken links.
- **Verification method:** `npm run build`, `npm run lint`, `npx tsc --noEmit` all pass; rendered HTML
  fetched via `curl` for `/student`, `/student?preview=active`, `/onboarding` and all four stub routes
  confirmed expected content. Not yet verified in an actual browser (Claude in Chrome extension was
  not connected this session) — user should open `http://localhost:3000/student` and
  `/onboarding` to confirm visually.
- **Known migration risk:** earlier guidance specified rounded cards and a purple accent — resolved;
  no such UI exists in the repository.

---

## 5. Feature State

Nothing is `VERIFIED`. Everything below is `UNVERIFIED` unless marked `BLOCKED` or `DEFERRED`.

### Student
Authentication `VERIFIED` (real Supabase, T013/T014) · Onboarding `VERIFIED` (mock/local-only
persistence) · Dashboard `VERIFIED` (mock data) · Practice Zone `VERIFIED` (Psychology TAT/WAT/SRT/SDT,
standard SSB timing per B4; Interview is an explicit stub — no activities are specced for it yet) ·
Practice submission `VERIFIED` (idempotency-keyed mock submission, retry-safe) · AI feedback `BLOCKED`
(B3 — AI provider not yet decided) · AI failure handling `BLOCKED` (same) · Progress `VERIFIED` (mock
data, zero/populated states) · Resources `VERIFIED` (mock content, list/detail/read-state) · Profile
`VERIFIED` (edit form, localStorage-persisted)

### Mentor
Authentication `VERIFIED` (real Supabase, T013/T014) · Dashboard `VERIFIED` (mock data) · Mentees
`VERIFIED` (mock data, no real assignment scoping yet) · Mentee detail `VERIFIED` (404 on unknown id;
no real ownership check without auth) · Evaluations `VERIFIED` (Server Action, idempotent, draft
recoverable) · Basic sessions `VERIFIED` (create/cancel via Server Action) · Profile `VERIFIED`
(localStorage-persisted)

### Academy Admin
Authentication `VERIFIED` (real Supabase, T013/T014) · Dashboard `VERIFIED` (mock data, alerts,
attention list) · Students `VERIFIED` (add, status, batch reassignment via Server Actions) · Batches
`VERIFIED` (create, member add/remove, mentor assignment) · Mentors `VERIFIED` (invite, invited vs.
active distinction) · Reports `VERIFIED` (readiness distribution, batch performance, activity, mentor
workload) · Settings `VERIFIED` (Server Action, server-side mock persistence)

---

## 6. Known Bugs

**None recorded.** This is not a claim that none exist — no code has been inspected. The first real
bug list comes out of T001, T060 and T065.

---

## 7. Blockers

### B1 — Backend API contract — `PARTIALLY RESOLVED` (2026-09-18)
Supabase (Postgres) selected as the backend/DB via the B2 decision. Auth, users, students, mentors,
academies and batches can now be modeled as real Postgres tables with Row Level Security enforcing
academy isolation (`AGENTS.md` §10) — auth-adjacent data no longer needs a frontend-only interim
contract. Practice, submissions, evaluations, AI feedback and progress still need their schemas
defined; each still needs request/response/error shapes and authorization rules worked out per
feature as those tasks are reached.
**Interim rule (still applies to non-auth domains):** define types frontend-side in `types/` and
treat them as the working contract until their Supabase schema is designed.
**Blocks:** Phases 3–5 integration for domains beyond auth/users/academies/batches.

### B2 — Authentication provider — `RESOLVED` (2026-09-18), `IMPLEMENTED` (2026-09-19)
**Decision:** Supabase Auth. See Decisions Register. T013/T014 were deliberately sequenced later
(2026-09-18 decision) so the Student/Mentor/Academy UIs could be reviewed on mock data first, then
built for real on 2026-09-19 once all three existed to wire it into.

### B3 — AI provider — `BLOCKED`
The frontend must consume an application-level AI feedback API. Provider credentials never reach the
browser.
**Blocks:** T034, T035 — i.e. the core value loop.

### B4 — Practice timing rules — `RESOLVED` (2026-09-18)
**Decision (standard SSB timing):**
- TAT: 30s stimulus display per picture, then a 4-minute writing window. 12 pictures + 1 blank slide.
- WAT: 15s per word, 60 words, one word shown at a time in rapid sequence.
- SRT: 30 minutes total to respond to 60 situations.
- SDT: 15 minutes total across 5 self-description prompts.
**Unblocks:** T032 (Practice Zone — Psychology tests).

### B5 — Storage — `BLOCKED`
Finalise when document / audio / resource workflows are implemented. Not blocking the MVP loop.

### B6 — Payments — `DEFERRED`
Not required to validate the MVP. Pricing page shows information and CTAs only.

---

## 8. Decisions Register

| Date | Decision | Rationale |
|---|---|---|
| 2026-09-16 | Glass Capsule design system is mandatory project-wide (`AGENTS.md` §7) | Supplied as a project-wide requirement, not a suggestion |
| 2026-09-16 | Navy is the primary brand colour; purple is no longer a brand accent | Resolves conflict with the earlier colour-semantics rule |
| 2026-09-16 | Capsule-first replaces card-first layout | Resolves conflict with earlier "rounded cards" guidance |
| 2026-09-16 | `CLAUDE.md` retired; `AGENTS.md` authoritative | Three files pointed at a file that is not maintained |
| 2026-09-16 | Achievements and Leaderboard removed from MVP dashboard (P2) | They were specified and simultaneously listed as not started |
| 2026-09-16 | "Today's Mission" (MVP) split from the "5-Day SSB Mission" programme (P1) | Design brief and scope list conflicted on the word "Mission" |
| 2026-09-16 | Media-player / watch-room / playback-sync requirements excluded | Belong to a different project; no such feature exists here |
| 2026-09-16 | Frontend-defined types serve as the interim API contract | Unblocks UI work without scattering backend assumptions |
| 2026-09-16 | Project scaffolded with `create-next-app` (App Router, TS strict, Tailwind, ESLint), package name `ssb-academy` | Standard, supported tooling for the mandated stack (`AGENTS.md` §3); confirmed with user that "from scratch" meant no pre-existing code, not hand-authoring config |
| 2026-09-16 | Capsule icons are passed as string names (`icon="mission"`) resolved against a registry in `components/ui/capsule.tsx`, never as a component reference or JSX element prop | Next.js 16 / React 19 cannot serialize a Lucide icon (forwardRef component) across the Server→Client Component boundary as a custom prop; confirmed by reproducing both failure modes during T004. All capsule call sites (mostly Server Components) must use this pattern |
| 2026-09-16 | `.glass-surface`/`.glass-surface--*` state modifiers (selected/success/error/focus-visible) are written as plain CSS in `app/globals.css`, never as Tailwind utility classes on a component | `.glass-surface` sets `background`/`border`/`box-shadow` outside any Tailwind `@layer`, so those unlayered declarations always beat layered Tailwind utilities for the same properties regardless of class order — found via visual QA in T004 (selected/success/error/focus states were invisible until fixed). Any new glass-surface-based component must add state styling next to `.glass-surface` in CSS, not via `border-*`/`bg-*`/`shadow-*`/`ring-*` utility classes |
| 2026-09-16 | shadcn/ui installed with `-b radix -p nova` (Radix primitives, "Nova - Lucide/Geist" preset); its default neutral-gray tokens (`--primary`, `--border`, `--ring`, etc.) were remapped in `app/globals.css` to reference the existing navy/status tokens instead of being left as-is | shadcn init writes its own generic palette into `:root`, which would have silently produced black/gray buttons and inputs instead of the mandated navy branding (`AGENTS.md` §7.5) — a second, competing design system rather than one. `.dark`/chart/sidebar tokens were dropped as unused (no dark mode requirement; no chart or shadcn-sidebar component built yet) |
| 2026-09-16 | Project standardized on the official `cn` npm package (`shadcn-ui/cn`) for className merging everywhere, not a hand-rolled `clsx`+`tailwind-merge` wrapper | Every file shadcn's CLI generates hardcodes `import { cn } from "cn"` regardless of the `utils` alias in `components.json` — fighting that on every future `shadcn add` would be constant, losing maintenance work. `lib/utils/cn.ts` and the `clsx`/`tailwind-merge` deps from T004 were removed; `components/ui/capsule.tsx` now imports from `"cn"` directly, matching every shadcn-generated component |
| 2026-09-18 | Supabase (Auth + Postgres) selected to resolve B2 (auth provider) and partially resolve B1 (backend contract) | User chose it explicitly over NextAuth.js, Clerk, and a fully custom backend, specifically because it also supplies a real Postgres database with Row Level Security, letting academy isolation (`AGENTS.md` §10) be enforced at the data layer rather than only in application code. Unblocks T013/T014 |
| 2026-09-18 | T013/T014 (real authentication + server-side authorization) intentionally **deferred**; screens/features build next on mock data, without a login wall, so the product's look and behaviour can be reviewed end-to-end sooner | User's explicit instruction: build out the rest of the site first and "add login for each" once the whole project is more complete, rather than gating every screen behind auth immediately. This does **not** change the auth model decided above (still Supabase) and does not permit mock/fake data to silently ship — `AGENTS.md` §8's mock-data rules (isolated, clearly named, shaped like the eventual API response) still apply, and no page may claim to be authorization-checked until T013/T014 are actually done |
| 2026-09-18 | B4 resolved: standard SSB timing — TAT 30s/picture + 4min writing (12 pictures + 1 blank), WAT 15s/word for 60 words, SRT 30min for 60 situations, SDT 15min across 5 prompts | User chose the standard, widely-used SSB convention over an untimed practice mode, so reps build real exam-pressure habits and stay comparable across students. Unblocks T032 |
| 2026-09-19 | T013/T014 built for real: Supabase Auth (`@supabase/supabase-js` + `@supabase/ssr`), `middleware.ts` enforcing role-based route access, RLS on `profiles`/`academies`, real login/signup/logout/forgot-password/reset-password pages | Sequencing decision from 2026-09-18 reached its trigger condition — all three role UIs existed to wire auth into. User provided a live Supabase project's URL + anon key + service role key this session |
| 2026-09-19 | No email confirmation required on signup (Supabase dashboard setting, not code) | User's explicit choice, to keep local testing fast; can be turned on later without any code change |
| 2026-09-19 | Public signup offers **Student** and **Academy Admin** only. **Mentor accounts are invite-only** — an academy admin invites a mentor from `/academy/mentors`, which now creates a **real** Supabase account via `admin.inviteUserByEmail` (service-role key, server-side only) | Matches `specs.md` §8.5 exactly (mentors are invited, not self-signup). User explicitly asked for this to be real rather than mocked, unlike the rest of the academy domain — see Technical Debt for the mock/real bridge this required |
| 2026-09-19 | Each role's Settings-equivalent page (Academy → Settings, Mentor → Profile, Student → Profile) gained "Load demo data" / "Clear demo data" controls | User's request: once real auth exists, every new account starts genuinely empty, losing the rich populated mock view built during T031/T040/T050. For Mentor/Academy this resets the shared in-memory mock arrays to their original snapshot (Server Actions in `lib/actions/{mentor,academy}.ts`, snapshotted at module load in `lib/mock/{mentor,academy}.ts`); for Student (no shared mutable mock state) it clears the relevant `localStorage` keys instead |
| 2026-09-19 | Design system replaced app-wide: "Glass Capsule" (`AGENTS.md` §7, navy accent, `CapsulePrimary/Secondary/Small`) → **Apple-Inspired Glass UI v3** (indigo `--brand-accent`, three glass material tiers, sidebar+header app shell, stat cards/list-tables instead of capsule hierarchy). Full spec: `UI design.md` (repo root, descriptive reference, not a governing file). `AGENTS.md` §7 rewritten in full to be the binding summary | User provided a complete, detailed design doc and explicitly confirmed: (1) applies to the whole app, not just Academy Admin (even though the doc's own nav list — Dashboard/Students/Batches/Mentors/Reports/Settings — matches Academy's nav exactly), and (2) `AGENTS.md` should be updated to reflect it as the new mandatory system, the same way Glass Capsule itself superseded an earlier rounded-cards/purple direction |

---

## 9. Technical Debt

| Introduced | Debt | Removed by |
|---|---|---|
| 2026-09-18 | ~~`/student`, `/mentor`, `/academy` (T020–T022 onward) had **no server-side auth guard**~~ — **CLOSED 2026-09-19** by `middleware.ts` (T013/T014). | T013 + T014 — done |
| 2026-09-18 | Screens built under this sequencing (T020–T052) read from isolated mock data modules, not a real backend, per `AGENTS.md` §8. **Still open** — auth (T013/T014) is real, but student/mentee/batch/evaluation/session/resource content is still mock, in-memory, and per-server-process rather than per-academy-isolated Postgres. | Full backend data migration — not scheduled as a task yet; needed before Phase 6's academy-isolation audit (T060) can pass |
| 2026-09-19 | ~~`/mentor/*` had the same no-auth-guard gap~~ — **CLOSED 2026-09-19**. The mentor→mentee *assignment* check (i.e. "is this actually your mentee") is still not real, since mentees are still mock data (see the row above). Evaluation/session mutations use Next.js Server Actions specifically so they mutate the real server-side mock state (not a client-only copy) — a real bug caught and fixed during T043/T044. | Auth guard: done. Real assignment scoping: same backend migration as above |
| 2026-09-19 | ~~`/academy/*` had the same no-auth-guard gap~~ — **CLOSED 2026-09-19**. Per-academy data isolation is still not real: there is exactly one academy in the mock dataset (`lib/mock/academy.ts`), so a second real academy_admin account would see the same mock students/batches/mentors as the first. All mutations (add student, assign batch/mentor, invite mentor, update settings) are Server Actions. | Auth guard: done. Per-academy isolation: same backend migration as above (`AGENTS.md` §10) |
| 2026-09-19 | Mentor invites are a hybrid: `inviteMentorAction` creates a **real** Supabase auth user (service-role `admin.inviteUserByEmail`, real email sent) so the person can actually log in as a mentor, but also pushes a matching row into the **mock** `lib/mock/academy.ts` `MENTORS` array purely so the existing mock-backed mentor list/dashboard/batch-assignment UI shows them immediately. `app/mentor/layout.tsx` flips that mock row from "invited" to "active" the first time the real mentor loads their own dashboard. This bridge is deliberate, not an oversight — documented in code comments in both files. | Same backend migration as the rows above; once academy data is real Postgres, drop the mock-array half of this function entirely |
| 2026-09-19 | Landing page's temporary "Preview (no login yet)" buttons on all three role cards were removed now that `/login`/`/signup` are real. | Done — removed in the same change that shipped T013/T014 |
| 2026-09-19 | Design system migration covered every page/component for the *material* system (glass tiers, colour, radius, shadow, shell) and the primary reference screens (all three dashboards, mentee detail, practice list pages) got the full new content-pattern treatment (`StatCard`/`ListPanel`/`PageHeader`). Secondary pages (batches, students, mentors, reports, settings, evaluations, sessions, resources detail, progress) were swept for token correctness and typography-scale consistency but still use ad-hoc `glass-regular` divs in places `StatCard`/`ListPanel` would be a cleaner fit. Dropdown menus (profile menu, `<Select>`) still use shadcn's default solid chrome, not an explicit `glass-thick` treatment. | A future T070-equivalent consistency pass — visually acceptable now, not yet swept against every §7.13 acceptance-test item on every screen |

---

## 10. Deferred (not blocking the MVP)

5-Day SSB Mission programme · Groups · Leaderboard · Achievements · Career Guide · advanced live
classes · advanced events · advanced attendance · advanced messaging · advanced analytics · advanced
reports · AI Mentor · Mentor AI Assistant · Earnings · complex scheduling · full ERP · complex finance ·
automated billing · voice and video practice workflows.

---

## 11. Priority Queue

**Re-sequenced 2026-09-18** — auth (T013/T014) moved to just before the quality/security audits
instead of right after the public shell. Rationale: user wants to see and review the built-out product
end to end first; every screen below is built on isolated mock data per `AGENTS.md` §8 until real auth
lands. No screen may be presented as authorization-checked before then.

```text
1.  Repository inspection (T001)                                          [x]
2.  Development standards (T002)                                          [x]
3.  Design tokens + capsule primitives (T003, T004)                       [x]
4.  Base UI system (T005)                                                 [x]
5.  Public shell + landing (T010, T011)                                   [x]
6.  Student layout, no auth guard yet (T020)                              [x]
7.  Student onboarding + dashboard, mock data (T030, T031)                [x]
8.  Practice zone + submission (T032, T033)                               [x]
9.  Student progress, resources, profile (T036–T038)                     [x]
10. Mentor layout, dashboard, mentees, evaluations, sessions, profile
    (T021, T040–T045)                                                    [x]
11. Academy layout, dashboard, students, batches, mentors, reports,
    settings (T022, T050–T055)                                          [x]
12. Authentication (T013) + Role-based access (T014) — real Supabase auth + route guards        [x]
13. AI feedback + failure handling (T034, T035) ← blocked: B3            ← up next (needs decision)
14. Quality and security audits (T060–T066)
15. MVP polish (T070–T072)
```

---

## 12. MVP Ready Checklist

- [ ] Student completes the core practice loop
- [ ] AI feedback works, or fails safely without losing the response
- [ ] Mentor can review students and submit evaluations
- [ ] Academy can manage students, batches and mentors
- [ ] Role-based access enforced server-side
- [ ] Academy data isolation verified (IDOR tested)
- [ ] Critical error states work
- [ ] Responsive UI verified 320px → 1920px
- [ ] Accessibility basics verified with the glass effect applied
- [ ] Critical tests pass
- [ ] Production build succeeds
- [ ] No secrets exposed
- [ ] No mock data in production paths
- [ ] Every screen passes `AGENTS.md` §7.11

---

## 13. Update Format

Append an entry whenever meaningful development happens, and update the sections above in the same
commit:

```text
Date:
Task:
Status:
What changed:
What remains:
Blocker:
Next task:
```

Example:

```text
Date: 2026-09-20
Task: T032 — Practice Zone
Status: In Progress

What changed:
- Practice list and detail screens built on capsule primitives
- Response form implemented

What remains:
- Submission API integration
- Error handling
- Tests

Blocker:
- B4 (TAT/WAT/SRT/SDT timing rules undecided)

Next task:
- T033 — Practice Submission
```

---

## 13a. Update Log

```text
Date: 2026-09-18
Task: T020, T030, T031 — Student layout, onboarding, dashboard
Status: Complete (verified)

What changed:
- app/student/layout.tsx, components/student/student-header.tsx, components/student/student-nav.tsx:
  Student shell with Dashboard/Practice/Progress/Resources/Profile nav (CapsuleSmall), notifications
  popover (empty state), profile dropdown menu. Installed shadcn dropdown-menu + popover.
- components/ui/capsule.tsx: added dashboard/resources/profile icons to the registry.
- app/onboarding/page.tsx, components/student/onboarding-form.tsx: onboarding form with validation,
  localStorage draft persistence, client-side completion flag.
- app/student/page.tsx: dashboard with zero-activity and populated (?preview=active) states.
- app/student/{practice,progress,resources,profile}/page.tsx: "coming soon" stubs.
- types/student.ts, lib/mock/student.ts, lib/api/student.ts: student domain contract + isolated mock
  data + API client per AGENTS.md §8/§9.

What remains:
- T032/T033 Practice Zone — blocked on B4 (timing rules).
- T021/T022 Mentor/Academy layouts not started.
- Real auth (T013/T014) — deferred by decision, not started.

Blocker:
- B4 (TAT/WAT/SRT/SDT timing rules undecided) blocks T032.

Next task:
- T032 — Practice Zone (needs B4 decided first).
```

```text
Date: 2026-09-18
Task: T032, T033, T036, T037, T038 — Practice Zone, submission, progress, resources, profile
Status: Complete (verified)

What changed:
- B4 resolved: standard SSB timing (TAT 30s/pic+4min write ×12+1, WAT 15s/word ×60, SRT 30min/60,
  SDT 15min/5). lib/practice/config.ts encodes it.
- types/practice.ts, lib/mock/practice.ts, lib/api/practice.ts: practice domain + mock content
  (12 TAT scenes as text descriptions — no image pipeline yet, B5 — + 60 WAT words + 60 SRT
  situations + 5 standard SDT prompts) + idempotency-keyed submission API.
- hooks/use-countdown.ts, components/practice/carousel-runner.tsx (TAT/WAT),
  components/practice/budget-runner.tsx (SRT/SDT), components/practice/practice-session.tsx:
  instructions → timed response → submit → confirmation flow, beforeunload guard while in progress,
  retry-safe error state that never loses responses.
- app/student/practice/page.tsx, .../psychology/page.tsx, .../psychology/[test]/page.tsx,
  .../interview/page.tsx: category → activity list → session pages.
- types/progress.ts, lib/mock/progress.ts, lib/api/progress.ts, app/student/progress/page.tsx:
  real Progress page (readiness, trend, skill areas, improvement areas, activity history).
- types/resources.ts, lib/mock/resources.ts, lib/api/resources.ts,
  components/student/resource-read-badge.tsx, resource-read-toggle.tsx,
  lib/student/resource-completion.ts, app/student/resources/page.tsx + [slug]/page.tsx: real
  Resources list/detail with a persisted (localStorage) read state.
- lib/student/profile-storage.ts, components/student/profile-form.tsx,
  app/student/profile/page.tsx: real editable Profile form, validated, localStorage-persisted.

What remains:
- T034/T035 AI feedback — blocked on B3 (AI provider decision, not yet raised with the user).
- T021/T022 Mentor/Academy layouts not started.
- Real auth (T013/T014) — deferred by decision, not started.
- Interview practice has no spec'd activities — left as an explicit stub, not fabricated content.

Blocker:
- B3 (AI provider undecided) blocks T034/T035 — the only remaining gap in the Student section.

Next task:
- Resolve B3, or move to Mentor (T021/T040+) / Academy (T022/T050+).
```

```text
Date: 2026-09-19
Task: T021, T040–T045 — Mentor layout, dashboard, mentees, evaluations, sessions, profile
Status: Complete (verified)

What changed:
- types/mentor.ts, lib/mock/mentor.ts (6 mentees, 3 evaluations, 2 sessions, mentor "Kavita Sharma"
  — same name as the student dashboard's mock upcoming session, for continuity), lib/api/mentor.ts
  (read-only client).
- lib/actions/mentor.ts: submitEvaluationAction, createSessionAction, cancelSessionAction as Next.js
  Server Actions with revalidatePath — NOT plain functions. A plain async function called from a
  Client Component would have mutated the client's own bundled copy of lib/mock/mentor.ts, invisible
  to every server-rendered mentor page. Caught this before shipping it; documented in both files.
- lib/mock/mentor.ts: menteeSummaries converted from a precomputed array to getMenteeSummaries(), for
  the same reason — a one-time .map() would have frozen stale evaluationStatus values.
- components/mentor/{mentor-header,mentor-nav}.tsx, app/mentor/layout.tsx: mirrors the student shell.
- app/mentor/page.tsx: dashboard (mentee count, sessions, pending evaluations, average score,
  attention list with stated reasons, today's schedule, progress overview, recent evaluations).
- app/mentor/mentees/page.tsx + [id]/page.tsx: list + detail (404 on unknown id; AI feedback section
  is an honest empty state, not fabricated, since T034 isn't built).
- app/mentor/evaluations/page.tsx + new/page.tsx, components/mentor/evaluation-form.tsx:
  idempotency-keyed submission, localStorage draft recovery per mentee.
- app/mentor/sessions/page.tsx, components/mentor/sessions-view.tsx: create/cancel, reflected
  immediately via router.refresh() + revalidatePath.
- lib/mentor/profile-storage.ts, components/mentor/profile-form.tsx, app/mentor/profile/page.tsx.

What remains:
- T034/T035 AI feedback — still blocked on B3.
- T022/T050+ Academy experience not started.
- Real auth (T013/T014) — deferred by decision, not started.

Blocker:
- B3 (AI provider undecided) — the only remaining Student-side gap; doesn't block Mentor or Academy.

Next task:
- Academy experience (T022, T050+), or resolve B3.
```

```text
Date: 2026-09-19
Task: T022, T050–T055 — Academy layout, dashboard, students, batches, mentors, reports, settings
Status: Complete (verified)

What changed:
- types/academy.ts, lib/mock/academy.ts (8 students, 3 batches, 2 mentors — one active, one
  invited-not-accepted — academy "Horizon SSB Academy", same name already used in the student/mentor
  mock data for continuity), lib/api/academy.ts (reads), lib/actions/academy.ts (Server Actions:
  addStudentAction, setStudentStatusAction, assignStudentBatchAction, createBatchAction,
  assignBatchMentorAction, removeStudentFromBatchAction, inviteMentorAction, updateSettingsAction —
  same Server Action pattern as lib/actions/mentor.ts, applied from the start this time).
- components/academy/{academy-header,academy-nav}.tsx, app/academy/layout.tsx: mirrors
  student/mentor shells.
- app/academy/page.tsx: dashboard (totals, alerts for unmentored batches / pending invites, students
  needing attention, batch performance, mentor overview, quick-action capsules).
- app/academy/students/page.tsx + [id]/page.tsx: list, add-student form, detail with batch
  reassignment and active/inactive toggle.
- app/academy/batches/page.tsx + [id]/page.tsx: list, create-batch form, detail with mentor
  assignment and member add/remove (removing preserves the student's own record, doesn't delete it).
- app/academy/mentors/page.tsx: list + invite form; invited mentors visibly distinguished from active.
- app/academy/reports/page.tsx: readiness distribution, batch performance, activity summary, mentor
  workload — each states insufficient data plainly rather than faking a chart.
- app/academy/settings/page.tsx: academy name / contact email / admin name, Server Action-backed.
- Added a third "Preview (no login yet)" button to the landing page's "For Academies" card, linking
  to /academy — matching the student and mentor ones already there.

What remains:
- T034/T035 AI feedback — still blocked on B3. This is now the only unbuilt MVP feature area.
- Real auth (T013/T014) — deferred by decision, not started.
- Phase 6 quality/security audits (T060–T066) — not started; the no-auth-guard gap across all three
  role areas is the main thing they'll need to close.

Blocker:
- B3 (AI provider undecided).

Next task:
- Resolve B3 (AI feedback), or move to T013/T014 (real auth) now that all three role UIs exist to
  wire it into.
```

```text
Date: 2026-09-19
Task: T013, T014 — Real authentication + role-based access control
Status: Complete (verified — build/lint/type-check + middleware smoke-tested; real signup/login not
yet click-tested in a browser by the agent this session, no Chrome extension connection)

What changed:
- Installed @supabase/supabase-js, @supabase/ssr.
- .env.local (gitignored): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY — real project credentials, provided by the user.
- lib/supabase/{client,server,admin}.ts: browser/server/service-role Supabase clients.
- supabase/migrations/0001_init_auth.sql: user_role enum, academies + profiles tables, RLS
  (self-access + academy-member read), handle_new_user trigger (creates a profile, and an academy
  row for academy_admin signups, from auth signup metadata). User must run this in the Supabase SQL
  Editor — it is not applied automatically.
- types/auth.ts, lib/api/auth.ts: signUp/logIn/requestPasswordReset/updatePassword + validation.
- lib/auth/session.ts (getCurrentUserAndProfile), lib/auth/actions.ts (logoutAction Server Action),
  lib/auth/redirect.ts (dashboardPathForRole).
- lib/supabase/middleware.ts + middleware.ts (T014): maps /onboarding + /student → student,
  /mentor → mentor, /academy → academy_admin; unauthenticated → /login?reason=login_required;
  wrong role → /forbidden. Verified with curl (all four protected prefixes redirect correctly when
  logged out).
- app/forbidden/page.tsx, app/auth/callback/route.ts (exchanges the Supabase email-link code for a
  session, used by both password reset and mentor-invite acceptance).
- components/auth/{login-form,signup-form,forgot-password-form,reset-password-form}.tsx replacing
  the placeholder /login and /signup pages; added /forgot-password and /reset-password pages.
- Signup offers Student / Academy Admin only (Mentor is invite-only, per specs.md §8.5 — user
  decision, not inferred).
- Real mentor invites: lib/actions/academy.ts inviteMentorAction now calls
  admin.auth.admin.inviteUserByEmail (service-role client) to create an actual Supabase account and
  send a real invite email, in addition to the existing mock MENTORS entry (documented bridge — see
  Technical Debt). app/mentor/layout.tsx flips that mock entry from "invited" to "active" the first
  time the real mentor's own dashboard loads.
- Student/Mentor/Academy headers: real signed-in user's name (via getCurrentUserAndProfile) replaces
  the mock name constants; added a real "Log out" item to each profile dropdown (logoutAction).
- "Load demo data" / "Clear demo data": lib/mock/{mentor,academy}.ts snapshot their initial arrays
  at module load; Server Actions reset or empty the live arrays from that snapshot. Wired into
  Academy → Settings and Mentor → Profile. Student has no shared mutable mock state, so
  components/student/reset-local-data.tsx clears the relevant localStorage keys instead, on
  Student → Profile.
- Removed the three temporary "Preview (no login yet)" homepage buttons — real login/signup replace
  them as the entry path.

What remains:
- T034/T035 AI feedback — still blocked on B3. Only remaining MVP feature gap.
- Per-academy data isolation for students/mentees/batches/evaluations/sessions — still mock,
  in-memory, shared across every real account (Technical Debt). Needed before T060 can pass.
- User has not yet run the SQL migration or click-tested signup/login in a browser as of this
  entry — first attempt hit /forbidden because the migration hadn't been run yet (no profiles
  table), which is now understood and being retried with a fresh signup.

Blocker:
- B3 (AI provider undecided) — unrelated to auth, was already open.

Next task:
- Confirm real signup/login/logout work end-to-end in the browser (user testing in progress).
- Then resolve B3 (AI feedback), or scope the backend data migration needed to close the
  per-academy-isolation gap before Phase 6.
```

```text
Date: 2026-09-19
Task: App-wide design system replacement — "Glass Capsule" → "Apple-Inspired Glass UI v3"
Status: Complete (verified — build/lint/type-check clean; rendered-HTML checks on /, /login, /signup;
not yet visually confirmed in a live browser by the agent, no Chrome extension connection this
session — user should click through /student, /mentor, /academy to confirm)

What changed:
- User supplied a full design spec (`UI design.md`, repo root) and confirmed via direct questions:
  (1) applies app-wide, not just Academy Admin; (2) AGENTS.md §7 should be rewritten to make it the
  new binding system, superseding Glass Capsule in full.
- AGENTS.md §7 fully rewritten (tokens, app shell, page-header pattern, content patterns, typography,
  radius/shadow scale, responsive/accessibility/motion rules, screen acceptance test) plus two stray
  "capsule"/"navy" references elsewhere in the file corrected.
- app/globals.css rewritten: ink/surface/hairline tokens, --brand-accent (named to avoid colliding
  with shadcn's own --accent semantic slot), three glass tiers as plain CSS classes (glass-thin/
  regular/thick — stateful, so CSS not Tailwind utilities, same rule as before), radius scale wired
  into Tailwind's @theme (rounded-control/button/card/panel/pill), shadow-sm/md overridden to spec,
  shadow-glow-accent added, .nav-item / .filter-chip / .row-hover-tint state classes, .ambient-wash
  keyframe background. shadcn semantic tokens (--primary, --ring, etc.) remapped onto the new tokens.
- New shared layout: components/layout/{app-shell,sidebar,top-header,mobile-tab-bar}.tsx — one shell
  used identically by Student/Mentor/Academy layouts, replacing three separate per-role header/nav
  component sets (deleted).
- New shared content components: components/ui/{stat-card,page-header,list-panel,filter-chip,
  detail-header,status-tag,nav-icons}.tsx; empty-state/error-state/loading-state redesigned in place.
- Retired components/ui/capsule.tsx (CapsulePrimary/Secondary/Small) entirely — 9 call sites migrated
  to the new components (FilterChip for role/stage toggles, ListPanel/ListRow for lists, StatCard for
  metrics, a custom Link card for Today's Mission).
- Full-codebase sweep (56 files) for now-deleted token names (glass-surface, text-text-primary/muted,
  brand-navy*, bg-bg-base/ambient) — mechanical renames where safe, structural rewrites where the old
  Capsule API was in use. Verified zero remaining references by grep after each pass.
- Typography consistency pass: remaining old-scale headers (text-2xl page titles, text-sm section
  headers, text-xs stat labels) bumped to the new 28px/700 · 18px/600 · 11px/600 scale across the
  handful of secondary pages that hadn't already been rewritten with the new shared components.

What remains (see Technical Debt):
- Secondary pages (batches, students, mentors, reports, settings, evaluations, sessions, resources
  detail, progress) still use ad-hoc glass-regular divs in some spots rather than StatCard/ListPanel —
  visually consistent (same tokens) but not yet using the shared components throughout.
- Dropdown menus / <Select> still shadcn's default solid chrome, not explicit glass-thick.
- Live browser visual confirmation still pending (user to check).

Blocker:
- None for this task. B3 (AI provider) remains open and unrelated.

Next task:
- User to visually confirm the redesign in a browser.
- Then: AI feedback (B3), backend data migration for per-academy isolation, or a full T070-style
  consistency pass on the remaining secondary pages.
```

## 14. North Star

> **Build the smallest reliable web product that proves students prepare better with structured
> practice, AI-assisted feedback, mentor guidance and academy visibility.**
