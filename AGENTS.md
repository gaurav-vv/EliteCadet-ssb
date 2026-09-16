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
  ui/                   primitives (shadcn + capsule primitives)
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

## 7. Design System — Glass Capsule Interface (MANDATORY)

Project-wide requirement. Do not introduce unrelated UI patterns on individual pages without a strong
functional reason recorded in `status.md`.

**This section supersedes all earlier visual guidance in these files**, specifically:
- the previous "rounded cards / card-based dashboard" direction, and
- the previous colour rule that treated **purple** as the primary brand accent.

### 7.1 Visual language

The interface must read as Apple-like, clean, premium, minimal, calm, spacious, distraction-free and
consistent. Clarity and hierarchy beat density.

Avoid: excessive cards, excessive borders, heavy shadows, loud gradients, oversaturated colour,
cluttered dashboards, dense grids, decorative elements, competing visual containers.

### 7.2 Capsule-first

Major interactive options use rounded capsule surfaces, not rectangular cards. A capsule should feel
like a **floating glass control**, not a card in a stack.

Capsule traits: large radius · soft transparency · background blur · thin subtle border · very soft
shadow · clean typography · consistent internal padding · clear icon · smooth transition.

**Capsules are for navigation, actions, filters, categories, status and selection.** Paragraphs,
instructions, long-form explanations, tables and forms are *not* wrapped in capsules. "Capsule-first"
never means "put a capsule around every piece of text".

### 7.3 Three-level hierarchy (strict)

| Level | Used for | Traits |
|---|---|---|
| **Primary** | Major destinations — Mission, Practice, Progress | Larger, generous padding, larger icon, title + optional one-line description |
| **Secondary** | Inside a section — Psychology, TAT, WAT, SRT, SDT, modules | Medium, consistent icon + label, clear interaction state |
| **Small** | Filters, tags, status, difficulty, sort, quick actions | Compact, lightweight, scannable |

No fourth level, and no capsule that sits visually between two levels.

### 7.4 Glass effect

```text
Transparency + background blur + thin border + subtle shadow + large radius
```

Restrained. Blur and opacity must never push text or icon contrast below the requirements in §13.
If the glass hurts legibility, reduce the glass — never the contrast rules.

### 7.5 Background & branding

- Predominantly clean white / very light background.
- **Navy is the primary brand colour**: primary actions, important headings, selected states, brand
  elements, key navigation, important icons.
- Extremely subtle gradients and ambient colour variation only. No dramatic gradients.
- Semantic colour stays restrained: green = success, amber = attention, red = critical,
  blue = informational. Colour alone never carries meaning (§13).

### 7.6 Progressive disclosure & navigation

Do not expose every nested option at once.

```text
Home
 ├── Mission
 ├── Practice
 │    └── Psychology
 │         ├── TAT
 │         ├── WAT
 │         ├── SRT
 │         └── SDT
 └── Progress
```

```text
Click Practice → Practice capsules → Click Psychology → TAT / WAT / SRT / SDT
```

The user must always know where they are, how they got there, what the options are, and how to go
back. Nested navigation must never feel like a different application — same geometry, typography,
icons, spacing, transitions and branding. Only the content hierarchy changes.

### 7.7 Motion

- Hover (pointer devices): slight lift `translateY(-1px … -3px)`, scale ≈ `1.01–1.02`, marginally
  stronger shadow, smooth transition.
- Press: slight scale-down, quick feedback, smooth recovery.
- No bounce, no spring, no long or decorative transitions.
- Motion communicates navigation, state change, selection, feedback or loading — nothing else.
- `prefers-reduced-motion: reduce` must disable transform/opacity animation.

### 7.8 Interaction states

Every interactive capsule implements `default · hover · pressed · selected · disabled · loading ·
success · error`. Selected state uses subtle emphasis — slightly stronger border, slightly different
background, navy accent, soft shadow, small state indicator — never an aggressive colour flip.

### 7.9 Responsive capsules

Capsules must work on mobile, tablet, laptop, desktop and large displays. Do not shrink desktop
capsules; adapt padding, font size, icon size, layout, column count and width. Primary capsules may
go full-width or horizontally scrollable on small screens; small capsules may scroll horizontally
rather than wrap into a messy grid.

### 7.10 Design tokens (centralised — no scattered literals)

Define once in the token layer and consume everywhere:

```text
--capsule-radius            --capsule-radius-sm
--glass-opacity             --glass-blur
--border-opacity            --shadow-soft / --shadow-hover
--brand-navy                --brand-navy-fg
--bg-base                   --bg-ambient
--text-primary              --text-muted
--space-1 … --space-n
--motion-duration           --motion-easing
```

One-off values in components are a review failure. If a value is needed twice, it is a token. If the
repository already has a spacing/token system, reuse it rather than adding a second one.

### 7.11 Screen acceptance test

A screen is not complete until all twelve are "yes":

1. Visually calm · 2. Primary action obvious · 3. Major options are appropriate capsules ·
4. Unnecessary information hidden until needed · 5. Capsule hierarchy clear · 6. Glass effect subtle ·
7. Navy branding consistent · 8. Spacing & typography consistent · 9. Icons consistent ·
10. Interactions smooth · 11. Works mobile → desktop · 12. Premium without visual noise

### 7.12 Implementation constraints (learned in T004 — binding)

- **Icon props cross component boundaries as names, not references.** A Lucide icon component
  cannot be serialized from a Server Component into a `"use client"` component as a prop — passing
  the component reference or a rendered `<Icon />` element both fail at runtime. Any capsule/button/etc.
  that takes an icon must accept a string key resolved against an internal icon registry inside the
  client component's own file (see `capsuleIcons` in `components/ui/capsule.tsx` for the pattern).
- **`.glass-surface` state styling lives in CSS, never as Tailwind utilities on the component.**
  `.glass-surface` sets `background`/`border`/`box-shadow` as plain (unlayered) CSS in
  `app/globals.css`, which always overrides Tailwind's own layered utility classes for those same
  properties — a `border-*`/`bg-*`/`shadow-*`/`ring-*` utility applied conditionally in a component
  will silently do nothing. Add new visual states (selected, error, focus, etc.) as
  `.glass-surface--*` rules next to `.glass-surface` itself.

### 7.13 North star

> Apple-like simplicity + glass capsule interaction + strong navy branding + progressive navigation
> + generous whitespace + extremely consistent components.
>
> "There is very little on the screen, but everything I need is immediately understandable."

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
Pay particular attention to navigation, capsules, tables, charts, forms, dialogs and schedules.

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
