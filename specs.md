# specs.md — SSB Academy Web Platform Specification

**Type:** Authoritative product + UX specification.
**Authority:** Defines *what* the product must do. `AGENTS.md` defines *how* to build it.
**Last structural revision:** 2026-09-16

> Scope note: this platform has no media player, video playback, watch rooms, chat rooms, playback
> queues or real-time playback synchronisation. Any requirement of that kind found in older prompts
> or notes belongs to a different project and must be ignored.

---

## 1. Product Goal

A centralised web platform that helps students prepare for the SSB while giving mentors and academies
the tools to guide, evaluate and monitor that preparation.

Core value loop:

```text
Practice → AI Feedback → Improvement → Practice Again
```

Supported by: **Mentor Guidance** and **Academy Visibility**.

---

## 2. Roles

```text
STUDENT
MENTOR
ACADEMY_ADMIN
SUPER_ADMIN   (added 2026-10-07 — see §8a)
```

| Role | Uses the platform to |
|---|---|
| Student | Practise, receive AI-assisted feedback, learn, attend sessions, track readiness, see weak areas, follow recommendations |
| Mentor | View assigned mentees, monitor performance, evaluate, give feedback, run basic sessions, spot students needing attention |
| Academy Admin | Manage students, batches and mentors; monitor readiness and performance; spot students needing attention; view basic reports |

### Access model

A user accesses only what their role permits. Academy data is isolated:

```text
Academy A Mentor → only assigned/authorised Academy A students
```

Authorization is enforced server-side. Client-side hiding is UX only.

---

## 3. Scope Decisions (contradictions resolved 2026-09-16)

These resolve conflicts that previously existed between `AGENTS.md`, `specs.md`, `task.md` and
`status.md`.

| Item | Previous conflict | Resolution |
|---|---|---|
| Achievements, Leaderboard | Specified as student dashboard sections *and* listed as "intentionally not started" | **DEFERRED (P2).** Removed from the MVP dashboard and from MVP tasks. |
| "Mission" | Design brief shows Mission as a top-level primary capsule; status lists "5-Day SSB Mission" as not started | Split: **"Today's Mission"** (daily recommended-task surface) is **MVP**. The **5-Day SSB Practice Journey** was originally deferred (P1) but was **un-deferred and built 2026-09-20** as `Practice` (T039) — see §6.4a. |
| Mentor Rating, AI Assistant, Earnings | Present in mentor navigation | **DEFERRED (P1/P2).** Absent from MVP navigation. |
| Courses, Attendance, Announcements, Messages, Assessments | Present in academy navigation | **DEFERRED (P1).** Absent from MVP navigation. |
| Visual direction | "Rounded cards", purple as brand accent | **Superseded** by the Glass Capsule system with navy primary. See `AGENTS.md` §7. |
| `CLAUDE.md` | Referenced as authoritative by three files | **Retired.** `AGENTS.md` is authoritative. |
| Payments / billing | Ambiguous across files | MVP shows plan information and CTAs only. No automated billing without explicit approval. |

Deferred features must not appear as broken, empty or fake functionality. Either omit them, or label
them explicitly as unavailable.

---

## 4. Global UI Specification

The Glass Capsule design system in `AGENTS.md` §7 is binding on every screen. This section defines
the product-level behaviour that follows from it.

### 4.1 Navigation model

Navigation is **progressive**. A screen presents one level of choice at a time.

```text
HOME            PRACTICE              PSYCHOLOGY
[ Mission ]     [ Psychology ]        [ TAT ]
[ Practice ]    [ Communication ]     [ WAT ]
[ Progress ]    [ Reasoning ]         [ SRT ]
                                      [ SDT ]
```

Requirements:

- Every nested screen shows the current location and an obvious way back.
- Entering a subsection must not change the visual language.
- Desktop may use a persistent navigation rail; small screens use an appropriate responsive pattern,
  never a shrunken sidebar.
- A role never sees another role's navigation.

### 4.2 Capsule usage by surface

| Surface | Capsule level |
|---|---|
| Home destinations (Mission, Practice, Progress) | Primary |
| Practice categories, psychology sub-tests, learning modules | Secondary |
| Filters, tags, status, difficulty, sort, quick actions | Small |
| Long-form instructions, questions, response forms, tables | **Not capsules** |

### 4.3 Global states

Every data-driven view defines loading, empty, error and success states (`AGENTS.md` §12).

| Case | Message shape |
|---|---|
| API failure | "We couldn't load this. Please try again." + retry |
| AI failure | "AI feedback is temporarily unavailable. Your response has been saved." + retry |
| Unauthorized | "You don't have access to this page." + route to own dashboard |
| Not found | "We couldn't find what you're looking for." + safe navigation |

Internal errors, stack traces, prompts and provider details are never shown.

### 4.4 Status vocabulary (product-wide)

```text
Practice submission : draft · submitted · processing · feedback_ready · failed
Evaluation          : pending · in_review · reviewed
Session             : scheduled · completed · cancelled
Student             : active · inactive · at_risk (signal, not judgement)
Batch               : active · completed · archived
```

Status is always conveyed as text or text+icon, never colour alone.

### 4.5 Search, filtering, pagination

- Search appears only where a list can realistically exceed one screen.
- Filters must map to a real workflow; do not add every possible filter.
- Unbounded lists are paginated server-side.
- Every list defines an empty state that says what to do next.

### 4.6 Date, time and numbers

- Display in the user's local timezone; store and transmit UTC ISO-8601.
- Relative time ("2 days ago") for activity; absolute time for scheduled sessions.
- Currency, where shown, is INR formatted per Indian locale conventions.

---

## 5. Public Website

### 5.1 Landing page

Must communicate: what SSB Academy is · who it is for · how preparation works · AI-assisted feedback ·
mentorship · practice · progress tracking · academy capabilities · a clear CTA.

CTAs: *Start Preparing* / *Get Started* / *Login* / *Request Demo*. Do not list every feature.

**Acceptance:** a first-time visitor can state what the product does and how to begin within one
screen-scroll; the page has correct metadata, title, description and semantic headings.

### 5.2 Pricing

Student plan(s), an academy/demo option, clear plan information, responsive layout. No complex
automated billing in the MVP.

**Acceptance:** plan options and the next step are unambiguous; no non-functional payment control
exists.

### 5.3 Authentication

Flows: sign up · login · logout · session handling · password recovery (if password auth is used) ·
role-aware redirect.

**Acceptance:**
- Valid credentials land the user on their own role dashboard.
- Invalid credentials produce a clear, non-enumerating error.
- Logout invalidates the session; back-navigation does not restore authenticated content.
- An expired session redirects to login with a clear message, preserving the intended destination
  where safe.

---

## 6. Student — MVP

### 6.1 Navigation (MVP active)

```text
Home / Dashboard
Practice        → Psychology (TAT, WAT, SRT, SDT) · Interview
Progress
Resources
Profile
```

Absent from MVP navigation (deferred): Mentorship booking, Knowledge Base expansion, Groups,
Assessments, Events & Live Classes, Achievements, Leaderboard, Career Guide. The 5-Day SSB Practice
Journey is no longer deferred — see §6.4a; it lives inside the existing `Practice` nav item, not as a
separate top-level entry.

### 6.2 Onboarding

Collects student information · target exam / preparation stage · academy relationship where
applicable · preparation goals. Includes validation and a completion state.

**Acceptance:**
- A new student completes onboarding and arrives at the dashboard.
- Input is validated field-by-field with clear messages.
- Onboarding cannot be silently skipped, and cannot be repeated once complete.
- Refreshing mid-flow does not lose already-entered data.

### 6.3 Student dashboard

Must answer immediately: (1) What should I do today? (2) How am I performing? (3) What should I
improve?

| Section | Content | Notes |
|---|---|---|
| Header | Greeting, preparation stage | Text, not a capsule |
| Overall readiness | Single indicator derived from real activity | Must state what it is based on |
| Activity metrics | Practices completed, sessions attended | Real data only |
| Today's Mission | The one recommended next action | Primary capsule |
| Upcoming session | Next scheduled session, or empty state | — |
| My Progress | Compact trend / skill summary linking to Progress | Chart only if it answers a question |
| Recent activity | Last few real activities | Empty state for new students |
| Recommendations | Next practice suggestions based on weak areas | Must be explainable |

**Acceptance:**
- Every number originates from the API; no hardcoded metric exists in the component tree.
- A brand-new student with zero activity sees a coherent dashboard with a clear first action.
- The primary action is identifiable without reading the whole screen.
- Achievements and Leaderboard do not appear.

### 6.4 Practice Zone

```text
Practice → category (Psychology · Interview) → activity (TAT/WAT/SRT/SDT) → instructions → task → response → submit
```

A practice flow contains: introduction · instructions · question/task · response input · submission ·
processing state · feedback · improvement recommendation · next action.

MVP is text-based. Voice and video workflows are deferred until the product requires them.

| Test | Nature | Requirement |
|---|---|---|
| TAT | Story in response to a picture stimulus | Timed stimulus display, then a writing window |
| WAT | One sentence per word stimulus | Rapid sequence, one word at a time, per-item timing |
| SRT | Reaction to a situation | Situation text, free-text reaction |
| SDT | Self-description | Prompted long-form response |

Timing rules for each test must be defined before that test is implemented. A test whose timing is
undefined is `BLOCKED`, not guessed.

**Acceptance:**
- The list shows only activities that actually exist.
- Instructions are readable before any timed portion begins.
- Navigating away and back does not silently destroy an in-progress response without warning.

### 6.4a 5-Day SSB Practice Journey (T039 — un-deferred 2026-09-20)

**Decision:** originally listed as deferred (P1) in §3 above. Un-deferred by explicit user direction
2026-09-20, referencing Target SSB (targetssb.in) as functional/structural inspiration — content and
information architecture only, not its visual design (AGENTS.md §7 still governs UI).

```text
Practice → Day 1..5 → module (reading · info · practice bank · timed test · checklist · summary)
```

Practice's top-level page is now the 5-day overview (an overall progress ring + Day 1–5 list),
replacing the flat Psychology/Interview category list. The existing Psychology (TAT/WAT/SRT/SDT) and
Interview flows from §6.4/§6.5 are reused, not duplicated: Day 2's Test cards and Day 4's Personal
Interview card link to those existing routes rather than re-implementing the timed-test flow.

| Day | Modules |
|---|---|
| Day 1 | Screening (reading) · OIR Practice/Test · OIR Non-verbal Practice/Test · PPDT (test) |
| Day 2 | WAT/TAT/SRT Practice + Test · Self Description (links to the existing §6.4 flow) |
| Day 3 | GTO Blogs/Lectures (reading) · GD, Group Planning, PGT, HGT, Race, Lecturette (info) |
| Day 4 | Individual Obstacles, Command Task, FGT (info) · Personal Interview (practice bank, links to the existing Interview route) |
| Day 5 | Conference Preparation (reading) · Conference Questions (practice bank) · Mock Conference (info) · Final Self Assessment (checklist) · SSB Journey/Final Progress (summary) |

**Module kinds:**
- **reading/info** — static guidance content; no completion tracking (matches the reference product,
  which only tracks progress on question-bank modules).
- **practice bank** — untimed, self-paced, browsable in any order; per-item completion is tracked and
  feeds the progress ring/bars. MCQ items (OIR) show correctness immediately; free-text items are
  self-marked done.
- **timed test** — a single timed sitting (OIR/OIR Non-verbal Test use a new MCQ runner; PPDT reuses
  the existing carousel stimulus/response runner from §6.4). No per-item completion tracking — a test
  is submitted once, matching §6.5's submission requirements.
- **checklist** — a one-time self-assessment (Final Self Assessment: rate yourself 1–5 across the ten
  standard OLQs), stored locally, never shown to anyone else.
- **summary** — Day 5's aggregate view of progress across all five days.

**Data:** all question-bank content (OIR verbal/non-verbal MCQs, PPDT scene, interview/conference
question sets) is placeholder content per AGENTS.md §8 — realistic in style, small in volume compared
to a real production content bank, with every displayed count computed from the actual content array
length (never an invented figure matching the reference product's marketing numbers).

**Acceptance:**
- Every module listed above resolves to a working page (no dead links, no "coming soon" placeholders
  except where a module has no interactive form yet — those still carry real descriptive content).
- A student can complete a full Day 1→5 walkthrough without any client-side error.
- Progress percentages/counts always equal real completed-item counts over real content-array length.
- Existing Psychology/Interview routes and their behavior from §6.4/§6.5 are unchanged.

### 6.4b Interview & Conference practice depth (T039b — 2026-09-24)

Requested by the user 2026-09-24 for both Day 4's Personal Interview and Day 5's Conference.

```text
Interview (Day 4)   Practice questions · My PIQ questions · Mock interview
Conference (Day 5)  Conference Questions (practice) · Mock Conference
```

- **Saved answers.** Every free-text practice bank (not only interview/conference) keeps what the
  student typed per question, restores it when they come back, and never clears it on Next/Previous.
- **Guidance per question.** Interview and conference questions carry an optional "what assessors
  look for" line plus 2–3 tips, and the bank shows a short self-review checklist the student ticks
  after answering (stored with the answer). Guidance is preparation advice, never a selection
  prediction (AGENTS.md §11).
- **PIQ-based questions (interview only).** The student fills a short PIQ-style form (hometown,
  education, favourite subject, sports, hobbies, activities, achievements, previous SSB attempts; all
  optional, at least one required). Questions are generated from fixed templates, with no AI and no
  network call, and practised like any other bank. The conference is about the week's performance, so
  it has no PIQ questions.
- **Mock mode.** A timed run, one question at a time with a per-question countdown and a manual
  "Next question" button, followed by a review screen (question, answer, guidance, self-review).
  Interview: 8 questions, 2 min each, starting with "Tell us about yourself", up to 3 of them from the
  student's PIQ. Conference: 4 questions, 1 min each. These are **practice pacing values, not
  official SSB timings**. The latest attempt per mock is kept for review. Leaving mid-mock warns
  first.
- **Storage.** Answers, PIQ and mock attempts are per-browser (localStorage) until the practice
  backend exists, the same pattern and known gap as §6.4a progress.
- **Progress totals.** Generated PIQ questions are not counted in the 5-day journey's progress
  totals, because those totals come only from the fixed content banks.

**Acceptance:**
- Typing an answer, moving to another question, and coming back (or reloading) shows the same text.
- Every interview and conference question shows its guidance; self-review ticks persist per answer.
- Saving a PIQ with at least one field shows questions that quote what the student entered; saving
  an empty PIQ shows a validation error instead.
- A mock can be finished early question by question or by letting timers run out; either way the
  review screen shows every question with its answer or "No answer".
- Routes: `/student/practice/interview`, `/student/practice/interview/piq`,
  `/student/practice/interview/mock`, `/student/practice/conference/mock`. Day 5's Mock Conference
  card links to the latter.

### 6.5 Practice submission

Requirements: response validation · submission state · duplicate-submission prevention · network
failure handling · response preserved during processing.

**Acceptance (objective):**
- One submit action produces exactly one submission; rapid repeated clicks do not create duplicates.
- On network failure the response remains present and re-submittable.
- The user always knows whether submission succeeded.
- Leaving the page during processing does not lose the submission.

### 6.6 AI feedback

Fixed structure:

```text
Observation → Evidence → Impact → Improvement Action → Recommended Practice
```

Requirements: specific to the submitted response · actionable · respectful · non-judgemental ·
clearly marked AI-assisted · never phrased as a selection outcome.

A disclaimer is present wherever AI feedback is displayed: the feedback is AI-assisted preparation
guidance, not an official SSB assessment.

**Acceptance:**
- Feedback references the student's actual response content, not generic advice.
- All five sections are present, or the response is treated as malformed.
- The AI-assisted indicator is visible without interaction.
- No selection-outcome claim and no clinical or psychological diagnosis appears.

### 6.7 AI failure handling

Handled: timeout · provider error · rate limit · empty response · malformed response · network error ·
retry.

**Acceptance:**
- No failure mode loses the student's response.
- No failure mode exposes technical detail, prompts or provider identity.
- The student can retry, or is told clearly when they can.
- The practice loop remains usable after any failure.

### 6.8 My Progress

Shows overall readiness · practice performance · skill-area performance · activity history ·
improvement areas · trends where sufficient data exists.

**Acceptance:**
- No percentage is shown unless derived from real, explainable data.
- With insufficient data the view says so rather than rendering a fake or flat trend.
- Improvement areas correspond to actual weak signals.

### 6.9 Resources

Resource list · categories · resource detail · read/completion state where required.

**Acceptance:** an empty state exists; a resource opens and its completion state persists.

### 6.10 Student profile

Profile information · edit · validation · account settings.

**Acceptance:** edits persist, validation errors are clear, a failed save does not lose input.

---

## 7. Mentor — MVP

### 7.1 Navigation (MVP active)

```text
Dashboard · Mentees · Evaluations · Sessions (basic) · Profile
```

Deferred: mentor-side batch management, content & resources, announcements, calendar, messages,
earnings, AI assistant, mentor rating.

### 7.2 Mentor dashboard

Must answer: **Which students need my attention?**

Sections: total mentees · sessions this week · pending evaluations · average mentee score · today's
schedule · mentee progress overview · recent evaluations · mentor tools.

**Acceptance:**
- Within one screen the mentor can identify a concrete next action.
- All metrics are real; a mentor with no mentees sees a coherent empty state.

### 7.3 Mentee list

Student list · search where necessary · useful filters · performance · weak areas · evaluation
status · last activity.

**Acceptance:** only authorised mentees are returned, verified server-side rather than filtered in
the client.

### 7.4 Mentee detail

Overview · batch · performance · activity · AI feedback · mentor feedback · evaluation action ·
session action where applicable.

**Acceptance:** a mentor cannot reach a non-assigned student by editing the URL; the attempt returns
a forbidden/not-found state, never partial data.

### 7.5 Evaluation

Fields: student · activity/session · score · strengths · improvement areas · comments · save/submit ·
status (`pending · in_review · reviewed`).

**Acceptance:**
- A saved draft is recoverable.
- Submission is idempotent; a double submit creates one evaluation.
- The evaluation appears on the student's record with evaluator and timestamp.
- Only evaluation criteria approved in this specification are used; new criteria require a documented
  source and rationale.

### 7.6 Sessions (basic)

Session list · detail · create basic session · states `scheduled · completed · cancelled` · join/view
where applicable. Complex scheduling (recurrence, availability matching, calendar sync) is deferred.

**Acceptance:** a session can be created, appears on both mentor and student views, and can be
cancelled with the state reflected in both.

### 7.7 Mentor profile

Profile · editable fields · settings.

---

## 8. Academy Admin — MVP

### 8.1 Navigation (MVP active)

```text
Dashboard · Students · Batches · Mentors · Reports · Settings
```

Deferred: courses, attendance, assessments, announcements, messages, advanced insights.
Admin-side practice authoring, previously listed here, was un-deferred 2026-10-07 as Super Admin
global content plus mentor-owned content. See §8a.4.

### 8.2 Academy dashboard

Must answer: **How is my academy performing, and which students need attention?**

Sections: total students · active batches · total mentors · average readiness · student readiness
overview · batch performance · mentor overview · students needing attention · alerts & reminders ·
quick actions.

**Acceptance:**
- Every figure is scoped to the admin's own academy, enforced server-side.
- Each chart has a stated interpretation; a chart with no actionable reading is removed.
- "Students needing attention" is presented as a signal with its reason ("No practice activity for
  4 days"), never as a character judgement.

### 8.3 Student management

List · search · useful filters · detail · add · edit · status · batch assignment · mentor assignment
where permitted.

**Acceptance:** adding a student validates duplicates; status changes are auditable; a student is
never assignable across academies.

### 8.4 Batch management

List · create · edit · detail · add/remove student · assign mentor · batch performance.

**Acceptance:** removing a student from a batch does not delete their history; batch performance
reflects current members unless explicitly stated otherwise.

### 8.5 Mentor management

List · add/invite · detail · assigned student count · session activity · pending evaluations.

**Acceptance:** an invited mentor who has not accepted is visibly distinguished from an active mentor.

### 8.6 Reports

Readiness distribution · batch performance · student activity · pending evaluations · mentor workload
where data exists.

**Acceptance:** a report with insufficient data states that plainly instead of rendering an empty or
misleading chart.

### 8.7 Academy profile / settings

Academy information · admin profile · basic settings.

---

## 8a. Platform Architecture — Four Roles (brief 2026-10-07)

**Decision:** the user supplied a full platform brief on 2026-10-07. It supersedes the earlier
"three admin panels with per-area grants" idea and un-defers "admin-side practice authoring" from
§8.1, as platform content owned by the Super Admin (§8a.4). Delivered in ten phases (§8a.6),
tracked as T080–T089.

### 8a.1 Roles and workspaces

One application, one authentication system, one design system, one database. Four role-based
workspaces:

| Role | Workspace | Manages |
|---|---|---|
| `SUPER_ADMIN` | `/admin` | The entire platform: all users, academies, global learning content, permissions, platform analytics, system configuration |
| `ACADEMY_ADMIN` | `/academy` | Their own academy only: batches, students, mentor-to-batch assignment, academy content, academy/batch performance |
| `MENTOR` | `/mentor` | Their own teaching content and schedule; evaluates and monitors only the batches/students assigned to them |
| `STUDENT` | `/student` | Their own academy, batch, mentors, available content, sessions, assessments, submissions, feedback, progress, notifications |

The UI must make it immediately clear which role is signed in (sidebar and header role label) and
what that role may manage.

### 8a.2 Authorization chain

```text
Authentication → Role → Academy → Batch → Assignment → Resource → Permission
```

Enforced server-side on every page, action and query, with Postgres RLS as a second line of defence.
Possessing an ID never grants access. An academy can never reach another academy's students, mentors,
batches, content or analytics.

### 8a.3 User Management (separate from Content Management)

- **One identity system.** Supabase Auth stays the only authentication provider. `profiles` is the
  central users table: id, name, email, phone, auth provider, role, academy membership, status
  (`active · suspended`), last login, created/updated timestamps.
- **Role-specific profiles** (1:1): `student_profiles`, `mentor_profiles`, `academy_admin_profiles`,
  `super_admin_profiles`.
- **Who can set what.** Self-signup creates only a Student or an Academy Admin. A Mentor joins only
  through an invite. Only a Super Admin can change role, academy, status or email, and never their own
  role or status. The first Super Admin is created by hand in the database.
- **Suspension.** A suspended account is signed out on its next request and can't log in.
- **Audit.** Every role or status change records who changed it, when, and from/to what.

**Acceptance (Phase 1):**
- A signed-out visitor to any workspace is sent to login. A signed-in user of another role gets the
  forbidden state. A Super Admin can't open other roles' workspaces either.
- A user can't change their own role, academy or status by any means, including calling the API
  directly.
- The Super Admin dashboard shows real platform totals. User Management lists every account with
  search, role/status filters, sorting and pagination. A user's detail page shows their account
  information, role and status changes with confirmation, and the account history.
- Changing a user to Mentor or Academy Admin requires them to belong to an academy.

### 8a.3b Academies (Phase 2)

- **Academy record:** name (2–80 chars), description, logo URL, contact email, contact phone,
  status (`active · suspended`), created/updated timestamps.
- **Super Admin** (`/admin/academies`):
  - List with search, status filter, pagination, and per-academy counts of admins, mentors and
    students.
  - Create and edit academies.
  - Suspend or reactivate an academy, with confirmation.
  - Manage members: add an existing account by email as Student, Mentor or Academy Admin; move
    someone between academies; remove a student.
  - A Mentor or Academy Admin can't be left without an academy: change their role first.
  - A user's academy can also be changed from their User Management page.
  - Every change is audited.
- **Academy Admin** (`/academy/settings`): edits their own academy's name, description and contact
  details. They can never change its status or reach another academy.
- **Suspension:** while an academy is suspended, its admins, mentors and students are signed out on
  their next request and can't log in. Super Admins are unaffected.

**Acceptance (Phase 2):**
- Academy counts and lists come from the database. A newly created academy appears immediately with
  zero members.
- Adding a member by email fails clearly for an unknown email, for a super admin, and when the
  role/academy rules above would be broken.
- An academy admin can edit only their own academy, and can't change its status, even by calling
  the API directly.
- Members of a suspended academy can't use the platform until it's reactivated.

### 8a.3c Batches, Students and Mentor assignment (Phase 3)

- **Batch membership** is first-class: `batch_students` (a student is in at most one batch at a
  time) and `batch_mentors` (any number of mentors per batch). Both sides must belong to the
  batch's academy and have the right role, which the database enforces.
- **Academy Admin**, for their own academy only:
  - **Students:** list with search, batch and status filters, sorting and pagination.
  - **Add a student by email:** an existing account with no academy joins this one; a new person
    is emailed an invite. A student already in another academy can't be taken.
  - Change a student's batch, or remove a student from the academy.
  - **Batch detail:** add/remove students and assign/remove mentors.
  - **Mentors:** the academy's mentors with their batches, plus invite a mentor.
- **Mentor:** "Mentees" lists exactly the students in batches they're assigned to. Opening any other
  student, from this academy or another, is "not found", enforced on the server and by RLS.
- No readiness, performance or activity figure is shown until it comes from real data (Phase 8).

**Acceptance (Phase 3):**
- Student and mentor membership in batches comes from the database. Counts match.
- An academy admin can't add, move or view students of another academy, even by calling the API
  directly.
- A mentor sees only their assigned batches' students; changing an id in the URL yields not-found.
- Removing a student from an academy also removes them from its batches; their account is kept.

### 8a.4 Content Management (Phase 4–5)

"Student content" means **platform learning content that students consume**, not managing students.

**Global content (Super Admin, Phase 4):** `/admin/content`.
- **Fields:** title, description, category (Psychology · GTO · Interview · Communication · Current
  Affairs · General), type (study material · video · document · article · practice exercise ·
  assessment · session template · mock SSB activity), difficulty (easy · medium · hard), target role
  (students · mentors · both), visibility (everyone · assigned only), status
  (`draft · published · archived`), body text and/or an https link, created_by, updated_by,
  created_at, updated_at, published_at.
- Content is never deleted; it's archived. Only published content is ever visible to readers.
- **Assignment:** content with "assigned only" visibility reaches only the academies or batches it's
  assigned to.
- **Readers:** a student sees published content targeted at students that is visible to everyone,
  or assigned to their academy or their batch. A mentor sees the same for mentors, through their
  academy or their assigned batches. Academy admins see what reaches their academy. This is
  enforced by RLS, not only in the UI.

**Acceptance (Phase 4):**
- A Super Admin creates content as a draft, publishes it, and it appears in the right readers'
  Library. Archiving removes it from readers.
- Assigned-only content never appears for an academy or batch it isn't assigned to, even by id.
- Every field is validated on the server; links must be https.
- No content figure or list is hard-coded.

**Follow-up (T083b):** move the existing practice banks, 5-day journey modules and resources (still
`lib/mock/*`) onto this content model. Their runners need structured item formats (TAT images, WAT
words, MCQs), so that's a separate, specified task.

**Mentor content (Phase 5):** mentors create teaching material, session templates, practice
exercises, documents, videos and assessments where permitted. They edit and archive only their
own, and publish to their assigned batches/students. It's kept separate from global content; a
mentor can never modify global content.

### 8a.5 Domain model

```text
users(profiles) · student_profiles · mentor_profiles · academy_admin_profiles · super_admin_profiles
academies · batches · batch_students · batch_mentors · contents · content_assignments · sessions ·
session_participants · assessments · assessment_attempts · feedback · student_progress ·
notifications · audit_log
```

Proper foreign keys, indexes, timestamps and audit fields. Seed data is for development only. No
dashboard figure, user, academy, batch, session, content item or progress value is hard-coded.

### 8a.6 Phases and end-to-end workflow

```text
1 Auth + Users + Roles + RBAC        6 Session scheduling
2 Academies + Academy Admin          7 Assessments + Feedback
3 Batches + Students + Mentor assign 8 Progress tracking
4 Global content management          9 Role-specific dashboards
5 Mentor content management          10 Analytics + Notifications
```

Every phase ships with a working frontend and backend against the real database, never as static
mockups. The finished workflow is: Super Admin publishes content → Academy Admin creates a batch,
adds students and assigns mentors → Mentor schedules a session → students attend and practise → the
mentor evaluates and the feedback is stored → progress updates → each role sees the same progress
data at its own scope (Student: "My Progress"; Mentor: "My Assigned Students"; Academy: "Academy /
Batch Performance"; Super Admin: "Platform Analytics").

---

## 9. Data Lifecycle Requirements

The product must behave correctly when:

- a student joins late, changes batch, changes mentor, becomes inactive, or leaves the academy
- a mentor handles multiple batches or becomes inactive
- multiple academy admins exist
- an evaluation remains pending indefinitely
- a session is cancelled
- a student has no recent activity

Entities are not static: prefer explicit status fields and timestamps over implicit state.

---

## 10. API Contract Requirements

The backend contract must cover authentication · users · students · mentors · academies · batches ·
practice · submissions · evaluations · AI feedback · sessions · progress.

For each endpoint the contract defines request shape · response shape · error shapes · authorization
rule · pagination behaviour.

Until the contract is finalised, types are defined frontend-side in `types/` and treated as the
working contract. Backend assumptions must not leak into components.

---

## 11. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Responsive | Correct on mobile, tablet, laptop, desktop, large display |
| Accessibility | Keyboard, focus, labels, headings, contrast, non-colour status, touch targets |
| Security | Server-side authorization, academy isolation, input validation, no client secrets |
| Performance | Fast initial load, no duplicate requests, paginated large lists, no stacked or animated blur |
| SEO | Public pages have metadata, titles, descriptions, semantic HTML; authenticated pages need no marketing treatment |
| Data integrity | No fabricated metrics; mock data isolated and never in production paths |

Numeric performance targets are deliberately not stated until they can be measured against a real
build. Do not invent guarantees.

---

## 12. MVP Acceptance Criteria (product-level)

**Student**
- Can sign up, onboard and reach the dashboard.
- Can start a practice activity, submit a response and receive AI feedback.
- Experiences a safe, non-destructive failure when AI feedback fails.
- Can see progress and at least one concrete improvement area.

**Mentor**
- Can see assigned mentees and their performance.
- Can open a mentee, review activity and AI feedback, and submit an evaluation.
- Cannot access non-assigned students by any means.

**Academy**
- Can manage students, batches and mentors.
- Can see readiness and identify students needing attention.
- Cannot access another academy's data by any means.

**Platform**
- Role-based access works and is enforced server-side.
- Critical error states work.
- Responsive UI works on mobile and desktop.
- Critical tests pass; the production build succeeds.
- No secrets exposed; no mock data in production paths.
- Every screen passes the twelve-point test in `AGENTS.md` §7.11.

---

## 13. Out of Scope for the Initial MVP

Groups · Leaderboard · Achievements · Career Guide · advanced live classes · advanced events ·
advanced attendance · advanced messaging · advanced analytics and reports · AI Mentor · Mentor AI
Assistant · Earnings · complex scheduling · full ERP functionality · complex finance management ·
automated billing.

The 5-Day SSB Practice Journey, previously listed here, was un-deferred and built 2026-09-20 — see
§6.4a. Mentor/Academy visibility into a student's journey progress and AI feedback on journey
submissions remain out of scope for now (the latter is the same B3 blocker as §6.6).

These belong to the broader vision and must not block the MVP.

---

## 14. Final Product Rule

If building more features conflicts with making the core workflow reliable:

> **Choose reliability of the core workflow.**

Primary objective: **Student Practice → AI Feedback → Improvement**, supported by
**Mentor Guidance + Academy Visibility**.
