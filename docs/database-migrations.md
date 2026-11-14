# Database migrations

Files live in `supabase/migrations/NNNN_name.sql`. The Supabase CLI uses the number before the first
`_` as the **version**, and `supabase_migrations.schema_migrations` keeps one row per version
(primary key). **Every version must be unique.**

## Current sequence (2026-10-25)

`0001` … `0021`, then:

| Version | File | Notes |
|---|---|---|
| 0022 | `0022_live_meetings.sql` | live meeting rooms |
| 0023 | `0023_live_meetings_academy_admin.sql` | |
| 0024 | `0024_independent_mentors.sql` | |
| 0025 | `0025_meeting_chat_attendance.sql` | |
| 0026 | `0026_fix_sessions_read_returning.sql` | was **also** `0022` until 2026-10-25; safe to re-run |
| 0027 | `0027_mentor_onboarding.sql` | was briefly `0026` (never committed); safe to re-run |

The sessions fix and live meetings were merged on the same day, both as `0022`. A fresh
`supabase start` failed on `schema_migrations_pkey`. The fix doesn't depend on 0022–0025 and none of
them touch `sessions_read`, so running it as `0026` is equivalent. Both moved files are written to be
re-runnable (`create or replace`, `if not exists`, drop-and-recreate with identical definitions inside
the migration's transaction), so a database that already has them can run them again without change.

**Adding a migration:** take the next free number. Before committing, run
`ls supabase/migrations | cut -c1-4 | sort | uniq -d` (it must print nothing). CI
(`supabase/tests/run-workflow-check.sh`) applies every file in order to a fresh database.

## Another developer's local database

Check what your local history recorded for 0022:

```sql
select version, name from supabase_migrations.schema_migrations where version in ('0022', '0026', '0027');
```

| You see | Meaning | Do |
|---|---|---|
| `0022 live_meetings` (and maybe 0026/0027) | matches the repo | `npx supabase migration up` (applies only what's missing; 0026/0027 are re-runnable) |
| `0022 fix_sessions_read_returning` | your stack applied the fix as 0022 and then **failed on live meetings**, so the live-meeting tables are probably missing, but the CLI will now think 0022 (live meetings) is applied | Easiest, if your local data is disposable: `npx supabase db reset` (**deletes local data**). To keep data, ask for help. The fix is to run `0022_live_meetings.sql` once by hand, then `npx supabase migration up`. |
| `0026 mentor_onboarding` | you ran the short-lived 0026 mentor file | `npx supabase migration up` (0027 is re-runnable); don't touch history by hand |

Never edit `supabase_migrations.schema_migrations` with SQL. Use `supabase migration repair` (local
first, and only when you know what each version contains).

## Hosted project: read-only audit (run before applying anything)

The dashboard's "Last migration: No migrations" only means the CLI history table is empty. This
project was set up by pasting SQL into the SQL Editor (`supabase/catchup/`), which **doesn't**
write history, so the schema may be partly or fully there. Run these in **SQL Editor** (they only
read):

**1. Is there a CLI history table?**

```sql
select to_regclass('supabase_migrations.schema_migrations') is not null as history_table_exists;
```

**2. Only if that returned `true`:** what it records.

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```

**3. Which migrations' objects exist** (one distinctive object per migration, plus 0022/0026/0027 in
detail):

```sql
with fn(name) as (
  select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
), pol(tbl, name, qual) as (
  select tablename, policyname, qual from pg_policies where schemaname = 'public'
), col(tbl, name) as (
  select table_name, column_name from information_schema.columns where table_schema = 'public'
), typ(name) as (
  select t.typname from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public'
)
select v.migration, v.object, v.present from (values
  ('0001', 'table profiles',                       to_regclass('public.profiles') is not null),
  ('0001', 'function handle_new_user',             exists (select 1 from fn where name = 'handle_new_user')),
  ('0002', 'policy academies_update_owner',        exists (select 1 from pol where name = 'academies_update_owner')),
  ('0003', 'table batches',                        to_regclass('public.batches') is not null),
  ('0003', 'function current_admin_academy_id',    exists (select 1 from fn where name = 'current_admin_academy_id')),
  ('0004', 'role value super_admin',               exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'user_role' and e.enumlabel = 'super_admin')),
  ('0005', 'table mentor_profiles',                to_regclass('public.mentor_profiles') is not null),
  ('0005', 'table audit_log',                      to_regclass('public.audit_log') is not null),
  ('0005', 'function is_super_admin',              exists (select 1 from fn where name = 'is_super_admin')),
  ('0006', 'type academy_status',                  exists (select 1 from typ where name = 'academy_status')),
  ('0007', 'table batch_students',                 to_regclass('public.batch_students') is not null),
  ('0008', 'type content_category',                exists (select 1 from typ where name = 'content_category')),
  ('0009', 'function pin_mentor_content',          exists (select 1 from fn where name = 'pin_mentor_content')),
  ('0010', 'table sessions',                       to_regclass('public.sessions') is not null),
  ('0010', 'function can_see_session',             exists (select 1 from fn where name = 'can_see_session')),
  ('0011', 'type assessment_status',               exists (select 1 from typ where name = 'assessment_status')),
  ('0012', 'type attendance_status',               exists (select 1 from typ where name = 'attendance_status')),
  ('0013', 'type notification_kind',               exists (select 1 from typ where name = 'notification_kind')),
  ('0014', 'type practice_item_kind',              exists (select 1 from typ where name = 'practice_item_kind')),
  ('0015', 'function apply_trusted_role',          exists (select 1 from fn where name = 'apply_trusted_role')),
  ('0016', 'table demo_requests',                  to_regclass('public.demo_requests') is not null),
  ('0017', 'type ai_job_status',                   exists (select 1 from typ where name = 'ai_job_status')),
  ('0018', 'function set_practice_bank_timing',    exists (select 1 from fn where name = 'set_practice_bank_timing')),
  ('0019', 'type interview_mode',                  exists (select 1 from typ where name = 'interview_mode')),
  ('0020', 'function readiness_signals',           exists (select 1 from fn where name = 'readiness_signals')),
  ('0021', 'function save_student_preferences',    exists (select 1 from fn where name = 'save_student_preferences')),
  ('0022', 'column sessions.meeting_kind',         exists (select 1 from col where tbl = 'sessions' and name = 'meeting_kind')),
  ('0022', 'table live_meeting_attendance',        to_regclass('public.live_meeting_attendance') is not null),
  ('0022', 'function start_live_meeting',          exists (select 1 from fn where name = 'start_live_meeting')),
  ('0023', 'function current_active_admin_academy_id', exists (select 1 from fn where name = 'current_active_admin_academy_id')),
  ('0024', 'function drop_stale_batch_membership', exists (select 1 from fn where name = 'drop_stale_batch_membership')),
  ('0025', 'table live_meeting_messages',          to_regclass('public.live_meeting_messages') is not null),
  ('0025', 'function can_join_live_meeting',       exists (select 1 from fn where name = 'can_join_live_meeting')),
  ('0026', 'function can_see_session_row',         exists (select 1 from fn where name = 'can_see_session_row')),
  ('0026', 'policy sessions_read uses can_see_session_row', exists (select 1 from pol where tbl = 'sessions' and name = 'sessions_read' and qual like '%can_see_session_row%')),
  ('0027', 'column mentor_profiles.qualifications', exists (select 1 from col where tbl = 'mentor_profiles' and name = 'qualifications')),
  ('0027', 'policy mentor_profiles_academy_admin_read', exists (select 1 from pol where tbl = 'mentor_profiles' and name = 'mentor_profiles_academy_admin_read'))
) as v(migration, object, present)
order by v.migration, v.object;
```

### How to read it

- **Everything `true` up to some version N, `false` after it:** the database is at N. Apply only the
  files after N, one at a time, in order, in the SQL Editor (or via the CLI after step "history"
  below).
- **Gaps (a `false` before a `true`):** a migration was skipped or partly applied. Stop and look at
  that file before applying anything.
- **History table empty or missing, objects present:** normal for this project (SQL Editor setup).
  **Do not `supabase db push`**: with empty history the CLI treats every file from 0001 as new and
  re-runs them against a live schema. Most of 0001–0025 are *not* re-runnable (`create table`,
  `create policy`), so it would fail partway or, worse, recreate things. Instead, once the objects
  match the files, record what's applied without running it: `supabase link`, then
  `supabase migration repair --status applied 0001 … 0027` (only the versions you verified), then
  `supabase migration list --linked`. From then on `db push` only applies new files.
- **History partial (e.g. 0001–0004 only):** same rule. Verify objects, repair the history for what's
  really there, then push or apply only the rest.
- **0026:** if `can_see_session_row` exists and the policy uses it, the fix is applied, whatever the
  history says.
- **0027:** both rows `true` means mentor onboarding is applied. Until it is, manual Add Mentor fails
  safely (rolled back) and the mentor list loads without phone/qualification details.
