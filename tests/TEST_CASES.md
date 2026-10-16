# SSB Academy — Test Cases

**Type:** Manual test plan + index of the automated suite.
**Answers:** T066 (Critical testing) in `task.md`, and the "Testing" section of `AGENTS.md` §17.
**Last updated:** 2026-10-07 (§2a Super Admin + RBAC, T080 Phase 1).

This file is reporting/planning material, same tier as `status.md` — it does not change what the
product must do (`specs.md`) or how it's built (`AGENTS.md`). Update it whenever a case is added,
automated, or found to be obsolete.

Status vocabulary matches `status.md`: `VERIFIED` (automated, passing) · `MANUAL` (needs a human,
not yet automated) · `BLOCKED` (can't be executed yet) · `GAP` (the behavior being tested doesn't
exist yet — see `status.md` → Technical Debt).

---

## 1. Automated suite (what actually runs today)

```text
npm test                 # Vitest — unit + integration together, no network, no browser
npm run test:unit        # Vitest — tests/unit only
npm run test:integration # Vitest — tests/integration only
npm run test:watch       # Vitest in watch mode
npm run test:coverage    # Vitest with coverage (lib/, components/, hooks/)
npm run test:e2e         # Playwright — real browser, real server, real (unauthenticated) Supabase calls
```

CI (`.github/workflows/ci.yml`) runs lint → typecheck → unit → integration on every PR and push to
`main`, then a production build + e2e. The e2e job needs the `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` repo secrets and skips with a notice when they're missing.

| Layer | Tool | Needs a live server? | Needs Supabase reachable? |
|---|---|---|---|
| Unit (`tests/unit/lib`, `tests/unit/hooks`) | Vitest | No | No — Supabase client is never constructed in these tests |
| Component (`tests/unit/components`) | Vitest + React Testing Library | No | No — `lib/api/auth` is mocked |
| Integration (`tests/integration`) | Vitest (+ React Testing Library) | No | No — real modules wired together; only the Supabase client is faked (middleware suite) |
| End-to-end (`tests/e2e`) | Playwright | Yes (auto-started via `webServer` in `playwright.config.ts`) | Yes — the real middleware calls `supabase.auth.getUser()` on every request, so `.env.local` must point at a reachable Supabase project. No test ever signs in, so no seeded account is required for the cases below |

First-time e2e setup: `npx playwright install chromium` (downloads a browser binary, not committed).

Locally Playwright reuses a running `npm run dev` and uses one worker (parallel workers starve the
dev server's per-route compile and time out); CI uses the production build and default workers.

Currently verified (84 Vitest cases — 52 unit/component + 32 integration — plus 9 Playwright cases,
all green as of this update):

- `tests/unit/lib/auth-validation.test.ts` — email/password/signup/login field validation (`lib/api/auth.ts`)
- `tests/unit/lib/redirect.test.ts` — `dashboardPathForRole`
- `tests/unit/lib/middleware-role.test.ts` — the route→role authorization mapping (`roleForPath`), including a documented latent gap (unanchored `startsWith` prefix matching)
- `tests/unit/lib/rbac.test.ts` — role → permission rules (super admin only for user management), the four roles, workspaces, academy-required roles (T080)
- `tests/unit/lib/users-validation.test.ts` — user-list URL parsing (hostile values fall back), query building, search sanitising (ILIKE wildcards + PostgREST filter syntax), role/status change rules incl. no self-change (T080)
- `tests/unit/lib/users-service.test.ts` — users service with mocked guard + repository: unauthorized before any data access, page clamping, setup guidance, audit on success only, RLS refusal mapped, no raw error leaks (T080)
- `tests/unit/lib/users-repository.test.ts` — user row boundary validation (T080)
- `tests/unit/lib/login-suspended.test.ts` — suspended accounts are signed straight back out at login (T080)
- `tests/unit/lib/academies-validation.test.ts`, `academies-service.test.ts`, `blocked.test.ts` — academy management rules, authorization, own-academy scoping, suspension (T081)
- `tests/unit/lib/academy-people-validation.test.ts`, `academy-people-service.test.ts` — academy students/mentors scoped to the session's academy, add-by-email/invite rules, mentors limited to their own batches (T082)
- `tests/unit/lib/content-validation.test.ts`, `content-service.test.ts` — content rules, status transitions, super-admin-only management, readers limited to published content (T083)
- `tests/unit/lib/mentor-content-service.test.ts`, `content-requests-service.test.ts`, `content-requests-validation.test.ts` — mentor ownership and batch sharing, templates, request lifecycle and fees (T084)
- `tests/unit/lib/sessions-validation.test.ts`, `sessions-service.test.ts` — IST conversion, session rules, availability, mentor scope, double-booking (T085)
- `tests/unit/lib/assessments-validation.test.ts`, `assessments-service.test.ts` — assessment/answer/feedback rules, submit-once, idempotent review, mentor scope (T086)
- `tests/unit/lib/progress-compute.test.ts`, `progress-service.test.ts` — progress derivations, attention rules, attendance, role and academy scope (T087)
- `tests/unit/lib/dashboards-compute.test.ts`, `dashboards-service.test.ts`, `academy-dashboard-view.test.ts` — dashboard derivations, role and academy/batch scope, no invented values (T088)
- `tests/unit/lib/notifications-service.test.ts`, `analytics-service.test.ts` — own-notifications scope, safe links, mark read, super-admin-only analytics, boundary validation (T089)
- `tests/unit/lib/practice-validation.test.ts`, `practice-service.test.ts`, `practice-journey.test.ts`; `tests/integration/bank-practice-runner.test.tsx`, `mock-session.test.tsx` — answer/attempt validation, streak, role scope, server-side scoring, idempotent submit, journey wiring vs the 0014 seed, autosave with retry (T083b)
- `supabase/tests/workflow-check.sql` (run with `supabase/tests/run-workflow-check.sh`) — applies migrations 0001–0014 to a throwaway local Postgres and runs the whole workflow as each role under real RLS: isolation, lifecycles, attendance, progress views, notifications, analytics, practice (85 checks)
- `tests/unit/components/login-form.test.tsx` — submit/redirect, custom `redirectTo`, error display, input survives a failed/network-error submit (AGENTS.md §11)
- `tests/unit/lib/ssb-journey-progress.test.ts` — the on-device Day 5 self-assessment, corrupted/blocked localStorage
- `tests/unit/lib/resource-completion.test.ts` — resource read/unread state
- `tests/unit/hooks/use-countdown.test.tsx` — countdown ticks, `onExpire` fires exactly once, latest callback used
- `tests/integration/middleware-session.test.ts` — `updateSession()` with a faked Supabase client: logged-out → `/login`, every wrong-role combination and a missing profile → `/forbidden`, correct role allowed, browser-supplied `?role=` ignored (AGENTS.md §10); `/admin` → super_admin only, super admin kept out of other workspaces, suspended accounts signed out (T080)
- `tests/integration/bank-practice-runner.test.tsx` — practice runner + real progress store: MCQ check/feedback text, navigation, mark done persists across remount
- `tests/e2e/public-pages.spec.ts` — `/`, `/login`, `/signup` render for a logged-out visitor
- `tests/e2e/auth-guard.spec.ts` — `/student`, `/mentor`, `/academy`, `/onboarding`, `/admin`, `/admin/access` redirect to `/login?reason=login_required&next=<path>` when logged out; nested paths preserve `next`; `/forbidden` itself is reachable

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
| AUTH-13 | Unauthenticated access to any protected route redirects to `/login` with `reason=login_required` | P0 | `VERIFIED` (`auth-guard.spec.ts`) | Visit `/student`, `/mentor`, `/academy`, `/onboarding`, `/admin`, `/admin/access` (and nested paths) while logged out | 307 → `/login?next=<path>&reason=login_required` |
| AUTH-14 | A student cannot open `/mentor` or `/academy` (role mismatch) | P0 | MANUAL — needs a seeded student session; not automated because it requires a real signed-in cookie, not just "logged out" | Log in as a student, navigate to `/mentor` and `/academy` directly | Redirected to `/forbidden`, not shown mentor/academy content even briefly |
| AUTH-15 | A mentor cannot open `/student` or `/academy`; an academy admin cannot open `/student` or `/mentor` | P0 | MANUAL, same reason as AUTH-14 | Repeat AUTH-14 for the other two roles | Same: `/forbidden`, no content leak |
| AUTH-16 | Session expiry mid-session is handled, not left as a silent hang | P1 | MANUAL | Expire/revoke the session server-side, then perform an action | User is redirected to log in again with a clear reason, not a stuck spinner or raw 401 |
| AUTH-17 | The route→role prefix map has no accidental overlap for a new top-level route | P2 | `VERIFIED` (`middleware-role.test.ts`, documents a **known gap**: `startsWith` is unanchored, so e.g. `/mentorship` would incorrectly require the `mentor` role) | n/a (regression guard) | Any new top-level route starting with `student`/`mentor`/`academy` must be deliberately reviewed against this mapping |

---

### 2a. Super Admin + RBAC (`/admin`, T080 Phase 1)

| ID | Case | Priority | Status | Steps | Expected result |
|---|---|---|---|---|---|
| ADM-01 | Signed-out visitor to any `/admin` route is sent to login | P0 | `VERIFIED` (`middleware-session.test.ts`, `auth-guard.spec.ts`) | Visit `/admin/users` while logged out | 307 → `/login?next=/admin/users&reason=login_required` |
| ADM-02 | Student, mentor and academy admin are forbidden from `/admin` | P0 | `VERIFIED` (`middleware-session.test.ts`) | Open `/admin` as each role | `/forbidden` |
| ADM-03 | A super admin can't open other roles' workspaces | P1 | `VERIFIED` (`middleware-session.test.ts`) | Super admin opens `/student`, `/mentor`, `/academy` | `/forbidden` |
| ADM-04 | A suspended account is signed out and can't log in | P0 | `VERIFIED` (`middleware-session.test.ts`, `login-suspended.test.ts`) + MANUAL live | Suspend a user; they navigate / log in | Signed out → `/login?reason=account_suspended` with a clear message |
| ADM-05 | User management actions refuse non-super-admins before any data access | P0 | `VERIFIED` (`users-service.test.ts`) | Call list/detail/role/status as another role | `unauthorized`; repository never called |
| ADM-06 | No self role/status change; mentor/academy admin need an academy | P0 | `VERIFIED` (`users-validation.test.ts`, `users-service.test.ts`) + DB trigger | Try to change own role; promote a user without an academy to mentor | Refused with a clear message; nothing written |
| ADM-07 | Every role/status change is audited | P1 | `VERIFIED` (`users-service.test.ts`) + MANUAL live | Change a role, suspend, reactivate | Entries appear in the user's Account history |
| ADM-08 | A user can't rewrite their own role via the API (closed hole) | P0 | MANUAL (needs 0005 applied + a real session) | As a student, `PATCH /rest/v1/profiles?id=eq.<self>` with `{"role":"super_admin"}` | Rejected (`42501`); role unchanged |
| ADM-09 | Signup can't self-assign mentor or super admin (closed hole) | P0 | MANUAL (needs 0005 applied) | `supabase.auth.signUp` with `data: { role: "mentor", academy_id: <any> }` or `role: "super_admin"` | Account is created as a student with no academy |
| ADM-10 | Dashboard totals and user list come from the database | P0 | MANUAL (live) | Compare `/admin` totals with `profiles`/`academies` counts | Numbers match; nothing hard-coded |

---
### 2b. Academies (T081 Phase 2)

| ID | Case | Priority | Status | Steps | Expected result |
|---|---|---|---|---|---|
| ACA-01 | Academy management refuses non-super-admins before any data access | P0 | `VERIFIED` (`academies-service.test.ts`) | Call list/create/status/add/remove as another role | `unauthorized`; repository never called |
| ACA-02 | Academy form validated on the server | P1 | `VERIFIED` (`academies-validation.test.ts`, `academies-service.test.ts`) | Submit a 1-char name, bad email/phone, `http:`/`javascript:` logo | Field errors; nothing written |
| ACA-03 | Add member: unknown email, super admin, self, invalid role refused | P0 | `VERIFIED` (`academies-service.test.ts`) | Add each case by email | Clear message; no write |
| ACA-04 | Mentors/academy admins can't be left without an academy | P0 | `VERIFIED` (`users-validation.test.ts`, `academies-service.test.ts`) | Remove a mentor; set an admin's academy to none | Refused: "change their role first" |
| ACA-05 | Academy admin edits only their own academy, never its status | P0 | `VERIFIED` (`academies-service.test.ts`) + DB trigger/RLS (MANUAL live) | Submit settings with another academy's id / a status field; PATCH `academies` directly | Own academy updated; id/status ignored or refused (`42501`) |
| ACA-06 | Members of a suspended academy are signed out and can't log in | P0 | `VERIFIED` (`blocked.test.ts`, `middleware-session.test.ts`, `login-suspended.test.ts`) + MANUAL live | Suspend an academy; members navigate / log in | `/login?reason=academy_suspended`; super admins unaffected |
| ACA-07 | Member counts come from the database | P1 | MANUAL (live) | Add/remove members, compare list counts | Counts match `profiles` |

---
### 2c. Content (T083 Phase 4)

| ID | Case | Priority | Status | Steps | Expected result |
|---|---|---|---|---|---|
| CON-01 | Content management is super-admin only | P0 | `VERIFIED` (`content-service.test.ts`) + RLS | Call create/status/assign as another role | `unauthorized`; nothing written |
| CON-02 | Content form validated on the server; links must be https | P1 | `VERIFIED` (`content-validation.test.ts`) | Submit a 2-char title, unknown enums, `javascript:`/`http:` link, no body or link | Field errors |
| CON-03 | Status rules: draft ⇄ published, → archived, archived → draft only | P1 | `VERIFIED` (`content-validation.test.ts`, `content-service.test.ts`) | Try archived → published | Refused |
| CON-04 | Readers see only published content | P0 | `VERIFIED` (`content-service.test.ts`) + RLS | Open a draft's id as a student | Not found |
| CON-05 | Assigned-only content reaches only its academies/batches | P0 | MANUAL (needs 0008 applied) | Assign to Academy A; open as Academy B student (list + direct id) | Not listed; not found |
| CON-06 | Body renders as text, never HTML | P1 | MANUAL | Save `<script>` in a body; open it | Shown literally |

---
### 2d. Mentor content and content requests (T084 Phase 5)

| ID | Case | Priority | Status | Steps | Expected result |
|---|---|---|---|---|---|
| MCO-01 | Mentor content is owned by the mentor and pinned to assigned/students | P0 | `VERIFIED` (`mentor-content-service.test.ts`) + DB trigger | Create content sending visibility "everyone" / template flag | Saved as assigned-only, for students, not a template |
| MCO-02 | A mentor can't edit another mentor's or platform content | P0 | `VERIFIED` (`mentor-content-service.test.ts`) + RLS | Edit/publish another id | Not found; nothing written |
| MCO-03 | A mentor shares only with batches they teach | P0 | `VERIFIED` (`mentor-content-service.test.ts`) + RLS | Share with another batch's id | Refused |
| MCO-04 | Mentor content reaches only students of its batches | P0 | MANUAL (needs 0009) | Publish + share with Batch A; open as Batch B student (list + id) | Not visible |
| MCO-05 | "Use this template" copies a published template into a draft; the template is unchanged | P1 | `VERIFIED` (`mentor-content-service.test.ts`) | Use a template; check both items | New mentor draft with source; template untouched |
| REQ-01 | Only mentors request; only staff quote/start/deliver/settle | P0 | `VERIFIED` (`content-requests-service.test.ts`) + RLS/functions | Call each action as the wrong role | `unauthorized`; no database call |
| REQ-02 | Lifecycle is enforced (accept/decline only when quoted; cancel only before accepting) | P0 | `VERIFIED` (`content-requests-service.test.ts`) + DB functions | Accept a non-quoted request | Clear refusal |
| REQ-03 | Fee validation and Indian formatting | P1 | `VERIFIED` (`content-requests-validation.test.ts`) | Quote -5 / 10.555 / 1,50,000 | Rejected / rejected / shown as ₹1,50,000 |
| REQ-04 | Nothing is charged automatically; settled only when owed | P0 | `VERIFIED` (`content-requests-service.test.ts`) | Mark settled on a not-owed request | Refused |

---
### 2e. Sessions (T085 Phase 6)

| ID | Case | Priority | Status | Steps | Expected result |
|---|---|---|---|---|---|
| SES-01 | A mentor schedules only for batches they teach, and only that batch's students | P0 | `VERIFIED` (`sessions-service.test.ts`) + RLS/trigger | Schedule for another batch / pick an outside student | Refused with field errors |
| SES-02 | No double-booking | P0 | `VERIFIED` (`sessions-service.test.ts`: 23P01 mapping) + DB exclusion constraint | Schedule two overlapping sessions | Second refused: "overlaps another session" |
| SES-03 | Session rules: https link online, location offline, end after start, ≤ 8h, future only | P1 | `VERIFIED` (`sessions-validation.test.ts`) | Submit each invalid case | Field errors |
| SES-04 | IST entry and display are correct | P1 | `VERIFIED` (`sessions-validation.test.ts`) | 18:30 IST | Stored 13:00 UTC; shown "6:30 pm … IST" |
| SES-05 | Cancel needs a reason; completing before the start is refused | P1 | `VERIFIED` (`sessions-service.test.ts`) | Cancel with "no"; complete a future session | Refused |
| SES-06 | A student sees only their batch's sessions or ones they were selected for | P0 | MANUAL (needs 0010) | As a Batch B student, list sessions and open a Batch A session id | Not visible |

---
### 2f. Assessments and feedback (T086 Phase 7)

| ID | Case | Priority | Status | Steps | Expected result |
|---|---|---|---|---|---|
| ASM-01 | Mentors create/manage assessments only for batches they teach | P0 | `VERIFIED` (`assessments-service.test.ts`) + RLS | Create for another batch | Refused |
| ASM-02 | Questions are locked once an assessment is open; only valid status moves | P1 | `VERIFIED` (`assessments-service.test.ts`) + trigger | Edit an open assessment; draft → closed | Refused |
| ASM-03 | A student answers only while open and not overdue, and submits once | P0 | `VERIFIED` (`assessments-service.test.ts`) + trigger/RLS | Answer a closed/overdue one; submit twice | Refused |
| ASM-04 | Answers are cleaned to the real questions | P1 | `VERIFIED` (`assessments-validation.test.ts`) | Send unknown/duplicate question ids | Ignored |
| FDB-01 | Draft review is recoverable; submitting needs score, strengths and improvements | P0 | `VERIFIED` (`assessments-validation.test.ts`) + DB check | Save partial, reload; submit incomplete | Draft kept; submit refused |
| FDB-02 | One feedback per attempt; reviewed is locked (idempotent submit) | P0 | `VERIFIED` (`assessments-service.test.ts`: upsert on `attempt_id`, locked after review) + trigger | Submit twice | One reviewed feedback; second refused |
| FDB-03 | Students see feedback only once reviewed; never another student's attempt | P0 | `VERIFIED` (`supabase/tests/workflow-check.sql`, local Postgres 17) | As student B, open A's attempt/feedback ids via the API | Nothing returned |

### 2g. Progress tracking (T087 Phase 8)

| ID | Case | Priority | Status | Steps | Expected result |
|---|---|---|---|---|---|
| PRG-01 | Progress shows no invented values; empty data reads as "no data yet" | P0 | `VERIFIED` (`progress-compute.test.ts`, `progress-service.test.ts`) | Student with no reviews/attendance | Averages and attendance are null, shown as "—" with an empty state |
| PRG-02 | Each view refuses the wrong role before reading data | P0 | `VERIFIED` (`progress-service.test.ts`) | Call student/mentor/academy progress as another role | `unauthorized`, no database call |
| PRG-03 | A mentor sees progress only for students in their batches | P0 | `VERIFIED` (`progress-service.test.ts`) + RLS | Open another batch's student progress | Not found |
| PRG-04 | Attendance: only the session's mentor, only after it starts, only participants | P0 | `VERIFIED` (`progress-service.test.ts`) + trigger/RLS | Mark before start; mark a non-participant | Refused / dropped |
| PRG-05 | Needs-attention flags carry their reason | P1 | `VERIFIED` (`progress-compute.test.ts`, `progress-service.test.ts`) | Low average, no recent submission, low attendance | Flagged with the matching reason; on-track students aren't |
| PRG-06 | A student marks only content they can read as done; counts update | P1 | `VERIFIED` (`supabase/tests/workflow-check.sql`, local Postgres 17) | Mark a Library item done, then an unassigned content id via the API | First counts in Library read; second refused by RLS |
| PRG-07 | Academy Performance is scoped to the admin's academy | P0 | `VERIFIED` (`progress-service.test.ts`: `academy_id` filter) + RLS; MANUAL live check | Admin of academy A views Performance | Only academy A's batches and students |


### 2h. Role dashboards (T088 Phase 9)

| ID | Case | Priority | Status | Steps | Expected result |
|---|---|---|---|---|---|
| DSH-01 | Each dashboard refuses other roles server-side | P0 | `VERIFIED` (`dashboards-service.test.ts`) | Call another role's dashboard function | `unauthorized`, no data read |
| DSH-02 | Mentor dashboard reads only students in the mentor's batches | P0 | `VERIFIED` (`dashboards-service.test.ts`: `batch_id in` own batches) + RLS | Mentor with batch A views dashboard | Only batch A students in mentees/attention |
| DSH-03 | Academy dashboard and Reports read only the admin's academy | P0 | `VERIFIED` (`dashboards-service.test.ts`) + RLS; MANUAL live | Two academies with data | Each sees only its own figures |
| DSH-04 | No invented values: empty data shows "—" or the empty state | P0 | `VERIFIED` (`academy-dashboard-view.test.ts`, `dashboards-service.test.ts`) | New academy / mentor without batches | Dashes and empty states, no sample numbers |
| DSH-05 | Dashboard figures match the linked pages | P1 | MANUAL (needs 0004–0012) | Compare reviews waiting vs Evaluations, attention vs Performance, sessions vs Sessions | Same numbers |
| DSH-06 | "Today" and session times use IST | P1 | `VERIFIED` (`dashboards-compute.test.ts`) | Session at 23:30 IST vs 00:30 IST next day | Only the first counts as today |

### 2i. Notifications and platform analytics (T089 Phase 10)

| ID | Case | Priority | Status | Steps | Expected result |
|---|---|---|---|---|---|
| NTF-01 | A user reads and marks only their own notifications | P0 | `VERIFIED` (`notifications-service.test.ts`: `recipient_id` = caller) + RLS + column grant; MANUAL live | As user B, select/update user A's notification id via the API | Nothing returned; update affects 0 rows |
| NTF-02 | Clients cannot create notifications | P0 | `VERIFIED` (`supabase/tests/workflow-check.sql`, local Postgres 17) | Insert into `notifications` with the anon/auth key | Refused (no insert grant or policy) |
| NTF-03 | Each event notifies the right people once | P0 | `VERIFIED` (`supabase/tests/workflow-check.sql`, local Postgres 17) | Schedule (whole batch / selected), cancel, open assessment, submit, review, add to batch, content request | One row per intended recipient; edits don't repeat it |
| NTF-04 | Notification links are same-site only | P1 | `VERIFIED` (`notifications-service.test.ts`) + DB check | Row with an external href | Not followed (href null) |
| NTF-05 | Bell shows unread count; mark one / all read updates it | P1 | MANUAL | Open the bell, click an item, then "Mark all read" | Badge decreases, then disappears |
| ANL-01 | Only a super admin can load platform analytics | P0 | `VERIFIED` (`analytics-service.test.ts`) + SQL guard; MANUAL live | Call `platform_analytics` as an academy admin | Error, no data |
| ANL-02 | Analytics shows 0 / "—" / empty states with no data, never invented values | P1 | `VERIFIED` (`analytics-service.test.ts`: boundary coercion) | Fresh platform | Zeros, dashes, empty states |

### 2j. Practice banks and saved practice (T083b)

| ID | Case | Priority | Status | Steps | Expected result |
|---|---|---|---|---|---|
| PRC-01 | A student's practice is saved to their account and restored on another device | P0 | `VERIFIED` (`bank-practice-runner.test.tsx`, `practice-service.test.ts`) + DB; MANUAL live | Answer on one browser, open another | Same answers, ticks and done |
| PRC-02 | A failed save never loses typed text and offers a retry | P0 | `VERIFIED` (`bank-practice-runner.test.tsx`, `mock-session.test.tsx`) | Go offline, type, mark done | Text stays; Retry saves it |
| PRC-03 | Only the student and their batch's mentors read answers; admins see counts only | P0 | `VERIFIED` (`supabase/tests/workflow-check.sql`) + RLS | Read as another student / other mentor / academy admin | Nothing / nothing / counts only |
| PRC-04 | Tests are scored by the database; correct options never reach the browser in a test | P0 | `VERIFIED` (`practice-service.test.ts`, `workflow-check.sql`) | Submit OIR test | Score from server; no `correctOptionId` in the page |
| PRC-05 | A retried submit doesn't create a duplicate | P1 | `VERIFIED` (`practice-service.test.ts`, `workflow-check.sql`, `mock-session.test.tsx`) | Submit twice with the same run | One attempt |
| PRC-06 | Only a super admin edits banks; hiding keeps saved answers | P0 | `VERIFIED` (`practice-service.test.ts`, `workflow-check.sql`) | Edit as a mentor; hide an answered question | Refused; answer kept, question gone for students |
| PRC-07 | Every journey bank module points at a seeded bank; counts are real | P1 | `VERIFIED` (`practice-journey.test.ts`) | — | 11 banks, 209 questions |
---

## 3. Academy isolation / IDOR

Per `AGENTS.md` §7/§10, academy isolation is a **security boundary**, not a UI filter. Per
`status.md` → Technical Debt, this is **currently a `GAP`, not a passing/failing test target**:
`lib/mock/academy.ts` holds one shared `STUDENTS`/`BATCHES`/`MENTORS` array, with no `academyId`
field at all, read and written by every academy_admin session on the server. The cases below are
written against the *intended* behavior. Academy data is now real Postgres with `academy_id` + RLS;
the service tests named in each row cover the scoping in code.

| ID | Case | Priority | Status | Steps | Expected result |
|---|---|---|---|---|---|
| ISO-01 | Two academy admins in different academies see disjoint student lists | P0 | `VERIFIED` in code (`academy-people-service.test.ts`: academy always from the session) + RLS; MANUAL live | Create Academy A admin and Academy B admin, each add a student, both view `/academy/students` | Each sees only their own academy's students |
| ISO-02 | Changing a student ID in the URL to another academy's student is rejected server-side | P0 | `VERIFIED` in code (`academy-people-service.test.ts`) + RLS; MANUAL live | As Academy A admin, visit `/academy/students/<Academy-B-student-id>` | 403/404 server-side, not merely hidden by client routing — AGENTS.md calls this a P0 bug class |
| ISO-03 | Same as ISO-02 for a batch ID | P0 | `VERIFIED` in code (`batches-supabase.test.ts`: academy-scoped lookups) + RLS; MANUAL live | Visit `/academy/batches/<other-academy-batch-id>` | 403/404 server-side |
| ISO-04 | A mentor can only be assigned students within their own academy | P0 | `VERIFIED` in code (`batches-supabase.test.ts`) + DB trigger `check_batch_member`; MANUAL live | Attempt to assign Academy B's mentor to Academy A's batch (via direct action call, not just UI) | Rejected — Server Action validates the mentor and batch share an `academy_id` |
| ISO-05 | A mentor only sees mentees from their own academy in `/mentor/mentees` | P0 | `VERIFIED` in code (`academy-people-service.test.ts`: own batches only, other ids not found) + RLS; MANUAL live | Log in as a mentor, inspect the mentee list | No cross-academy mentee ever appears, even if the mock array contains one |
| ISO-06 | Reports (`/academy/reports`) never aggregate another academy's numbers into this academy's totals | P0 | `VERIFIED` in code (`dashboards-service.test.ts`: academy id from the session, `academy_id` filters) + RLS; MANUAL live | Compare two academies' report pages | Numbers are computed from that academy's own students/batches only |
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
| MEN-14 | ~~"Load demo data" / "Clear demo data"~~ — removed in T088 (dashboards read real data) | — | `DEFERRED` (feature removed) | — | — |
| MEN-15 | Academy reports show the empty state rather than fabricating a chart when data is sparse | P1 | `VERIFIED` (`academy-dashboard-view.test.ts`, `dashboards-compute.test.ts`: null/empty with no data) | View `/academy/reports` with no reviewed scores | Empty state "Not enough data yet", no invented chart |

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
