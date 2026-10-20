<div align="center">

# SSB Academy

**A role-based preparation platform for India's Services Selection Board (SSB) interview —
for students, their mentors, the academies that train them, and the team that runs it all.**

[![CI](https://github.com/gaurav-vv/EliteCadet-ssb/actions/workflows/ci.yml/badge.svg)](https://github.com/gaurav-vv/EliteCadet-ssb/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3FCF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Tests](https://img.shields.io/badge/tests-Vitest%20%C2%B7%20Playwright%20%C2%B7%20SQL-6E9F18?logo=vitest&logoColor=white)

[Features](#features) · [Screenshots](#screenshots) · [Architecture](#architecture) · [Security](#security-model) · [Getting started](#getting-started) · [Testing](#testing) · [Docs](#project-docs)

</div>

---

## Why

SSB selection runs over five days — screening, psychology tests, group tasks, a personal interview
and a final conference. Candidates usually prepare alone, mentors juggle notes and spreadsheets, and
academies can't see who is falling behind until it's too late.

SSB Academy puts the whole preparation loop in one place:

```text
Student   Practise  →  get mentor feedback  →  improve  →  practise again
Mentor    See mentees  →  review their work  →  evaluate  →  follow up
Academy   Organise batches  →  monitor progress  →  act on who needs attention
```

Every number on every screen comes from real rows in the database — no sample figures, no invented
"readiness" scores.

## Features

### Students
- **5-day SSB practice journey** — OIR (verbal and non-verbal), PPDT, TAT, WAT, SRT, SDT, interview and
  conference practice, self-paced or as timed tests that mirror the real format.
- **Answers saved to the account** as you type, with a retry that never loses text; timed tests are
  scored on the server.
- **Mock interview and mock conference**, including questions built from the student's own PIQ form.
- **Assessments** from mentors — draft, submit once, then read structured feedback.
- **My Progress** — score trend, averages by area, strength and weak area, attendance, rule-based next
  steps that always say *why*.
- **Dashboard** with Today's Mission, practice streak, next session and recent feedback.
- Sessions calendar, a role-scoped content Library and in-app notifications.

### Mentors
- Mentees from **their batches only**, with average score, attendance and a full progress view.
- **Session scheduling** with availability, no double-booking and attendance marking.
- **Assessments and evaluations** — recoverable draft reviews, locked final reviews with score,
  strengths and improvement areas.
- Each mentee's own **practice answers** and test results.
- **My Content** — create material, start from platform templates, publish to their batches, or
  request custom content from the platform team.

### Academy admins
- Students, batches and mentors, with batch membership as a first-class concept.
- **Performance** — per-batch averages, attendance, practice activity and a *Needs attention* list
  with the reason for each flag.
- Dashboard tasks (reviews waiting, batches without a mentor, unplaced students, pending invites) and
  reports.

### Super admin
- Users, roles and academies across the platform.
- The global **Content Library** and **Practice Banks** (add, edit, reorder, hide questions).
- Content requests with quotes, and **Platform Analytics** across every academy.

## Screenshots

> Rendered locally with clearly labelled sample data.

| Academy dashboard | Mentor dashboard |
|---|---|
| ![Academy dashboard](docs/screenshots/phase-9/academy-dashboard.png) | ![Mentor dashboard](docs/screenshots/phase-9/mentor-dashboard.png) |

| Student progress | Student practice, saved to the account |
|---|---|
| ![Student progress](docs/screenshots/phase-8/student-progress.png) | ![Saved practice](docs/screenshots/t083b/student-saved-practice.png) |

| Platform analytics | Practice bank editor |
|---|---|
| ![Platform analytics](docs/screenshots/phase-10/admin-analytics.png) | ![Practice bank editor](docs/screenshots/t083b/admin-practice-bank.png) |

## Architecture

```mermaid
flowchart LR
  B[Browser<br/>React 19 client components] -->|Server Actions| S
  B -->|RSC requests| S
  subgraph S[Next.js 16 App Router]
    P[Pages / layouts<br/>Server Components] --> SV[lib/server/*<br/>services: authorize, validate]
    A[lib/actions/*<br/>Server Actions] --> SV
  end
  SV -->|user's own session| DB[(Supabase Postgres<br/>RLS · triggers · views)]
  SV -. invites only .-> AUTH[Supabase Auth<br/>service role]
```

- **Server-first.** Pages are Server Components; `"use client"` only where a screen is interactive.
- **One service layer.** Each domain lives in `lib/server/<domain>/` — pure validation (unit tested),
  a service that checks the role and scope first, and errors mapped to plain language. Server Actions
  in `lib/actions/` are thin entry points.
- **The database enforces the rules too.** Row-level security, triggers and security-invoker views
  mean a bug in the app can't leak another academy's data or skip a lifecycle rule.
- **Derived, not duplicated.** Progress, dashboards and analytics are computed from source rows
  (reviewed feedback, attendance, practice) rather than stored copies.

### Project structure

```text
app/                 routes: (public), student, mentor, academy, admin
components/          UI by area (practice, progress, dashboards, academy, admin, ui)
lib/server/          domain services: users, academies, academy-people, content, sessions,
                     assessments, progress, dashboards, notifications, analytics, practice
lib/actions/         Server Actions
lib/practice/        5-day journey structure and timing
types/               shared domain types
supabase/migrations/ 0001–0014, applied in order
supabase/tests/      end-to-end database workflow check
tests/               Vitest unit + integration, Playwright e2e
```

## Security model

| Concern | How it's handled |
|---|---|
| Roles | `student`, `mentor`, `academy_admin`, `super_admin`. The role comes from service-role-only `app_metadata`; a role sent from the browser at sign-up is ignored. |
| Authorization | Checked server-side in every service **and** by Postgres RLS. Hiding a route is never the only guard. |
| Academy isolation | The academy always comes from the signed-in session, never the request. Cross-academy reads and writes are refused by RLS. |
| IDOR | Changing an id in a URL returns *not found* unless the resource is in the caller's scope. |
| Lifecycles | Triggers enforce them: questions lock once an assessment opens, one submission per student, final reviews lock, attendance only after a session starts. |
| Notifications | Written by database triggers; clients can't create them and can only mark their own as read. |
| Secrets | Never in the browser. The service-role key is used only server-side, for invites. |


## Getting started

### Prerequisites

- Node.js 22 or later
- npm
- Docker running
- Supabase CLI (used through `npx supabase`)
- A local `.env.local` file containing the required environment variables

### 1. Clone and install

```bash
git clone https://github.com/gaurav-vv/EliteCadet-ssb.git
cd EliteCadet-ssb
npm ci
```

### 2. Configure environment variables

Create `.env.local` in the project root. For local development, use the local Supabase URL and keys generated by the Supabase CLI.

The file must contain the variables required by the application, including:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=your-local-livekit-secret
```

Use the actual local development secret configured for LiveKit. Check the application's environment validation and existing local setup for other required variables.

**Never commit `.env.local` or expose secret keys.**

### 3. Start Supabase

Open Terminal 1:

```bash
npx supabase start
```

Wait until the local development setup is running.

Useful local URLs:

- Supabase API: http://127.0.0.1:54321
- Supabase Studio: http://127.0.0.1:54323
- Mailpit (local email testing): http://127.0.0.1:54324

### 4. Start LiveKit

In Terminal 2, from the project root:

```bash
set -a
source .env.local
set +a

export LIVEKIT_DEV_SECRET="$LIVEKIT_API_SECRET"

docker run --rm --name livekit-dev --network host \
  -e LIVEKIT_KEYS="devkey: $LIVEKIT_DEV_SECRET" \
  -v "$PWD/scripts/livekit/livekit.dev.yaml:/etc/livekit.yaml:ro" \
  livekit/livekit-server --config /etc/livekit.yaml --node-ip 127.0.0.1
```

Keep this terminal open while testing meetings.

If Docker reports that `livekit-dev` already exists, check its status before starting another container:

```bash
docker ps -a --filter name=livekit-dev
```

If the container is already running, do not start another instance.

### 5. Start the website

Open Terminal 3:

```bash
npm run dev
```

Wait for Next.js to report that the development server is ready.

Open **http://localhost:3000** in your browser and sign in.

### 6. Verify the platform

Before testing live meetings, confirm that:

- Supabase is running.
- LiveKit is running without startup errors.
- Next.js is ready.
- The platform loads at `localhost:3000`.
- A meeting can be joined successfully.

If a meeting reports that the video service cannot be reached, check the LiveKit terminal and verify that the service is running.

### 7. Stop local services

- Stop Next.js with `Ctrl+C` in Terminal 3.
- Stop LiveKit with `Ctrl+C` in Terminal 2.
- Stop Supabase only when you want to shut down the local database and services:

```bash
npx supabase stop
```

You do not need to reapply database migrations every time you start the platform.

### Live meetings and database migrations

One-to-one and batch meetings use LiveKit over WebRTC. The required meeting migrations include `0022`, `0023`, `0024`, and `0025`. Apply them to the intended database in order, following the project's migration instructions.

Pushing migrations to GitHub does **not** apply them to a hosted Supabase database.

See [`docs/live-meetings.md`](docs/live-meetings.md) for meeting architecture, scheduling rules, deployment, and TURN configuration.

See [`docs/RUNNING_GUIDE.md`](docs/RUNNING_GUIDE.md) for the quick local startup checklist.

**Live meeting rooms (optional):** in-app one-to-one and batch video meetings run on LiveKit
(WebRTC). Apply migrations `0022`–`0025`, start a local `livekit-server`, and set `LIVEKIT_URL`,
`LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` (server-only). Without them, everything else works and
the meeting page says video isn't set up. Setup, the scheduling rules and production/TURN notes are
in [`docs/live-meetings.md`](docs/live-meetings.md).

## Testing

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
```

The database layer has its own end-to-end check. It applies every migration to a **throwaway local
Postgres** and walks the whole workflow as each role under real RLS — isolation, lifecycles,
notifications, progress, analytics and practice:

```bash
PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres supabase/tests/run-workflow-check.sh
```

> Never point it at a real project — it drops and recreates its own database.

CI runs lint, type checks, unit and integration tests, the production build and Playwright on every
pull request.

## Project docs

| File | Answers |
|---|---|
| [`specs.md`](./specs.md) | What the product must do |
| [`AGENTS.md`](./AGENTS.md) | How it's built — architecture, conventions, design system |
| [`task.md`](./task.md) | What's being built, in what order |
| [`status.md`](./status.md) | The verified state of the repository today |
| [`tests/TEST_CASES.md`](./tests/TEST_CASES.md) | Every test case and how it's verified |

## Contributors

Built by the EliteCadet team. Platform build-out — roles and RBAC, academies, batches, content,
sessions, assessments, progress, dashboards, notifications, analytics and saved practice — by
[**@mani6409**](https://github.com/mani6409).

<div align="center"><sub>Preparation guidance only — SSB Academy never predicts a selection outcome.</sub></div>
