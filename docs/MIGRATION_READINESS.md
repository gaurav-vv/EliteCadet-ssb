# Migration readiness: hosted project `ibdlhzdrchcggmtnwbyj`

Checked 2026-10-30. Nothing was run against the hosted database except read-only REST and Auth reads.

## Correction to earlier notes

Earlier notes in this work said migrations `0026` and `0028`-`0033` were "not yet applied" on the hosted
database. **That was an assumption, not a finding.** What is actually known is below.

## In Git

- `origin/main` already contains migrations `0001`-`0033`, byte-identical to this branch
  (`git diff origin/main HEAD -- supabase/` is empty). There are no duplicate or missing version numbers
  (`tests/unit/lib/migrations-layout.test.ts` enforces it), and the duplicate `0022` was renumbered to `0026`.
- The performance work described above added **no new migration**. (Migration `0034`, added later for
  independent-mentor student assignments, is covered in its own section below.)

## On the hosted database (probed through its REST API, read-only)

| Migration | Evidence | Verdict |
|---|---|---|
| `0005`-`0025` | profiles status/email, academies status, assessments, practice columns, `sessions.meeting_kind`, live-meeting tables all present | applied |
| `0026` sessions read fix | function `can_see_session_row` exists. It is created only by the fix (whether under its old name `0022_fix_sessions_read_returning` or as `0026`) | applied, in one form or the other |
| `0027_mentor_onboarding` | `mentor_profiles.qualifications` exists | applied |
| `0028_backfill_missing_profiles` | 42 sign-in accounts, 42 profiles, **0 without a profile** | applied or moot: it would change nothing |
| `0029`-`0033` (indexes) | indexes are not visible through the REST API | **unknown** |

The migration **history table** (`supabase_migrations.schema_migrations`) is not readable through the REST
API either, so whether the hosted project records `0022` twice, `0026`, or nothing at all (the repo's guide
tells people to paste SQL into the SQL Editor, which records nothing) is **unknown**.

## Safety review of each pending-or-unknown migration

| File | What it does | Data risk | Idempotent |
|---|---|---|---|
| `0026` | `create or replace function`, then `drop policy if exists "sessions_read"` and `create policy` | none to rows. **A script that is not in one transaction leaves `sessions` with no read policy between the two statements** (RLS then denies reads) | yes, but wrap in `begin; ... commit;` |
| `0027_mentor_onboarding` | adds a nullable column, replaces one policy | none | yes (header says so) |
| `0028` | inserts a `profiles` row (and an academy for an academy admin) for any account without one | adds rows only; 0 accounts qualify today | yes |
| `0029`-`0033` | `create index if not exists` on 10 foreign-key columns | none. A plain `create index` blocks writes to that table while it builds; the tables hold a handful to a few hundred rows, so the lock is milliseconds. Do not use `concurrently` in the SQL Editor transaction | yes |

`supabase/catchup/production_catchup_0005_0036.sql` is **only** for a database that is still at `0004`.
It refuses to run when `0005` is present. **Do not run it on this project.**

## Verify first (read-only, paste into the SQL Editor; nothing is changed)

```sql
-- 0026: should show can_see_session_row( in the policy text
select policyname, qual from pg_policies where schemaname='public' and tablename='sessions' and policyname='sessions_read';
-- 0027
select column_name from information_schema.columns where table_schema='public' and table_name='mentor_profiles' and column_name='qualifications';
select policyname from pg_policies where schemaname='public' and tablename='mentor_profiles' and policyname='mentor_profiles_academy_admin_read';
-- 0028: accounts still without a profile (expect 0)
select count(*) from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id);
-- 0029-0033: which indexes already exist (expect up to 10 rows)
select indexname from pg_indexes where schemaname='public' and indexname in
 ('assessments_academy_idx','content_requests_academy_idx','practice_answers_item_idx','practice_attempts_bank_idx',
  'interview_sessions_topic_idx','feedback_mentor_idx','contents_owner_id_idx','sessions_created_by_idx',
  'live_meeting_removals_user_idx','live_meeting_messages_sender_idx');
-- migration history, if the project records it
select version from supabase_migrations.schema_migrations order by version;
```

## Deployment checklist (needs the owner; not done)

1. Run the read-only queries above. Apply **only** what they show is missing.
2. Before applying anything: confirm the project's automatic backup or point-in-time recovery is on
   (Dashboard, Database, Backups), or take a manual backup. The migrations add no destructive change, so
   this is a safeguard, not a requirement for restoring data.
3. If `0026` or `0027` is genuinely missing, run it inside `begin; ... commit;` in a quiet period.
4. `0029`-`0033`: run the ones whose index is missing. Order does not matter between them.
5. If the project uses the CLI history (`npx supabase migration list --linked` shows rows), repair any
   mismatch with `npx supabase migration repair` rather than re-running files; never edit an applied file.
6. Re-run the probe (`node tests/performance/scripts/` is local-only; use the queries above) and the
   staging plan's smoke run.

## Migration 0034: independent-mentor student assignments (new, NOT applied to the hosted project)

`supabase/migrations/0034_mentor_students.sql` is additive and forward-only. It was applied and tested **only
on the local Supabase stack**. The hosted project is past `0004`, so the catch-up file does **not** apply to
it: run `0034` on its own, once, after `0033` is in place.

What it adds: table `mentor_students` (a super admin assigns students to an independent mentor), view
`assigned_students`, functions `is_assigned_mentee` and `cleanup_independent_assignments`, two triggers, and
two read policies (`profiles_select_assigned_mentee`, `content_progress_assigned_mentor_read`).
**It also replaces one existing function**, `is_my_mentee` (0014), with the same body plus
`or is_assigned_mentee(...)`. Policies on practice, interview, AI-evaluation, diagnostic and student-profile
data call that function, so assigned independent mentors gain read access through them. Academy mentors never
have a `mentor_students` row (a trigger refuses it), so their access is unchanged. No row is changed or
deleted, and no existing policy is edited.

Sessions, assessments, feedback and live meetings still use `is_batch_mentor()`, which is untouched, so they
stay batch-only.

1. **Before:** confirm it is not already applied (expect `null`):
   `select to_regclass('public.mentor_students');`
2. Confirm point-in-time recovery or a backup is on (Dashboard, Database, Backups).
3. **Apply** in the SQL Editor, in one transaction, in a quiet period: `begin;` + the file's contents +
   `commit;`. The file is not idempotent (`create table`), so do not run it twice.
4. **After (read-only):** `select to_regclass('public.mentor_students'), to_regclass('public.assigned_students');`
   both non-null; `select count(*) from public.mentor_students;` returns `0`.
5. **Deploy the application only after the migration is in place.** The new super-admin screen and the
   independent mentor's Mentees list read the new table and view and would show an error before that.
6. **Rollback** is the commented block at the top of the migration file. Dropping the table and view does not
   touch any other data, but restore `is_my_mentee` to its `0014` body first.

If the hosted project were ever rebuilt from scratch at `0004`, `supabase/catchup/production_catchup_0005_0036.sql`
(regenerated with `bash supabase/catchup/build.sh`) includes `0034`.

## Migration 0035: academy admin notifications (new, NOT applied to the hosted project)

`supabase/migrations/0035_academy_notifications.sql` is additive and forward-only, applied and tested **only on
the local Supabase stack**. Run it on its own, once, after `0034` (the catch-up file is not for this project).

It adds one enum value (`notification_kind` gets `invite_accepted`) and two triggers that write ordinary rows to
`public.notifications` for the **active admins of the academy concerned only**: a mentor or student of the academy
signing in for the first time, and a mentor scheduling a session in the academy's batches. No existing table,
column, policy or function is changed. Existing notifications and the students' own session notice are untouched.

1. **Before:** confirm it is not applied (expect no rows):
   `select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'notification_kind' and e.enumlabel = 'invite_accepted';`
2. Apply in the SQL Editor in a quiet period. The file is not idempotent (`create function`), so do not run it twice.
3. **After (read-only):** the query above returns one row, and
   `select tgname from pg_trigger where tgname in ('profiles_notify_invite_accepted', 'sessions_notify_academy_admins');` returns two.
4. **Deploy the application after the migration.** Before it, the app simply shows no new notifications (the
   triggers do not exist yet); after it, an old app build would drop the unknown kind safely at its boundary.
5. **Rollback:** the commented block at the top of the migration file (drop the two triggers and functions).
   A Postgres enum value cannot be dropped; the unused value is harmless.

## Migration 0036: student_progress in one pass (new, NOT applied to the hosted project)

`supabase/migrations/0036_student_progress_single_pass.sql` replaces **one view definition**
(`public.student_progress`): same columns, names, types, order, `security_invoker` setting and rows for every
caller; it only changes how the numbers are computed (one grouped pass per table instead of eight correlated
subqueries per student). No table, policy, function or data changes. Applied and tested **only locally**.

Measured on the local stack with a seeded 300-student academy (`npm run perf:seed-dashboards`), as the academy admin:
the dashboard's `student_progress` request about 2.7 s before, about 0.8 s after; academy dashboard page content
3.5-3.9 s before, 1.5-2.0 s after; performance page 3.9-5.0 s before, 1.3-1.65 s after. An md5 of every row for an
academy admin, a mentor and a student was identical before and after.

1. **Before:** nothing to check; the statement is `create or replace view` and safe to run once or twice.
2. Back up or confirm point-in-time recovery, then run the file in the SQL Editor in one transaction.
3. **After (read-only):** `select count(*) from public.student_progress;` still works as a super admin, and the academy
   dashboard loads. The view definition now contains `group by`.
4. **Deploy order:** either order works; the application code does not depend on this migration (it only makes the
   same query faster). The application change that pages through results (`lib/supabase/read-all.ts`) is independent.
5. **Rollback:** the commented block at the top of the migration file restores the previous definition.

## Rollback

- Indexes: `drop index if exists public.<name>;` (no data effect; queries just get slower).
- `0027` column: `alter table public.mentor_profiles drop column qualifications;` only if nothing has
  written to it; the policy can be dropped by name.
- `0026`: restore the previous `sessions_read` policy text from the older file in Git history
  (`0022_fix_sessions_read_returning` at commit `866b8c7`, or `0010_sessions.sql` for the original).
- `0028`: inserted profile rows can be deleted by id; keep the list of inserted ids (the script is a no-op today).
- Nothing in this branch's application code needs a rollback of the database: it runs on either schema.
