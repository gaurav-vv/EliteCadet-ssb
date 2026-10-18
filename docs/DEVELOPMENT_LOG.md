# Development Log

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
