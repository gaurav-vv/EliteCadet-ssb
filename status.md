# status.md — SSB Academy Web Platform State Snapshot

**Type:** Current project state. Reporting only — never a source of requirements.
**Question this file answers:** *If I open this project today, what is the exact state?*
**Last updated:** 2026-09-16

---

## 0. Evidence Basis (read this first)

This snapshot was produced from the four documentation files only. **No repository, source tree,
`package.json`, or build was available for inspection.**

Consequently:

- Every statement about implementation is `UNVERIFIED`.
- Nothing below claims a feature works.
- Task **T001 (repository inspection)** must be run before any other statement here can be upgraded.

Status vocabulary used throughout: `VERIFIED` · `UNVERIFIED` · `PARTIAL` · `BROKEN` · `BLOCKED` ·
`DEFERRED`.

---

## 1. Current State

| Field | Value |
|---|---|
| Stage | Product definition complete; implementation not verified as started |
| Current focus | Web platform MVP |
| Documentation | `VERIFIED` — all four files rewritten and reconciled 2026-09-16 |
| Codebase | `UNVERIFIED` — not inspected |
| Build | `UNVERIFIED` — never run |
| Tests | `UNVERIFIED` — no suite confirmed to exist |
| Next action | T001 — repository inspection & reconciliation |

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

## 3. Architecture State — `UNVERIFIED`

| Area | State |
|---|---|
| Project structure | `UNVERIFIED` |
| Routing | `UNVERIFIED` |
| Component library / tokens | `UNVERIFIED` |
| API client layer | `UNVERIFIED` |
| Authentication | `UNVERIFIED` + `BLOCKED` (provider undecided) |
| Authorization / academy isolation | `UNVERIFIED` |
| AI feedback integration | `UNVERIFIED` + `BLOCKED` (provider undecided) |
| Backend / database | `UNVERIFIED` + `BLOCKED` (contract undecided) |
| Storage | `UNVERIFIED` + `BLOCKED` |
| Testing infrastructure | `UNVERIFIED` |

Intended architecture (target, not observed):

```text
Browser → Next.js App → Backend API → PostgreSQL / AI Provider / Storage
```

---

## 4. UI State — `UNVERIFIED`

- **Design system:** Glass Capsule (`AGENTS.md` §7) is mandatory and **newly adopted**. Any UI built
  before 2026-09-16 predates it and must be re-checked against §7.11.
- **Design tokens:** not confirmed to exist → T003.
- **Capsule primitives:** not confirmed to exist → T004.
- **Known migration risk:** earlier guidance specified rounded cards and a purple accent. Any existing
  screen following that guidance is now non-conformant and requires rework, not preservation.

---

## 5. Feature State

Nothing is `VERIFIED`. Everything below is `UNVERIFIED` unless marked `BLOCKED` or `DEFERRED`.

### Student
Authentication `BLOCKED` · Onboarding `UNVERIFIED` · Dashboard `UNVERIFIED` · Practice Zone
`BLOCKED` (timing rules undecided) · Interview practice `UNVERIFIED` · Psychology practice
(TAT/WAT/SRT/SDT) `BLOCKED` · AI feedback `BLOCKED` · AI failure handling `BLOCKED` · Progress
`UNVERIFIED` · Resources `UNVERIFIED` · Profile `UNVERIFIED`

### Mentor
Authentication `BLOCKED` · Dashboard `UNVERIFIED` · Mentees `UNVERIFIED` · Mentee detail
`UNVERIFIED` · Evaluations `UNVERIFIED` · Basic sessions `UNVERIFIED` · Profile `UNVERIFIED`

### Academy Admin
Authentication `BLOCKED` · Dashboard `UNVERIFIED` · Students `UNVERIFIED` · Batches `UNVERIFIED` ·
Mentors `UNVERIFIED` · Basic reports `UNVERIFIED` · Settings `UNVERIFIED`

---

## 6. Known Bugs

**None recorded.** This is not a claim that none exist — no code has been inspected. The first real
bug list comes out of T001, T060 and T065.

---

## 7. Blockers

### B1 — Backend API contract — `BLOCKED`
Must cover authentication, users, students, mentors, academies, batches, practice, submissions,
evaluations, AI feedback, sessions, progress. Each endpoint needs request shape, response shape,
error shapes, authorization rule and pagination behaviour.
**Interim rule:** define types frontend-side in `types/` and treat them as the working contract.
**Blocks:** most of Phases 3–5 at integration level.

### B2 — Authentication provider — `BLOCKED`
Decide against: security, role handling, session handling, implementation effort, backend
compatibility.
**Blocks:** T013, T014, and therefore every authenticated surface.

### B3 — AI provider — `BLOCKED`
The frontend must consume an application-level AI feedback API. Provider credentials never reach the
browser.
**Blocks:** T034, T035 — i.e. the core value loop.

### B4 — Practice timing rules — `NEEDS DECISION`
Per-test timing for TAT, WAT, SRT and SDT is undefined. It must not be guessed; guessed timing makes
practice output non-comparable and the feedback misleading.
**Blocks:** T032 (psychology tests specifically).

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

---

## 9. Technical Debt

**None recorded** — no code inspected. Any hack introduced from here must be recorded in this section
with the task ID that will remove it.

---

## 10. Deferred (not blocking the MVP)

5-Day SSB Mission programme · Groups · Leaderboard · Achievements · Career Guide · advanced live
classes · advanced events · advanced attendance · advanced messaging · advanced analytics · advanced
reports · AI Mentor · Mentor AI Assistant · Earnings · complex scheduling · full ERP · complex finance ·
automated billing · voice and video practice workflows.

---

## 11. Priority Queue

```text
1.  Repository inspection (T001)
2.  Development standards (T002)
3.  Design tokens + capsule primitives (T003, T004)
4.  Base UI system (T005)
5.  Public shell + landing (T010, T011)
6.  Authentication (T013)        ← blocked: B2
7.  Role-based access (T014)
8.  Authenticated layouts (T020–T022)
9.  Student onboarding + dashboard (T030, T031)
10. Practice zone + submission (T032, T033)   ← T032 blocked: B4
11. AI feedback + failure handling (T034, T035) ← blocked: B3
12. Student progress (T036)
13. Mentor dashboard, mentees, evaluations (T040–T043)
14. Academy dashboard, students, batches (T050–T052)
15. Quality and security audits (T060–T066)
16. MVP polish (T070–T072)
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

## 14. North Star

> **Build the smallest reliable web product that proves students prepare better with structured
> practice, AI-assisted feedback, mentor guidance and academy visibility.**
