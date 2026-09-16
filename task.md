# task.md — SSB Academy Web Platform Implementation Roadmap

**Type:** Single authoritative implementation roadmap.
**Authority:** Sequencing and acceptance. Requirements live in `specs.md`; rules live in `AGENTS.md`.
**Last structural revision:** 2026-09-16

---

## How to use this file

Every task carries: **ID · Priority · Status · Why · Depends on · Requirements · Acceptance · Tests**.

### Status legend

```text
[ ]  NOT STARTED
[-]  IN PROGRESS
[x]  COMPLETE (verified — implementation inspected, acceptance criteria met)
[~]  BLOCKED (dependency or decision missing)
[!]  NEEDS DECISION
```

### Priority legend

```text
P0  Required for MVP; blocks the core loop
P1  Required for MVP completeness, not for the first working loop
P2  Post-MVP
```

### Rules

- A task is never marked `[x]` on the strength of a rendering UI. Verify behaviour.
- Never start a `[~]` task by guessing the blocked decision — resolve it in `status.md` first.
- Update `status.md` in the same commit that changes a task's status.
- New work becomes a task here before it is written. No untracked side changes.

### Current state of the roadmap

T001–T005 are complete: the repository exists (Next.js/TypeScript/Tailwind scaffold via
`create-next-app`), the Glass Capsule design token layer (`app/globals.css`) is implemented,
`CapsulePrimary`/`CapsuleSecondary`/`CapsuleSmall` (`components/ui/capsule.tsx`) are built and
visually verified, and the base UI system (shadcn/ui — button, input, select, dialog, tabs, badge,
table, alert, label, textarea, separator, skeleton — plus custom `EmptyState`/`ErrorState`/
`LoadingState`) is installed, reconciled to the navy design tokens, and visually verified. See
`status.md` for the verified architecture snapshot. All remaining tasks are `[ ]` or `[~]` and have
not been verified as implemented.

---

# Phase 0 — Foundation

## T001 — Repository inspection & reconciliation — P0 — `[x]`

**Why:** Every other task assumes a known starting point. This roadmap currently assumes nothing
exists; that assumption must be replaced with fact.

**Depends on:** repository access.

**Requirements**
- Inspect structure, routing, existing components, hooks, API layer, types.
- Record installed versions: Next.js, React, TypeScript, Tailwind, shadcn/ui, Lucide.
- Record environment variables present and required.
- Record lint/build configuration and whether both pass.
- Identify reusable components, partial implementations, TODOs and dead code.
- Update `status.md` §Architecture and §Implementation with `VERIFIED` / `PARTIAL` / `BROKEN` marks.
- Re-mark any task below that is already implemented.

**Acceptance:** `status.md` contains no `UNVERIFIED` entry for anything that exists in the repository,
and no task here contradicts the code.

**Tests:** n/a (audit task). `npm run lint` and a production build must be attempted and their real
result recorded.

---

## T002 — Development standards — P0 — `[x]`

**Why:** Conventions decided after code exists are conventions that get violated.

**Depends on:** T001.

**Requirements:** confirm ESLint, Prettier, TypeScript strict mode, Tailwind config, shadcn/ui setup,
Lucide; agree file/folder naming; document deviations in `AGENTS.md` §5.

**Acceptance:** project installs, lints, type-checks and builds from a clean checkout with documented
commands.

**Tests:** CI-equivalent command sequence runs clean locally.

---

## T003 — Design token layer (Glass Capsule) — P0 — `[x]`

**Why:** The design system in `AGENTS.md` §7 is mandatory and token-driven. Building screens before
tokens guarantees scattered literals and an inconsistent UI.

**Depends on:** T002.

**Requirements**
- Implement every token listed in `AGENTS.md` §7.10 in the Tailwind/CSS layer.
- Navy brand scale, light background scale, muted text, glass opacity, blur, border opacity, two
  shadow levels, capsule radii, spacing scale, motion duration and easing.
- Provide a `prefers-reduced-motion` override that disables transform and opacity animation.
- No component may use a raw colour, radius, blur or duration literal after this task.

**Acceptance:** a token change (e.g. navy hue, capsule radius) propagates across the app without
editing any component.

**Tests:** lint rule or review checklist that flags raw hex values and arbitrary radii in components.

---

## T004 — Capsule primitive components — P0 — `[x]`

**Why:** The whole UI is built from three capsule levels. They must exist once, not per page.

**Depends on:** T003.

**Requirements**
- `CapsulePrimary`, `CapsuleSecondary`, `CapsuleSmall` — icon + label + optional description.
- All eight states: default, hover, pressed, selected, disabled, loading, success, error.
- Hover: `translateY(-1px…-3px)`, scale ≈ 1.01–1.02, slightly stronger shadow. Press: slight
  scale-down with smooth recovery. No spring, no bounce.
- Keyboard focusable with a visible focus ring; correct semantics (button vs link).
- Responsive sizing per `AGENTS.md` §7.9, including horizontal-scroll behaviour for small capsules.

**Acceptance:** all three levels render correctly at 320px, 768px, 1280px and 1920px; every state is
reachable by keyboard; reduced-motion disables animation; contrast passes with the glass applied.

**Tests:** interaction state test for one capsule level; axe/keyboard pass on a capsule group.

---

## T005 — Base UI system — P0 — `[x]`

**Why:** Non-capsule surfaces (forms, tables, dialogs) still need consistency.

**Depends on:** T003.

**Requirements:** typography scale, spacing usage, buttons, inputs, selects, dialogs, tabs, badges,
tables, alerts, and shared loading / empty / error state components.

**Acceptance:** all three role experiences consume the same primitives; no page defines its own
button, badge or empty state.

**Tests:** visual review against `AGENTS.md` §7.11 checklist.

---

# Phase 1 — Public Shell & Access

## T010 — Public layout — P0 — `[ ]`
**Depends on:** T004, T005.
**Requirements:** header, footer, primary CTA, responsive layout, correct metadata scaffolding.
**Acceptance:** layout holds at 320px–1920px with no horizontal overflow; nav is keyboard operable.

## T011 — Landing page — P0 — `[ ]`
**Why:** First contact with the product; drives signup.
**Depends on:** T010. **Spec:** `specs.md` §5.1.
**Requirements:** value proposition, student/mentor/academy benefits, AI-assisted preparation,
practice + feedback explanation, mentorship, progress tracking, CTA.
**Acceptance:** a visitor can state what the product does and how to start within one screen-scroll;
title, description and semantic headings present; no fabricated statistics or testimonials.
**Tests:** metadata smoke test; Lighthouse accessibility pass on the page.

## T012 — Pricing page — P1 — `[ ]`
**Depends on:** T010. **Spec:** `specs.md` §5.2.
**Requirements:** student plan(s), academy/demo CTA, clear plan information, responsive layout. No
billing integration.
**Acceptance:** no control implies a payment capability that does not exist.

## T013 — Authentication — P0 — `[~]` **BLOCKED**
**Blocked by:** auth provider decision (`status.md` → Decisions).
**Why:** Everything role-scoped depends on identity.
**Spec:** `specs.md` §5.3.
**Requirements:** login, signup, logout, session handling, password recovery if applicable,
role-aware redirect, expired-session handling. Secrets stay server-side.
**Acceptance:**
- Valid credentials reach the correct role dashboard.
- Invalid credentials produce a clear, non-enumerating error.
- Logout invalidates the session; back-navigation restores nothing.
- Session expiry redirects with a clear message.
**Tests:** login success, login failure, logout, expired session, redirect-by-role.

## T014 — Role-based access control — P0 — `[~]` **BLOCKED by T013**
**Why:** Role leakage is a P0 security class, not a UX defect.
**Requirements:** route groups per role, server-side authorization on every protected route and data
fetch, unauthorized state, forbidden state, session-expiry handling.
**Acceptance:** a user of one role receives a forbidden/not-found response for another role's route —
verified by direct URL entry, not by hidden navigation. Client-side hiding is never the only control.
**Tests:** unauthorized route access per role; role violation attempt; expired-session access.

---

# Phase 2 — Authenticated Shells

## T020 — Student layout — P0 — `[ ]`
## T021 — Mentor layout — P0 — `[ ]`
## T022 — Academy layout — P0 — `[ ]`

**Depends on:** T004, T014.
**Requirements (each):** navigation per `specs.md` role navigation (MVP-active items only), header,
profile menu, notifications surface, responsive navigation pattern, breadcrumb/back affordance for
nested capsule navigation.
**Acceptance (each):**
- Only MVP-active destinations appear; deferred features are absent, not stubbed.
- Nested navigation preserves the visual language (`AGENTS.md` §7.6).
- Navigation is fully keyboard operable and works at 320px without a shrunken desktop sidebar.
**Tests:** role navigation renders correct items per role.

---

# Phase 3 — Student MVP (core loop)

## T030 — Student onboarding — P0 — `[ ]`
**Depends on:** T013, T020. **Spec:** `specs.md` §6.2.
**Requirements:** student information, target exam / preparation stage, academy relationship where
applicable, preparation goals, validation, completion state.
**Acceptance:** new student completes onboarding and reaches the dashboard; cannot be silently
skipped or repeated; a refresh mid-flow does not lose entered data.
**Tests:** onboarding completion; validation failure; resume after refresh.

## T031 — Student dashboard — P0 — `[ ]`
**Depends on:** T030. **Spec:** `specs.md` §6.3.
**Requirements:** header, overall readiness, activity metrics, Today's Mission, upcoming session, My
Progress summary, recent activity, recommendations.
**Explicitly excluded:** Achievements, Leaderboard (deferred P2 — see `specs.md` §3).
**Acceptance:**
- Answers "what do I do today / how am I performing / what should I improve".
- Zero-activity student sees a coherent dashboard with a clear first action.
- No hardcoded metric exists anywhere in the component tree.
**Tests:** empty-state dashboard; populated dashboard; no-mock-data assertion.

## T032 — Practice Zone — P0 — `[~]` **NEEDS DECISION (timing rules)**
**Depends on:** T031. **Spec:** `specs.md` §6.4.
**Needs decision:** per-test timing for TAT, WAT, SRT, SDT. Do not guess — record the decision in
`status.md` first.
**Requirements:** practice list, categories as secondary capsules, practice detail, instructions,
question/task, response input, submit flow, loading and error states; Psychology (TAT/WAT/SRT/SDT)
and Interview categories.
**Acceptance:** only real activities are listed; instructions readable before any timed portion;
leaving mid-activity warns rather than silently discarding input.
**Tests:** category navigation; activity open; in-progress navigation guard.

## T033 — Practice submission — P0 — `[ ]`
**Depends on:** T032. **Spec:** `specs.md` §6.5.
**Requirements:** validation, submission state, duplicate prevention, network failure handling,
response preserved during processing.
**Acceptance:**
- One submit action creates exactly one submission; rapid clicks do not duplicate.
- Network failure leaves the response intact and re-submittable.
- Success/failure is never ambiguous to the user.
**Tests:** single submission; double-click idempotency; offline submit; navigate-away during submit.

## T034 — AI feedback — P0 — `[~]` **BLOCKED**
**Blocked by:** AI provider decision and the application-level feedback endpoint.
**Depends on:** T033. **Spec:** `specs.md` §6.6.
**Requirements:** feedback request through an application endpoint (never a provider SDK in the
browser), processing state, the five-part structure, AI-assisted indicator, retry.
**Acceptance:** feedback references the actual response; all five sections present or treated as
malformed; indicator visible without interaction; no selection-outcome or diagnostic claim.
**Tests:** successful feedback render; malformed response handling; disclaimer presence.

## T035 — AI failure handling — P0 — `[~]` **BLOCKED by T034**
**Requirements:** timeout, provider error, rate limit, empty response, malformed response, network
error, retry.
**Acceptance:** no failure loses the response; no failure exposes technical detail; retry or a clear
"try later" path always exists; the practice loop remains usable.
**Tests:** one test per failure mode, asserting response preservation and safe messaging.

## T036 — Student progress — P1 — `[ ]`
**Depends on:** T034. **Spec:** `specs.md` §6.8.
**Requirements:** overall readiness, practice performance, skill-area performance, activity history,
improvement areas, trends where data suffices.
**Acceptance:** no percentage without explainable derivation; insufficient data is stated, not faked.
**Tests:** insufficient-data state; populated state.

## T037 — Student resources — P1 — `[ ]`
**Requirements:** list, categories, detail, read/completion state where required.
**Acceptance:** empty state exists; completion state persists.

## T038 — Student profile — P1 — `[ ]`
**Requirements:** profile info, edit, validation, account settings.
**Acceptance:** edits persist; a failed save does not lose input.

---

# Phase 4 — Mentor MVP

## T040 — Mentor dashboard — P0 — `[ ]`
**Depends on:** T021, T014. **Spec:** `specs.md` §7.2.
**Acceptance:** the mentor can identify a concrete next action within one screen; a mentor with no
mentees sees a coherent empty state; all metrics real.

## T041 — Mentee list — P0 — `[ ]`
**Requirements:** list, search where necessary, useful filters, performance, weak areas, evaluation
status, last activity.
**Acceptance:** authorisation is enforced server-side, not by client filtering.
**Tests:** mentor sees only assigned mentees.

## T042 — Mentee detail — P0 — `[ ]`
**Requirements:** overview, batch, performance, activity, AI feedback, mentor feedback, evaluation
action, session action where applicable.
**Acceptance:** URL tampering to a non-assigned student returns forbidden/not-found with no partial
data leak.
**Tests:** IDOR attempt on mentee detail.

## T043 — Mentor evaluation — P0 — `[ ]`
**Spec:** `specs.md` §7.5.
**Acceptance:** draft recoverable; submission idempotent; evaluation appears on the student record
with evaluator and timestamp; only approved criteria used.
**Tests:** draft save/restore; double submit; student-side visibility.

## T044 — Mentor sessions (basic) — P1 — `[ ]`
**Requirements:** list, detail, create basic session, scheduled/completed/cancelled, join/view where
applicable. No complex scheduling infrastructure.
**Acceptance:** a created session appears on both mentor and student views; cancellation reflects in
both.

## T045 — Mentor profile — P1 — `[ ]`

---

# Phase 5 — Academy Admin MVP

## T050 — Academy dashboard — P0 — `[ ]`
**Spec:** `specs.md` §8.2.
**Acceptance:** every figure scoped to the admin's academy server-side; each chart has a stated
interpretation; attention signals state their reason and never judge character.

## T051 — Student management — P0 — `[ ]`
**Acceptance:** duplicate validation on add; auditable status changes; no cross-academy assignment.
**Tests:** cross-academy assignment rejected.

## T052 — Batch management — P0 — `[ ]`
**Acceptance:** removing a student from a batch preserves their history.

## T053 — Mentor management — P1 — `[ ]`
**Acceptance:** invited-but-not-accepted mentors are visibly distinct from active mentors.

## T054 — Academy reports — P1 — `[ ]`
**Acceptance:** insufficient data is stated plainly rather than rendered as an empty or misleading
chart.

## T055 — Academy profile & settings — P1 — `[ ]`

---

# Phase 6 — Cross-Cutting Quality

## T060 — Authorization audit — P0 — `[ ]`
**Covers:** role permissions, resource ownership, academy isolation, direct URL access, manipulated
IDs, expired sessions.
**Acceptance:** every finding is either fixed or filed as a P0 bug in `status.md`. No client-only
control remains on a sensitive path.
**Tests:** the full security set in `AGENTS.md` §17.

## T061 — State audit — P0 — `[ ]`
For every major feature: loading, empty, error, success, retry/recovery.
**Acceptance:** no feature reaches production with an undefined state; no raw technical error surfaces.

## T062 — Responsive audit — P0 — `[ ]`
Desktop, laptop, tablet, mobile; navigation, capsules, tables, charts, forms, dialogs.
**Acceptance:** no horizontal overflow at 320px; capsules adapt rather than shrink.

## T063 — Accessibility audit — P0 — `[ ]`
Keyboard, focus, labels, semantic headings, button names, contrast (with glass applied), screen-reader
structure, non-colour status, touch targets, reduced motion.
**Acceptance:** no critical action or status depends on colour alone; all interactive capsules are
keyboard reachable with visible focus.

## T064 — Performance audit — P1 — `[ ]`
Initial load, dashboard requests, duplicate requests, large lists, charts, images, client JS, and
blur cost (no stacked or animated `backdrop-filter`).
**Acceptance:** measured numbers recorded in `status.md`; no invented targets.

## T065 — Security audit — P0 — `[ ]`
No committed secrets, environment variables checked, server-side authorization, input validation,
cross-academy isolation, sensitive API responses, safe error messages, rate limiting where required.

## T066 — Critical testing — P0 — `[ ]`
Authentication, role access, onboarding, practice submission, AI feedback, AI failure, mentor
evaluation, academy access, academy isolation, form validation.
**Acceptance:** the suite runs in CI and fails the build on regression.

---

# Phase 7 — MVP Polish

## T070 — Design system consistency pass — P1 — `[ ]`
**Requirements:** verify every screen against `AGENTS.md` §7.11; remove card-stack clutter; confirm
capsule hierarchy, navy usage, icon family, spacing, typography, token usage.
**Acceptance:** zero raw colour/radius/blur/duration literals in components; all twelve checklist
answers are "yes" on every screen.

## T071 — Dashboard review — P1 — `[ ]`
Student: clear daily action, progress, improvement area.
Mentor: students needing attention, pending evaluations, schedule.
Academy: readiness, batch performance, students needing attention.

## T072 — Production readiness — P0 — `[ ]`
Production environment variables, build succeeds, lint succeeds, tests pass, security reviewed,
responsive reviewed, no debug logs, no mock data in production paths, public metadata reviewed.

---

# Post-MVP Backlog

## P1
5-Day SSB Mission programme · Mentorship booking · Live classes · Knowledge Base expansion ·
Assessments expansion · Announcements · Messages · Batch analytics · AI Mentor · Mentor AI Assistant ·
Advanced recommendations · Events · Attendance · Voice/video practice workflows.

## P2
Groups · Leaderboard · Achievements · Career Guide · Earnings · Advanced insights · Advanced reports ·
Advanced scheduling · Advanced communication · Automated billing.

---

# Task Execution Procedure

1. Read the task and its acceptance criteria.
2. Read the relevant `specs.md` section.
3. Inspect existing code and identify consumers (`AGENTS.md` §4).
4. Implement the smallest correct version.
5. Implement loading, empty, error and success states.
6. Verify authorization server-side.
7. Verify behaviour against the acceptance criteria — actually exercise it.
8. Run lint, type-check, tests and build.
9. Update `task.md` status and `status.md`.
10. Commit with a meaningful message.

## Definition of task completion

Implementation works · expected behaviour verified · relevant errors handled · authorization correct ·
responsive behaviour acceptable · relevant tests exist or their absence is justified · lint and build
pass · no unrelated changes · documentation updated.

## Final priority

If building more features conflicts with making the core workflow reliable:

> **Choose reliability of the core workflow.**

**Student Practice → AI Feedback → Improvement**, supported by
**Mentor Guidance + Academy Visibility**.
