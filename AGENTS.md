# AGENTS.md — SSB Academy Web Platform

**Type:** Permanent engineering + agent rules.
**Authority:** Highest for *how* to build. `specs.md` is authoritative for *what* to build.
**Last structural revision:** 2026-09-16

---

## 0. File System of Record

Four files govern this project. Nothing else is authoritative.

| File | Answers | Changes when |
|---|---|---|
| `AGENTS.md` | How do we build? What must never be broken? | Architecture or conventions change |
| `specs.md` | What must the product do? | Product requirements change |
| `task.md` | What is being built, in what order? | Work starts, completes, or is blocked |
| `status.md` | What is the exact state today? | Any meaningful development happens |

### Conflict resolution order

```text
1. Actual verified code
2. specs.md        (product intent)
3. AGENTS.md       (engineering rules)
4. task.md         (sequencing)
5. status.md       (reporting only — never a source of requirements)
```

**Decision (2026-09-16):** `CLAUDE.md` is **no longer authoritative**. Earlier revisions of these
files pointed to it for architecture and product rules; that content now lives here. If `CLAUDE.md`
exists in the repository, reduce it to a pointer to this file or delete it. Do not add new rules to it.

If two files disagree, do **not** silently pick one. Apply the order above, implement accordingly,
and record the resolution in `status.md` → *Decisions*.

---

## 1. Project Overview

SSB Academy is a web platform for **Services Selection Board (SSB) preparation**, serving three roles:

- **Student** — practises, receives AI-assisted feedback, learns, tracks readiness.
- **Mentor** — reviews mentees, evaluates performance, runs sessions, gives feedback.
- **Academy Admin** — manages students, batches and mentors; monitors academy-level performance.

### Core loops

```text
Student   Onboard → Practice → AI Feedback → Improve → Practice Again
Mentor    View Mentees → Review Performance → Evaluate → Follow Up
Academy   Manage Students → Organise Batches → Monitor → Identify Attention Cases
```

Every feature must strengthen at least one loop. If it strengthens none, it does not belong in the
current milestone.

---

## 2. Product Principles

1. **Preparation first.** The platform exists to make students better prepared, not to display data.
2. **Smallest reliable implementation.** Prefer the version that validates the product.
3. **Dashboards are decision tools.** Every dashboard must make the next action obvious.
4. **AI assists; humans decide.** AI output is never presented as an SSB selection outcome.
5. **No fabricated data.** Never display invented metrics, scores, evaluations or activity.
6. **Role-scoped experience.** Roles get different products, not one product with hidden buttons.
7. **Academy isolation is a security boundary,** not a UI filter.
8. **One design system.** See §7. Deviating is a bug, not a style choice.
9. **MVP discipline.** Visual references are direction, not a build order.

---

## 3. Technology Stack

Use the stack already installed in the repository. Do not migrate frameworks, replace libraries, or
introduce a second solution to a solved problem without written approval.

- Next.js (App Router) · React · TypeScript (strict)
- Tailwind CSS · shadcn/ui · Lucide icons
- Recharts — only where a chart answers a real question
- ESLint · Prettier

```text
Browser
   ↓
Next.js Web Application   (UI, routing, server components, route handlers)
   ↓
Backend API               (authoritative business logic + authorization)
   ↓
PostgreSQL / AI Provider / Object Storage
```

**Hard boundary:** browser code must never hold database credentials, AI provider keys, storage
credentials or any backend secret. The frontend consumes an *application-level* AI feedback endpoint,
never a provider SDK directly.

---

## 4. Mandatory Inspection Protocol

Before writing code for a task, an agent **must**:

1. Read the task in `task.md`, including its acceptance criteria.
2. Read the relevant section of `specs.md`.
3. Inspect the actual repository: routing, components, hooks, API client, types, tokens.
4. Identify every consumer of any subsystem being modified — data flow, lifecycle, dependencies.
5. Prefer extending an existing abstraction over creating a parallel one.
6. State assumptions explicitly when something cannot be verified.

> **Before modifying an existing subsystem, understand its current data flow, dependencies,
> lifecycle, and consumers.**

Never claim a task is complete without verifying behaviour. A rendering UI is not evidence that a
feature works.

---

## 5. Directory & Component Conventions

```text
app/                    routes (App Router)
components/
  ui/                   primitives (shadcn + Glass UI primitives — cards, nav, stat cards)
  layout/               shells, navigation, headers
  student/  mentor/  academy/
  practice/  evaluation/  charts/
lib/
  api/                  typed API client — the ONLY place fetch calls live
  auth/
  utils/
hooks/
types/
styles/                 design tokens
```

- No raw `fetch` inside a component or page; route it through `lib/api`.
- Domain components are justified when reused or when they isolate real behaviour — not to inflate
  component count.
- One icon family (Lucide). Never mix icon libraries.
- Before creating a component, search for an existing one that already does it.
- className merging uses the official `cn` package (`import { cn } from "cn"`) everywhere — this is
  what every `shadcn add`-generated component already imports, not a project-local wrapper. `lib/utils/`
  is for other future helpers (formatting, validation, ...), not a second `cn` implementation.

---

## 6. State Management

- Server Components by default; `"use client"` only where interaction requires it.
- Keep state local. Do not add global state for data one screen owns.
- Avoid `useEffect` for data that can be fetched on the server.
- Never create a second source of truth for something the API owns.
- Business logic lives in hooks or server code, not in presentational components.

---

## 7. Design System — Apple-Inspired Glass UI v3 (MANDATORY)

Project-wide requirement, for every section of the app — public site, Student, Mentor, Academy Admin,
and anything added later. Any new screen must be buildable entirely from the tokens and patterns
below, without inventing new colours, radii, shadows or motion values.

**This section supersedes all earlier visual guidance in these files, in full**, specifically the
2026-09-16 "Glass Capsule Interface" system (capsule-shaped nav, navy brand colour, the
`CapsulePrimary`/`CapsuleSecondary`/`CapsuleSmall` hierarchy). Decision recorded in `status.md`,
2026-09-19. The full source design spec lives in `UI design.md` at the repo root — that file is
descriptive reference material, not one of the four governing files in §0; this section is the
binding, authoritative summary of it.

### 7.1 Visual direction

The whole product reads as **one continuous surface**, not a dashboard with separate "app" pages
bolted on. Whether the user is on the Dashboard, a Students table, a Batch detail view, or Settings,
they see the same glass material, the same near-zero colour palette, the same radius/shadow/motion
system. The interface feels: quiet, precise, spacious, almost monochrome, effortless, native (not
"web glassy"), and consistent from screen to screen.

Biggest failure mode to avoid: giving a section its own accent colour or card style "because it's a
different feature." Category is never colour-coded through UI chrome — only the three status colours
(§7.2) may distinguish real states, applied as small tags/dots, never as whole-card or whole-icon
accents.

### 7.2 Design tokens (centralised — no scattered literals)

```text
Glass materials (three tiers, never a fourth):
  --glass-thin     blur(12px) saturate(140%)   bg rgba(255,255,255,0.55)  border rgba(255,255,255,0.35)
  --glass-regular  blur(20px) saturate(150%)   bg rgba(255,255,255,0.65)  border rgba(255,255,255,0.40)
  --glass-thick    blur(32px) saturate(160%)   bg rgba(255,255,255,0.75)  border rgba(255,255,255,0.50)
  (glass-thin: chips/tags/tooltips/search/row-hover · glass-regular: cards/panels/tables/forms ·
   glass-thick: sidebar/header/modals/drawers)

Colour (one near-monochrome system, unchanged per section):
  --ink            #1C1C1E   (primary text)
  --ink-secondary  #6E6E73   (muted text)
  --surface-base   #F5F5F7
  --hairline       rgba(0,0,0,0.08)
  --accent         #4A55E8   (indigo — the ONLY saturated colour in normal UI chrome)
  --accent-2       #6C63F2   (gradient partner for --accent)
  --status-success #34C759   --status-warning #FF9F0A   --status-danger #FF3B30

Radius (one scale — nothing outside it):
  --radius-control 12px   (chips, tags)
  --radius-button  14px   (buttons)
  --radius-card    20px   (content/stat/table-row cards)
  --radius-panel   24px   (sidebar, header, modals, section containers)
  --radius-pill    999px  (nav items, search bars, filter chips)

Shadows (one scale):
  --shadow-sm         0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.03)
  --shadow-md         0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)
  --shadow-glow-accent 0 4px 16px rgba(74,85,232,0.20)   (primary buttons + active nav ONLY)

Motion:
  --motion-duration 180–220ms   --motion-easing cubic-bezier(0.4, 0, 0.2, 1)
```

One-off values in components are a review failure. If a value is needed twice, it is a token.

### 7.3 App shell (persists across every authenticated section)

```text
┌──────────────────────────────────────────────────────────────┐
│                    Top Header (glass-thick, 64px)              │
├───────────────┬──────────────────────────────────────────────┤
│   Sidebar     │              Content Region                    │
│  (glass-thick)│   Page header (title + primary action)          │
│   role nav    │   Filters / search (if list-based)               │
│               │   Main content pattern (see §7.5)                │
└───────────────┴──────────────────────────────────────────────┘
```

Content region: max-width `1120px`, centred, side padding min `32px` (`48px` at ≥1440px), `8px` base
grid, section gaps `32px`, card padding `24px`, internal gaps `12–16px` — identical across Student,
Mentor and Academy.

**Sidebar:** items are that role's nav (e.g. Student: Dashboard/Practice/Progress/Resources/Profile;
Mentor: Dashboard/Mentees/Evaluations/Sessions/Profile; Academy:
Dashboard/Students/Batches/Mentors/Reports/Settings). Same treatment for every item, no per-item
colour coding. Inactive: transparent, icon+text in `--ink-secondary`. Active: `--accent → --accent-2`
gradient fill, white text/icon, `--shadow-glow-accent` — the only place gradient fill appears besides
a page's primary button. Hover (inactive): `translateY(-1px)`, background → `rgba(0,0,0,0.04)`, icon
scale `1.05`, `160–200ms`.

**Top header:** `glass-thick`, `64px`. Left: `glass-thin` search capsule, placeholder text scoped to
the section ("Search students…", "Search mentors…"), same component everywhere. Right: notification
button (`glass-thin`, circular, `6px` solid indigo dot, no glow/pulse), avatar, name + role label,
chevron.

**Mobile:** sidebar collapses into a floating bottom tab bar (`glass-thick`, `16px` margin). Single
column content, `16–20px` padding.

**Public site** (no authenticated shell): keep the same ink/glass/accent tokens and shared ambient
background, but without the sidebar — same visual system, marketing layout.

### 7.4 Page header pattern (every section uses this)

Title (section name, large/bold, §7.7) → optional one-line subtitle → primary action right-aligned
(`--accent` gradient button, the *one* colour action for that screen — omit entirely if the section
has none, e.g. Settings) → secondary actions, if any, as `glass-regular` buttons beside it. No section
gets a different header layout, size or colour treatment.

### 7.5 Reusable content patterns (build every screen from these)

- **Stat/KPI cards** — `glass-regular`, small line icon (`--ink-secondary`), uppercase label, large
  bold value, optional status-coloured delta, optional muted sparkline. No per-section accent colours.
- **List/table views** — container `glass-regular`; row hover = `glass-thin` tint, no border-colour
  change; row selected = `rgba(74,85,232,0.06)` background, never a full accent fill; status shown via
  small text tags/dots (three status colours only), never full-row colouring; sticky header row
  (`--ink-secondary`, uppercase, `11px`); empty → Empty State pattern; row actions as icon buttons on
  hover (`--ink-secondary`, danger red only on a destructive icon, on hover).
- **Detail/profile views** — header block (avatar/initial glyph + name/title + status tag) in a
  `glass-regular` panel; below, a 2–3 column grid of `glass-regular` info cards (same styling as stat
  cards, holding text instead of numbers); activity/history as a vertical timeline, `--ink-secondary`
  connector line, status dots only on events.
- **Empty states** (one pattern, reused everywhere) — small line icon (`--ink-secondary`), one bold
  primary line, one muted secondary line naming the resolving action, optional inline `--accent` text
  link. Never a large illustration; never more than two lines of copy.
- **Forms & modals** — modal container `glass-thick`, `--radius-panel`, centred, max-width
  `480–560px`; inputs `glass-thin`, `--radius-control`, hairline border, `2px` accent focus ring
  (same token everywhere); primary submit = accent gradient button; cancel/secondary = `glass-regular`
  text button, no fill.
- **Filters & search** — filter chips `glass-thin`, pill radius, `--ink-secondary` inactive,
  accent-outlined (not filled) when active; search bar identical component to the header search,
  scoped to the section's records.

Nothing above introduces new visual rules per section — sections differ only in *which* patterns they
combine (Dashboard: quick-action capsules + stat cards + attention panel + analytics; Students/
Batches/Mentors: stat cards + filters + table/list + detail view; Reports: stat summary + chart panels
+ optional table; Settings: grouped form panels only, no stat cards, no tables, no primary action).

### 7.6 Animated icons (global icon behaviour)

Same motion rules regardless of where an icon appears (sidebar, table row, card, empty state): small,
purposeful, never decorative. Max amplitude anywhere in the app: `2px` translate / `5%` scale / `10°`
rotate. Notification bell: single `±4°` shake only on a genuinely new item, never a loop.

### 7.7 Typography (one scale, all sections)

Primary: SF Pro Display / SF Pro Text (fallback `-apple-system, "Inter", "Manrope", sans-serif`).

| Role | Size | Weight | Colour |
|---|---|---|---|
| Page title | 28–32px | 700 | `--ink` |
| Section/card title | 18–20px | 600 | `--ink` |
| Card label (uppercase) | 11px | 600, `+0.04em` | `--ink-secondary` |
| Stat/KPI value | 28–32px | 700 | `--ink` |
| Body / description | 14–15px | 400–500 | `--ink-secondary` |
| Table header | 11px | 600, uppercase | `--ink-secondary` |
| Micro text (timestamps, meta) | 12–13px | 400 | `--ink-secondary` @70% |

Only two font weights visible on any single screen at once.

### 7.8 Card & row hover motion (one pattern, all sections)

```text
Rest:    translateY(0)      shadow: --shadow-sm
Hover:   translateY(-2px)   shadow: --shadow-md   border opacity +10%
Active:  translateY(0)      scale(0.99)
```

`180–220ms`, `--motion-easing`. Table rows use a lighter version: background tint only, no vertical
translate. `prefers-reduced-motion: reduce` freezes the shared ambient background on one frame,
disables icon/card motion app-wide, and keeps only opacity/colour transitions.

### 7.9 Responsive behaviour (applies to every section)

- **≥1440px:** sidebar `260px`; stat cards 4-up; tables full width within the `1120px` content max;
  two-column panels where a section calls for them.
- **900–1439px:** sidebar narrows to `220px` or icon-only rail; stat cards 2×2; two-column panels
  stack to one column if tight; tables gain horizontal scroll before columns are dropped.
- **<900px:** sidebar → floating bottom tab bar; stat cards 1 column; tables become stacked record
  cards (one `glass-regular` card per row, label/value pairs inside), not horizontal-scrolling tables;
  filters collapse into a single "Filters" sheet trigger; search goes full width.

No horizontal page overflow at any breakpoint, in any section.

### 7.10 Accessibility

Full keyboard navigation and logical tab order everywhere; visible focus ring `2px solid var(--accent)`
with `2px` offset, identical token in forms/tables/nav/filters; every icon has an `aria-label`,
including table row action icons; real `<button>`/`<a>`/`<table>` semantics, never `<div>`
substitutes; text contrast ≥ 4.5:1 against glass at its lightest resting opacity (0.5 alpha), tested
per material tier; touch targets ≥ `44px` including mobile card row actions; **status is never
colour-only** — pair colour with an icon or text label (e.g. "At risk" text + dot, not a red row
alone).

### 7.11 Motion principles

Use only: fade, small translate (≤2px), soft scale (≤5%), gentle gradient drift, subtle shadow/border
change on hover/focus. Avoid everywhere: bouncing, decorative spinners, parallax, flashing, particles,
hue-cycling backgrounds, elastic/overshoot easing, and route-transition animations that differ section
to section — moving between sections must feel like the same app, not a scene change.

### 7.12 Implementation constraints (still binding — verified true regardless of visual language)

- **Icon props cross component boundaries as names, not references.** A Lucide icon component cannot
  be serialized from a Server Component into a `"use client"` component as a prop — passing the
  component reference or a rendered `<Icon />` element both fail at runtime. Any nav item/button/card
  that takes an icon must accept a string key resolved against an internal icon registry inside the
  client component's own file.
- **Stateful glass surface styling lives in CSS, never as Tailwind utilities on the component.** A
  shared `.glass-surface`-style base class that sets `background`/`border`/`box-shadow` as plain
  (unlayered) CSS in `app/globals.css` always overrides Tailwind's own layered utility classes for
  those same properties — a `border-*`/`bg-*`/`shadow-*`/`ring-*` utility applied conditionally in a
  component will silently do nothing. Add new visual states (selected, error, focus, etc.) as
  modifier classes next to the base class itself, not as component-level Tailwind conditionals.

### 7.13 Screen acceptance test

A screen is not complete until all are "yes": 1. Reads as the same app as every other section ·
2. Primary action obvious and singular · 3. No section-specific accent colour · 4. Correct glass tier
used for each surface · 5. Radius/shadow/motion all from the token scale · 6. Status shown via colour
+ icon/text, never colour alone · 7. Typography scale followed, ≤2 weights per screen · 8. Works
mobile → large desktop with no horizontal overflow · 9. Empty states use the one shared pattern ·
10. Reduced-motion respected.

### 7.14 North star

> One system, many sections. Dashboard, Students, Batches, Mentors, Reports, Settings — and Student
> and Mentor's own sections — are all expressions of the same material, colour, type, radius, shadow
> and motion tokens. Never section-specific variants of them.
>
> The result should feel like a single Apple-designed app with several sections — like System Settings
> or Health — not a collection of differently themed dashboards stitched together.

This principle outranks adding more visual elements.

---

## 8. Data Integrity

- Dashboard numbers come from real data. Never hardcode figures such as `12,842 users`,
  `₹18,75,000`, `72% readiness`, `1,240 XP`.
- Reference designs are **visual examples, not production data** — including names, dates, scores,
  avatars, ratings, batch names and academy names.
- Mock data is allowed only when (a) the backend is not connected yet and (b) it is shaped so an API
  response replaces it without touching components.
- Mock data must be isolated, clearly named, and must never ship to production.
- Never mix mock and real data silently in one view.

---

## 9. API Rules

```text
Page / Component → hook or server function → lib/api client → Backend API
```

Every call handles: success · loading · empty · validation error · unauthorized · forbidden ·
not found · server error · timeout · network failure.

- API responses are typed; external data is validated at the boundary.
- Backend assumptions must not be scattered across UI components — they live in `lib/api` and `types/`.
- Until the backend contract is finalised (see `status.md` → Blockers), define the contract in
  `types/` first and implement against it.

---

## 10. Authentication, Authorization, Isolation

Roles: `STUDENT`, `MENTOR`, `ACADEMY_ADMIN`.

- Authentication and authorization are separate concerns.
- **Authorization is enforced server-side.** Hiding a route in the client is UX, not security.
- Never trust a role supplied by the browser.
- Handle expired sessions, unauthorized access and forbidden resources explicitly.

Academy isolation — verify on every sensitive request:

```text
Current User → Academy Membership → Requested Resource
```

Possession of an ID never grants access. A mentor in Academy A changing `/student/123` to
`/student/456` must be rejected server-side. **IDOR and cross-academy access are P0 security bugs.**

---

## 11. AI Feedback Rules

Feedback structure:

```text
Observation → Evidence → Impact → Improvement Action → Recommended Practice
```

Requirements: understandable, actionable, specific to the submitted response, respectful,
non-judgemental, visibly marked as AI-assisted.

Prohibited: psychological trait claims presented as fact, and any statement resembling "you will be
selected" or "you will fail SSB". AI provides preparation guidance, not selection decisions.

### AI failure handling (all must be handled)

timeout · provider outage · rate limit · malformed response · empty response · partial response ·
invalid content · network failure.

- Never expose API keys, internal prompts, stack traces or infrastructure details.
- The student's submitted response must survive any failure — never lose input.
- Always offer a recovery path (retry, or a clear "we'll notify you" state).
- **AI failure must never break the practice loop.**

---

## 12. Loading / Empty / Error / Success

Every data-driven feature defines all four:

- **Loading** — useful, not a blank screen.
- **Empty** — explains why there is nothing and what to do next.
- **Error** — plain language plus a recovery action. Never `PrismaClientKnownRequestError...`;
  instead: "We couldn't load this student's information. Please try again."
- **Success** — confirms important actions clearly.

---

## 13. Accessibility

Keyboard navigation · visible focus · semantic HTML · labelled inputs · announced form errors ·
correct heading hierarchy · sufficient contrast (glass included) · accessible button names ·
icon accessibility · sensible screen-reader structure · adequate touch targets.

**No critical action or status may depend on colour alone.** Always pair with text, icon or label.

---

## 14. Responsive

Desktop · laptop · tablet · mobile browser. Reflow content; do not scale a desktop layout down.
Pay particular attention to the sidebar/nav, stat cards, tables, charts, forms, dialogs and schedules.

---

## 15. Performance

Prefer server rendering where appropriate, minimal client JS, optimised images, pagination, efficient
requests, lazy loading of heavy UI, and avoiding duplicate requests or unnecessary re-renders.

Do not add caching infrastructure without a measured need. `backdrop-filter` is expensive — do not
stack blurred layers and do not animate blur.

---

## 16. Security

Never commit keys, passwords, tokens, database credentials, certificates or secrets. Use environment
variables. Also enforce input validation, output safety, server-side authorization, rate limiting
where required, secure sessions, safe file handling, and audit logging for sensitive administrative
actions.

---

## 17. Testing

Behaviour over test count. Critical coverage:

- **Student:** onboarding · practice submission · AI feedback success · AI feedback failure ·
  progress update
- **Mentor:** mentee access · evaluation submission · feedback
- **Academy:** student/batch/mentor access · reports · academy isolation
- **Security:** unauthorized route access · role violation · cross-academy resource access

---

## 18. Git Workflow

```text
feat: add student onboarding
fix: prevent cross-academy student access
fix: handle failed AI feedback
```

Not: `update`, `changes`, `final`, `fix stuff`.

Before a PR: run lint, run relevant tests, verify the build, inspect the diff, remove debug logs,
check for secrets, confirm unrelated files were untouched, and update `task.md` + `status.md`.

---

## 19. Regression Prevention — Agent Prohibitions

An agent must **not**:

- rewrite working architecture because it prefers a different pattern
- replace a library without written justification
- introduce a duplicate or parallel implementation of an existing system
- break one feature while fixing another
- change UI that was not in scope
- remove working functionality
- ignore existing abstractions, tokens or components
- create a temporary hack without recording it in `status.md` → *Technical Debt*
- leave a `TODO` that is not tracked as a task in `task.md`
- claim completion without verification

### Requires explicit approval before changing

- framework, router strategy, or state-management approach
- the design system in §7
- authentication or authorization model
- academy isolation rules
- the API contract shape
- the AI feedback contract in §11
- anything under `lib/api` consumed by multiple features

---

## 20. Documentation Rules

- Any meaningful change updates `status.md` in the format defined there.
- New work is a task in `task.md` with acceptance criteria — never an untracked side change.
- A new product requirement goes into `specs.md` first, then `task.md`.
- Use the status vocabulary consistently: `VERIFIED` · `UNVERIFIED` · `PARTIAL` · `BROKEN` ·
  `BLOCKED` · `DEFERRED`.
- Never write a claim about implementation that has not been verified in the repository.

---

## 21. Ambiguity Protocol

Inspect `specs.md` → inspect the implementation → infer only what is strongly supported → choose the
smallest reasonable implementation. **Ask** when the ambiguity affects security, architecture, data
model or major UX. Never silently invent product requirements.

---

## 22. Definition of Done

A feature is done only when all hold:

- UI works and conforms to §7
- required API integration works
- authorization is correct (server-side)
- loading, empty, error and success states exist
- validation works
- responsive behaviour verified
- accessibility basics addressed
- important behaviour is tested
- lint passes · build passes
- no secrets exposed · no debug code · no mock data in a production path
- unrelated files unmodified
- `task.md` and `status.md` updated

---

## 23. MVP Decision Filter

1. Does it directly improve SSB preparation?
2. Does it support the student, mentor or academy loop?
3. Is it required for the current milestone?
4. Can it be validated with something simpler?

If 1–3 are mostly "no", do not build it yet.

---

## 24. Final Agent Rule

> Does this make the SSB preparation platform simpler, clearer, safer or more useful?

The goal is not the largest platform. It is the **most useful SSB preparation platform with the
smallest reliable implementation**, expanded from real usage.
