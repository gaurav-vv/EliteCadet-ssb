# SSB Academy — Test Cases

**Type:** Manual test plan + index of the automated suite.
**Answers:** T066 (Critical testing) in `task.md`, and the "Testing" section of `AGENTS.md` §17.
**Last updated:** 2026-09-20.

This file is reporting/planning material, same tier as `status.md` — it does not change what the
product must do (`specs.md`) or how it's built (`AGENTS.md`). Update it whenever a case is added,
automated, or found to be obsolete.

Status vocabulary matches `status.md`: `VERIFIED` (automated, passing) · `MANUAL` (needs a human,
not yet automated) · `BLOCKED` (can't be executed yet) · `GAP` (the behavior being tested doesn't
exist yet — see `status.md` → Technical Debt).

---

## 1. Automated suite (what actually runs today)

```text
npm test              # Vitest — unit + component tests, no network, no browser
npm run test:watch    # Vitest in watch mode
npm run test:coverage # Vitest with coverage (lib/, components/)
npm run test:e2e      # Playwright — real browser, real dev server, real (unauthenticated) Supabase calls
```

| Layer | Tool | Needs a live server? | Needs Supabase reachable? |
|---|---|---|---|
| Unit (`tests/unit/lib`) | Vitest | No | No — Supabase client is never constructed in these tests |
| Component (`tests/unit/components`) | Vitest + React Testing Library | No | No — `lib/api/auth` is mocked |
| End-to-end (`tests/e2e`) | Playwright | Yes (auto-started via `webServer` in `playwright.config.ts`) | Yes — the real middleware calls `supabase.auth.getUser()` on every request, so `.env.local` must point at a reachable Supabase project. No test ever signs in, so no seeded account is required for the cases below |

First-time e2e setup: `npx playwright install chromium` (downloads a browser binary, not committed).

Currently verified (32 Vitest cases + 9 Playwright cases, all green as of this update):

- `tests/unit/lib/auth-validation.test.ts` — email/password/signup/login field validation (`lib/api/auth.ts`)
- `tests/unit/lib/redirect.test.ts` — `dashboardPathForRole`
- `tests/unit/lib/middleware-role.test.ts` — the route→role authorization mapping (`roleForPath`), including a documented latent gap (unanchored `startsWith` prefix matching)
- `tests/unit/lib/academy-isolation.test.ts` — documents that academy data has no `academyId` scoping yet; `.todo` cases define the isolation behavior to enable once T060's backend migration lands
- `tests/unit/components/login-form.test.tsx` — submit/redirect, custom `redirectTo`, error display, input survives a failed/network-error submit (AGENTS.md §11)
- `tests/e2e/public-pages.spec.ts` — `/`, `/login`, `/signup` render for a logged-out visitor
- `tests/e2e/auth-guard.spec.ts` — `/student`, `/mentor`, `/academy`, `/onboarding` redirect to `/login?reason=login_required&next=<path>` when logged out; nested paths preserve `next`; `/forbidden` itself is reachable

Everything else in this document is `MANUAL` or `GAP` — a written test case, not yet wired into
`npm test`/`npm run test:e2e`. The reason is stated per section (needs a seeded second account,
needs a real AI provider decision (B3), needs the T060 backend migration, etc.) rather than left
implicit.

---

## 2. Auth & authorization

| ID | Case | Priority | Status | Steps | Expected result |
|---|---|---|---|---|---|
| AUTH-01 | Signup with valid student details creates an account and logs in | P0 | MANUAL | Go to `/signup`, choose Student, fill valid name/email/8+ char password, submit | Redirected to `/onboarding` or `/student`; a `profiles` row exists with `role = student` |
| AUTH-02 | Signup with valid academy admin details also creates an `academies` row | P0 | MANUAL | Go to `/signup`, choose Academy Admin, fill valid details + academy name, submit | Redirected to `/academy`; `academies` row created; `profiles.academy_id` set |
| AUTH-03 | Signup rejects a duplicate email | P0 | MANUAL | Sign up twice with the same email | Second attempt shows "An account with this email already exists." (not a raw Supabase error) |
| AUTH-04 | Signup blocks weak input before hitting the network | P1 | `VERIFIED` (`auth-validation.test.ts`) | Submit with empty name / bad email / short password | Field-specific message, no request sent |
| AUTH-05 | Mentor cannot self-register | P0 | MANUAL | Inspect `/signup` UI | Only Student and Academy Admin are offered (specs.md §8.5 — mentor is invite-only) |
| AUTH-06 | Login with correct credentials redirects to the correct role dashboard | P0 | `VERIFIED` (`login-form.test.tsx`, mocked) + MANUAL (real Supabase) | Log in as each of the three roles | Student → `/student`, Mentor → `/mentor`, Academy Admin → `/academy` |
| AUTH-07 | Login with wrong password shows a safe, non-revealing error | P0 | `VERIFIED` (`login-form.test.tsx`) | Submit wrong password | "Incorrect email or password." — does not confirm/deny the email exists |
| AUTH-08 | Login preserves a `redirectTo`/`next` target | P1 | `VERIFIED` (`login-form.test.tsx`) | Hit a protected URL while logged out, then log in | Redirected to the originally requested URL, not always the role default |
| AUTH-09 | A network failure during login never loses the typed credentials | P1 | `VERIFIED` (`login-form.test.tsx`) | Submit while `logIn` rejects/returns `network_error` | Email/password fields retain their typed values; error banner shown; retry works |
| AUTH-10 | Logout ends the session everywhere it matters | P0 | MANUAL | Log in, click Log out from the profile menu | Session cookie cleared; visiting any protected route afterward requires login again |
| AUTH-11 | Forgot-password → reset-password round trip | P1 | MANUAL | Request reset, open emailed link, set new password | `/auth/callback` exchanges the code; new password logs in; old password no longer works |
| AUTH-12 | An expired/invalid password-reset link shows a clear message, not a crash | P1 | MANUAL | Use an old/reused reset link | Redirected to `/login?reason=link_invalid` with the mapped banner text |
| AUTH-13 | Unauthenticated access to any protected route redirects to `/login` with `reason=login_required` | P0 | `VERIFIED` (`auth-guard.spec.ts`) | Visit `/student`, `/mentor`, `/academy`, `/onboarding` (and nested paths) while logged out | 307 → `/login?next=<path>&reason=login_required` |
| AUTH-14 | A student cannot open `/mentor` or `/academy` (role mismatch) | P0 | MANUAL — needs a seeded student session; not automated because it requires a real signed-in cookie, not just "logged out" | Log in as a student, navigate to `/mentor` and `/academy` directly | Redirected to `/forbidden`, not shown mentor/academy content even briefly |
| AUTH-15 | A mentor cannot open `/student` or `/academy`; an academy admin cannot open `/student` or `/mentor` | P0 | MANUAL, same reason as AUTH-14 | Repeat AUTH-14 for the other two roles | Same: `/forbidden`, no content leak |
| AUTH-16 | Session expiry mid-session is handled, not left as a silent hang | P1 | MANUAL | Expire/revoke the session server-side, then perform an action | User is redirected to log in again with a clear reason, not a stuck spinner or raw 401 |
| AUTH-17 | The route→role prefix map has no accidental overlap for a new top-level route | P2 | `VERIFIED` (`middleware-role.test.ts`, documents a **known gap**: `startsWith` is unanchored, so e.g. `/mentorship` would incorrectly require the `mentor` role) | n/a (regression guard) | Any new top-level route starting with `student`/`mentor`/`academy` must be deliberately reviewed against this mapping |

---

## 3. Academy isolation / IDOR

Per `AGENTS.md` §7/§10, academy isolation is a **security boundary**, not a UI filter. Per
`status.md` → Technical Debt, this is **currently a `GAP`, not a passing/failing test target**:
`lib/mock/academy.ts` holds one shared `STUDENTS`/`BATCHES`/`MENTORS` array, with no `academyId`
field at all, read and written by every academy_admin session on the server. The cases below are
written against the *intended* behavior so they're ready to enable the moment the backend migration
(real Postgres tables with `academy_id` + RLS) lands — see `.todo` entries in
`tests/unit/lib/academy-isolation.test.ts`.

| ID | Case | Priority | Status | Steps | Expected result |
|---|---|---|---|---|---|
| ISO-01 | Two academy admins in different academies see disjoint student lists | P0 | `GAP` — cannot pass today; there is only one mock dataset shared by all accounts | Create Academy A admin and Academy B admin, each add a student, both view `/academy/students` | Each sees only their own academy's students |
| ISO-02 | Changing a student ID in the URL to another academy's student is rejected server-side | P0 | `GAP` | As Academy A admin, visit `/academy/students/<Academy-B-student-id>` | 403/404 server-side, not merely hidden by client routing — AGENTS.md calls this a P0 bug class |
| ISO-03 | Same as ISO-02 for a batch ID | P0 | `GAP` | Visit `/academy/batches/<other-academy-batch-id>` | 403/404 server-side |
| ISO-04 | A mentor can only be assigned students within their own academy | P0 | `GAP` | Attempt to assign Academy B's mentor to Academy A's batch (via direct action call, not just UI) | Rejected — Server Action validates the mentor and batch share an `academy_id` |
| ISO-05 | A mentor only sees mentees from their own academy in `/mentor/mentees` | P0 | `GAP` | Log in as a mentor, inspect the mentee list | No cross-academy mentee ever appears, even if the mock array contains one |
| ISO-06 | Reports (`/academy/reports`) never aggregate another academy's numbers into this academy's totals | P0 | `GAP` | Compare two academies' report pages | Numbers are computed from that academy's own students/batches only |
| ISO-07 | `inviteMentorAction` scopes the invited mentor to the inviting admin's `academy_id` | P1 | MANUAL (partially real today — see note) | Invite a mentor as Academy A admin | The created Supabase user's `academy_id` metadata matches Academy A; **note:** the mock `MENTORS` array push in `lib/actions/academy.ts` is *not* academy-scoped yet, so the mentor currently also appears in every other admin's mock mentor list — this half of the bridge is the open part of ISO-01 |
| ISO-08 | Deleting/removing a student from a batch never deletes another academy's data as a side effect | P1 | `GAP` | Remove a student from a batch | Only that student/batch pair is affected |

**Why these aren't just marked "failing" in CI:** a red build on every commit for a known, tracked,
not-yet-scheduled gap would train the team to ignore red CI. They're `it.todo` in the automated
suite (visible, not silently missing) and `GAP` here, with a clear trigger for when to promote them:
**T060's backend migration** (see `status.md` §9).

---

## 4. Student practice loop

| ID | Case | Priority | Status | Steps | Expected result |
|---|---|---|---|---|---|
| STU-01 | Onboarding form requires its mandatory fields | P1 | MANUAL | Submit `/onboarding` with fields empty | Inline validation, no navigation |
| STU-02 | Completing onboarding lands on the student dashboard with real (not fabricated) state | P0 | MANUAL | Complete onboarding | `/student` shows the just-entered profile info; no invented readiness score or activity (AGENTS.md §8) |
| STU-03 | Starting a practice session (interview / psychology) launches the correct runner | P0 | MANUAL | From `/student/practice`, start each practice type | `budget-runner`/`carousel-runner` renders matching that type's config (`lib/practice/config.ts`) |
| STU-04 | Submitting a practice response is never lost on failure | P0 | MANUAL — blocked on B3 for the AI-feedback half, but the "don't lose input" half is testable now | Submit a response, force a failure path | The submitted text is still visible/recoverable, per AGENTS.md §11's "student's submitted response must survive any failure" |
| STU-05 | AI feedback follows the Observation → Evidence → Impact → Improvement → Practice structure | P0 | `BLOCKED` (B3: AI provider undecided) | Submit a practice response | Feedback rendered in the mandated structure, marked as AI-assisted, no selection-outcome language |
| STU-06 | AI failure handling: timeout / provider outage / rate limit / malformed / empty / partial / invalid / network | P0 | `BLOCKED` (B3) | Simulate each failure mode | Practice loop is never broken; a plain-language message + recovery path is shown for each (AGENTS.md §11) |
| STU-07 | Progress page reflects only this student's real submissions | P1 | MANUAL | Compare `/student/progress` against actual submitted sessions | No invented XP/readiness numbers; empty state shown if nothing submitted yet |
| STU-08 | Resource completion toggle persists correctly | P1 | MANUAL | Toggle a resource as read/unread on `/student/resources/[slug]` | State persists across reload (`lib/student/resource-completion.ts`) |
| STU-09 | Profile form validates and saves | P1 | MANUAL | Edit `/student/profile` with invalid then valid input | Validation blocks bad input; valid save persists and confirms success (AGENTS.md §12) |
| STU-10 | "Clear local data" actually clears only this student's local state | P2 | MANUAL | Use the reset control on `/student/profile` | Relevant `localStorage` keys cleared; no effect on other students/roles |

---

## 5. Mentor & Academy workflows

| ID | Case | Priority | Status | Steps | Expected result |
|---|---|---|---|---|---|
| MEN-01 | Mentor dashboard surfaces students needing attention and pending evaluations | P0 | MANUAL | Load `/mentor` with seeded mentees | Attention list and pending-evaluation count match the underlying mock data, no fabricated numbers |
| MEN-02 | Mentor can only view mentees assigned to them (once real assignment exists) | P0 | `GAP` (same root cause as ISO-05) | Log in as a mentor, view `/mentor/mentees` | Only that mentor's own mentees listed |
| MEN-03 | Mentee detail page shows accurate, non-invented history | P1 | MANUAL | Open `/mentor/mentees/[id]` | Practice/evaluation history matches actual mock records for that student only |
| MEN-04 | Submitting an evaluation persists via a Server Action, not a client-only copy | P0 | `VERIFIED historically` (status.md notes a real bug was caught here during T043/T044 — regression risk if this ever regresses to client state) | Submit an evaluation, reload the page | Evaluation persists after reload (proves it hit server-side mock state) |
| MEN-05 | Evaluation form validates required fields before submit | P1 | MANUAL | Submit `/mentor/evaluations/new` incomplete | Inline errors, no partial/garbage evaluation created |
| MEN-06 | Mentor sessions view reflects real session data, states loading/empty/error correctly | P1 | MANUAL | Load `/mentor/sessions` with and without data | Empty state message when none; no infinite spinner on error |
| MEN-07 | Academy dashboard alerts fire correctly for unmentored batches and pending mentor invites | P0 | MANUAL | Create a batch with no mentor; invite a mentor and leave it pending | Both alerts appear on `/academy`, worded correctly for singular/plural |
| MEN-08 | Adding a student rejects a duplicate name | P1 | MANUAL (logic covered indirectly — `isDuplicateName` in `lib/actions/academy.ts` is a good future unit-test target) | Add two students with the same full name | Second attempt returns "A student with this name already exists." |
| MEN-09 | Assigning a student to a batch also assigns that batch's mentor to the student | P1 | MANUAL (also a good future unit-test target — `assignStudentBatchAction`) | Assign a student to a batch with a mentor set | Student's `mentorId` updates to match the batch's mentor |
| MEN-10 | Removing a student from a batch preserves the student's own record | P1 | MANUAL | Remove a student from a batch | Student still exists in `/academy/students`, just unassigned — not deleted |
| MEN-11 | Inviting a mentor sends a real Supabase invite and reflects "invited" status until accepted | P0 | MANUAL (real email + real Supabase account creation — needs a disposable test inbox) | Invite a mentor, check their status before/after accepting | Shows "invited" beforehand; flips to "active" the first time the mentor's own dashboard loads |
| MEN-12 | Inviting a mentor with a duplicate email is rejected | P1 | MANUAL | Invite the same email twice | Second attempt: "A mentor with this email already exists." |
| MEN-13 | Academy settings form validates and saves | P1 | MANUAL | Submit `/academy/settings` with an empty academy name, then valid data | Blocked on empty name; valid save persists and confirms |
| MEN-14 | "Load demo data" / "Clear demo data" only ever affect this academy's mock arrays, never break real auth state | P2 | MANUAL | Use both controls from `/academy/settings` | Mock students/batches/mentors reset or empty; the signed-in admin's own session/profile is untouched |
| MEN-15 | Academy reports state "insufficient data" rather than fabricating a chart when data is sparse | P1 | MANUAL | View `/academy/reports` with 0–1 students | Explicit "not enough data yet" message, no invented chart |

---

## 6. Cross-cutting states (every feature above, per `AGENTS.md` §12)

For each item marked P0/P1 above, also confirm on first automation or manual pass:

- **Loading** — a real loading indicator, not a blank screen.
- **Empty** — explains why there's nothing and what to do next (shared `EmptyState` component).
- **Error** — plain language + recovery action, never a raw stack trace or Prisma/Supabase error string.
- **Success** — confirms the action clearly.

---

## 7. Adding a new case

1. Add a row to the relevant table above with a fresh ID (`AREA-NN`).
2. If it can be automated without a live second account or an undecided dependency (B3, T060),
   write it in `tests/unit/**` (Vitest) or `tests/e2e/**` (Playwright) and mark it `VERIFIED` here
   with a pointer to the file.
3. If it depends on a `GAP` or `BLOCKED` item, say which one — don't leave the reason implicit.
4. Never mark a case `VERIFIED` without having actually run it (`AGENTS.md` §20: "Never write a
   claim about implementation that has not been verified in the repository").
