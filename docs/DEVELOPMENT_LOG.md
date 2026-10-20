# Development Log

## 2026-10-20 (evening) — Meetings production pass; End Meeting and invite bugs

| Error | Root cause | Fix | Verification |
|---|---|---|---|
| After ending (or at the scheduled end) people could see "You left the meeting — rejoin while it's still running" | The outcome came only from LiveKit's disconnect reason. A client disconnecting itself after the end (the host's local disconnect, every student's end-time timer) reads as "client initiated" | `disconnectOutcome` + the shell records "meeting over" before disconnecting | Unit tests; e2e: host and student both see "The meeting has ended" |
| End reported success while the video room was still open | `endMeeting` swallowed `deleteRoom` errors | Success only if the room closed; 3 tries; the error keeps the dialog open with **Try again** | Unit tests (failure, then a retry succeeds) |
| The host could hang on "Working…" | No timeout on server→LiveKit requests (seen under load in the full e2e run) | `requestTimeout: 6` on RoomServiceClient | The full e2e suite passes |
| Overdue meetings were never completed unless someone opened a page | No server-side end enforcement | `finish_overdue_live_meetings()` from every signed webhook event and the worker loop (each minute) | SQL §12 ("the sweep completes the overdue meeting") |
| Attendance = "joined once" | Original 0022 design | 75% of scheduled duration from the union of signed intervals; finalized after the end; idempotent | SQL §12: exact 75%, 44:59, multiple visits, duplicates, overlap, out-of-order, early join, missing leave, never joined, retries, late event, ended early |
| Mentor invite "sent" but the person stayed a student / in another academy | Supabase Auth only re-sends an invite to an unaccepted address and keeps its original metadata | `decideInvite`: re-send identical pending invites; refuse others with clear messages | Reproduced with Auth directly; unit tests; e2e re-send and refusal |
| Students saw "Host: Mentor" and no host in lists | Students can't read the mentor's profile (RLS) | `session_host_names()` (visible sessions only, name only) | SQL checks (student yes, other academy no) |
| Invite emails "not arriving" | Local Supabase has no SMTP: every email (incl. 16:18:53 and 16:19:22 today) is in Mailpit | Unchanged by design; honest local notice; SMTP steps in `docs/email.md` | Auth logs + Mailpit; e2e reads every email from Mailpit |

## 2026-10-20 (later) — "No emails are working anywhere"

**Diagnosis (no settings changed):**
- **Delivery mode:**
  - `.env.local` points at the LOCAL Supabase (`http://127.0.0.1:54321`).
  - The Auth container sends mail to `supabase_inbucket_elitecadet-ssb` (Mailpit, running and
    healthy). No `[auth.email.smtp]` is configured.
  - The "Stopped services" from `supabase status` are realtime, storage, imgproxy, edge runtime,
    analytics, vector and pooler. None of them handle email.
- **Auth logs, today 16:01–16:02:**
  - 2 invites refused with `422 email_exists` (that address already has an account; the form
    shows "An account with this email already exists").
  - 2 invites accepted (`200`). Both are in Mailpit addressed to the Gmail account.
- **Resets:** no `/recover` request has reached Auth since 15:47 (those were the e2e runs). A
  forgot-password attempt made since then didn't reach this Supabase.
- **Probe:** forgot-password in a real browser now returns `/recover` 200, shows "Check your
  email", and the email is in Mailpit.
- **Root cause, shared by both flows:**
  - Local Supabase captures every auth email in Mailpit. Nothing can reach Gmail without SMTP.
  - The UI said "Invite sent" / "Check your email" with no hint of this, so a captured email
    looked like a delivered one.
- Hosted Supabase without custom SMTP only sends to organization members. Not testable from here
  (no access, by instruction).

**Fix:**
- `localMailboxUrl()` (`lib/supabase/env.ts`) and `<LocalMailboxNote/>`: when connected to a local
  stack, the reset confirmation, the mentor-invite success (academy and independent) and the
  student-invite toast say the email was **not sent to a real inbox**, with a link to Mailpit.
  Never shown against a hosted project.
- `docs/email.md`: a one-minute diagnosis.

**Verification:**
- e2e: reset, academy invite, independent mentor invite, bad/expired/reused links, auth guards and
  the LiveKit meeting: 15 passed, 1 skipped (dev-preview mode).
- Vitest 568/568 (new localMailboxUrl tests).
- SQL checks: all pass.
- Lint, typecheck and build pass.

**Not verified:** real external delivery. It needs an SMTP provider and credentials the owner must
configure (`docs/email.md`).

## 2026-10-20 — Email delivery (invites, password reset), independent mentors, live meeting test

**Issue 1 — "invite and reset emails don't arrive".**
- *Root cause (environment, not code):* the app runs against the **local** Supabase stack, which
  has no outgoing SMTP. Auth sends every email to the bundled **Mailpit** catcher
  (http://127.0.0.1:54324).
  - Mailpit held the four invites sent today (to real Gmail addresses). None could ever leave the
    machine.
  - The one reset requested today (from a second dev server on :3100) was sent at 12:04. The
    Supabase containers restarted at 12:06, and Mailpit keeps messages only in memory, so it was
    lost.
  - On a hosted project, Supabase's built-in mailer only sends to organization members, so
    custom SMTP is needed there too (`docs/email.md`).
- *Fix:* documented in `docs/email.md` (how to read local mail; exact production SMTP setup). No
  credentials invented or committed.
- *Verification:* every email below was found in Mailpit and opened in a real browser
  (Playwright).

**Issue 2 — a valid mentor invite showed "This reset link has expired".**
- *Root cause (code):* the invite link lands on `/reset-password#access_token=…`.
  `establishRecoverySession()` reads the tokens from the hash and strips them. In development,
  React StrictMode runs the page effect twice:
  - The second run found the hash already empty.
  - It checked for a user before the first run's `setSession` had finished, saw none, and showed
    "expired".
  - Password resets were unaffected (they use `?code=` handled on the server).
- *Fix:* `lib/api/auth.ts` — overlapping calls share one in-flight attempt.
- *Verification:* a unit test reproduces the overlap. The new e2e test runs the full journey:
  invite → Mailpit → set password → log in to `/mentor`, with reused and tampered links refused.

**Issue 3 — batch access survived academy moves (isolation bug).**
- *Root cause:* moving a person between academies (super admin) never removed their old
  `batch_mentors` / `batch_students` rows. A moved mentor kept `is_batch_mentor()` access to the
  old academy's rosters and sessions.
- *Fix:* `0024_independent_mentors.sql` adds a trigger that drops batch rows not matching the
  person's academy, plus a one-off repair (0 stale rows locally).
- *Verification:* SQL harness §11.

**Change — independent mentors.**
- A mentor may have no academy. Super admins invite them (`users.invite_mentor`). Academy admins'
  invites still always carry their own academy.
- `roleRequiresAcademy` is now academy admins only. The dashboard tells independent mentors which
  areas are academy-only.

**Verification (all on the local stack):**
- `supabase/tests/workflow-check.sql`: 200 checks, ALL PASSED (migrations 0001–0024 in a
  throwaway DB).
- Vitest: 566/566.
- Playwright `auth-flows-local`: 6 passed ×3 consecutive runs (1 skipped: dev-preview mode).
- **Live meeting** (`tests/e2e/live-meeting-local.spec.ts`): two Chromium sessions with fake
  camera and mic against LiveKit 1.13.10. Passed:
  - Video and audio flowed.
  - Listen-only start, then "allow to speak", then the student's audio reached the mentor.
  - The student had no host controls.
  - Signed webhooks recorded both joins.
  - "End for all" completed the meeting with server times, closed the attendance rows and marked
    the student present.
  - The webhook rejected unsigned and forged calls (401).
- Lint, typecheck and build pass.

**Not verified:** real-inbox delivery (needs a provider and credentials from the owner); a meeting
over a real network with TURN.

## 2026-10-18 — Landing page: remove redundant duplicate content

**Issue.** The landing page was to be checked for unintentionally duplicated content (repeated
Dev Preview links, text blocks, feature or content sections) and each redundant copy removed,
without changing the header or anything else.

**Inspection.** The rendered page (`/`, 1280px wide, dev preview enabled) was audited by listing
every heading, paragraph, list item and link and counting repeats, then checked against the
reference image `elitecadet-landing-reference.png`.

- Sections: each renders exactly once (hero, action panels, Students, Mentors, Academics,
  highlights strip, How It Works, footer/About). No repeated feature or content section.
- Dev Preview links: rendered once (How It Works section, local dev only). Not duplicated.
- Repeats kept on purpose, because the reference design has them: header Request Demo / Login /
  Sign Up versus the "Request a Demo" and "Already a member?" panel buttons; "Request a Demo" as
  the hero button and the panel title; "Track your progress" in the hero benefits and the
  Students list; "How It Works" as the nav link and the section eyebrow.
- **Redundant duplicate found:** the footer's link list (Request a demo · Login · Sign up)
  repeated the header's action buttons a third time. The header is sticky, so those actions are
  always visible already. It was not part of the reference design.

**Cause.** The footer link list was added with the landing page rebuild (T091) and
duplicated the header actions.

**Fix.** Removed the footer `<nav aria-label="Footer">` block and its now-unused `Link` import.
Nothing else changed: the About text, copyright line, footer styling and layout stay as they were.

**Files changed.**
- `components/layout/site-footer.tsx`
- `docs/DEVELOPMENT_LOG.md` (this entry)

Not changed: `components/layout/site-header.tsx`, `app/(public)/page.tsx` and every other file
(checksums identical before and after).

**Verification.**
- Before/after full-page screenshots at 1280px: same page height. The pixel diff is confined to the
  removed links' area in the footer (x 848–953, y 2481–2549); the header and every other section
  are pixel-identical.
- Re-audit after the fix: "Login" now appears twice (header and the member panel, both in the
  reference) instead of three times. No other text counts changed.
- `eslint` and `tsc --noEmit` pass. `tests/e2e/landing.spec.ts` and `tests/e2e/public-pages.spec.ts`
  pass.

## 2026-10-18 — Landing page: remove the About block and the Dev preview links

**Request.** Remove two blocks from the landing page and nothing else: the "About EliteCadet"
section and the "Dev preview (local only)" links. Keep the header, every other section and the
footer copyright line unchanged.

**Fix.**
- `components/layout/site-footer.tsx`: removed the About block (icon, "About EliteCadet" heading,
  description) and its grid wrapper, so no empty space is left. Also removed the copyright row's own
  top border, which would otherwise sit directly under the footer's border as a double line, and
  the unused `Layers` import. The copyright line "© <year> EliteCadet. All rights reserved." is
  kept unchanged. The footer keeps `id="about"` because the header's About link (`/#about`) points
  at it, and the header was not to be touched. That link now scrolls to the page bottom.
- `app/(public)/page.tsx`: removed the "Dev preview (local only)" paragraph with the four
  "Preview as …" links from the How It Works section, plus the now-unused `devPreviews` list,
  `showDevPreview` flag and `isDevPreviewEnabled` import. The `/dev-preview/*` routes are
  unchanged and still work when opened directly (used by local e2e tests).

**Files changed.** `components/layout/site-footer.tsx`, `app/(public)/page.tsx`,
`docs/DEVELOPMENT_LOG.md`. `components/layout/site-header.tsx` is unchanged (same checksum).

**Verification.**
- Rendered `/` at 1280px and 390px: "About EliteCadet" and "Dev preview" no longer appear; the
  copyright line is present; no horizontal overflow. Page height at 1280px went from 2723px to
  2436px (the removed blocks), and How It Works now flows straight into the copyright footer.
- Before/after full-page screenshots at 1280px: pixel-identical from the header down to the How It
  Works step cards. The only other difference is the floating Next.js dev indicator, which is not
  part of the page.
- `eslint` on both files and `tsc --noEmit` pass. `tests/e2e/landing.spec.ts` and
  `tests/e2e/public-pages.spec.ts` pass (7). The dev-preview e2e test (signs into every role via
  `/dev-preview/*`) passes.

## 2026-10-18 — Pre-commit review of `feat/elitecadet-platform-progress`

**Scope.** Everything uncommitted on the branch: 34 modified files (one is the
`middleware.ts → proxy.ts` rename) and 42 untracked files. Covers the T090 auth/RBAC/migration
catch-up work, the T091 landing page with demo requests, and the two landing cleanups above.

**Secrets and config.**
- `.env` and `.env.local` are ignored by `.gitignore` (`.env*`), are not tracked, and are not
  staged. `.gitignore` now re-includes only `.env.example`.
- `.env.example` has empty values for every key except `DEV_PREVIEW_ENABLED=false`, which is a
  safe default, not a secret.
- Pattern scan of the full diff and all new text files found no JWTs, Supabase keys or project
  URLs, `sk-`/AWS/GitHub tokens, or private keys. `supabase/config.toml` only uses `env(...)`
  references. Passwords in `tests/e2e/*-local.spec.ts` are fixtures for throwaway accounts on the
  local stack.
- The dev-preview password that was hard-coded in `lib/auth/dev-preview.ts` is removed by this
  change, but it remains in git history (HEAD). Any account that used it must be rotated or
  deleted; that is already listed in `status.md`.

**Migrations (read-only review, nothing executed).**
- `0015_auth_trusted_role_sync.sql`: AFTER UPDATE trigger on `auth.users`. It only acts on
  server-controlled transitions (`app_metadata.role` change, or `invited_at` null → set), and
  EXECUTE is revoked from public/anon/authenticated. No drops.
- `0016_demo_requests.sql`: additive, one table. RLS allows insert for anyone, select for super
  admins only; column-level insert grant; CHECK constraints mirror the app validation. Known gap:
  no rate limiting, so anonymous spam is possible (tracked as T092).
- `0007_batch_membership.sql` (edited, already in history): new section 0 renames a legacy
  `academy_students` TABLE to `academy_students_legacy` and keeps its data; it does nothing on
  databases without that table. Anyone who already applied 0007 will not re-run it, which is
  harmless.
- `supabase/catchup/production_catchup_0005_0015.sql`: regenerated to a temp file and
  byte-compared, and it matches the migrations exactly. It runs in one transaction with
  prechecks. Its only destructive step is 0007's existing `drop column batches.mentor_id`, done
  after copying the values into `batch_mentors`.

**Landing page.** Header (`components/layout/site-header.tsx`) is the approved version, unchanged
by the cleanups. The About block and Dev preview links are removed as requested; the copyright
line remains.

**Generated or unrelated files.** `test-results/` and `.next/` are ignored. No unrelated files
changed: every modified file belongs to T090 or T091. `elitecadet-landing-reference.png`
(1.7 MB design reference) is untracked; including it is a team decision.

**Verification (2026-10-18, local).**
- `npm run lint` passes. `npm run typecheck` passes.
- `vitest run`: 56 files, 470 tests passed.
- `npm run build` passes, with no warnings or errors in the output.
- Playwright against `npm run dev:local` (local Supabase, `E2E_MAILPIT_URL` and
  `E2E_DEV_PREVIEW` set): 24/24 passed, covering public pages, route guards, signup, login,
  password reset, the academy-admin flow, landing links, demo request submission and every role's
  pages.
- Not verified: anything against the production Supabase project (no migrations run there).
