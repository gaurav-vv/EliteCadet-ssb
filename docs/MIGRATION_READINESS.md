# Migration readiness: hosted project `ibdlhzdrchcggmtnwbyj`

Checked 2026-10-30. Nothing was run against the hosted database except read-only REST and Auth reads.

## Correction to earlier notes

Earlier notes in this work said migrations `0026` and `0028`-`0033` were "not yet applied" on the hosted
database. **That was an assumption, not a finding.** What is actually known is below.

## In Git

- `origin/main` already contains migrations `0001`-`0033`, byte-identical to this branch
  (`git diff origin/main HEAD -- supabase/` is empty). There are no duplicate or missing version numbers
  (`tests/unit/lib/migrations-layout.test.ts` enforces it), and the duplicate `0022` was renumbered to `0026`.
- This branch adds **no new migration**. Its application code (`getClaims`, parallel reads, named columns,
  lazy charts) works with the schema that is already on `main`.

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

`supabase/catchup/production_catchup_0005_0033.sql` is **only** for a database that is still at `0004`.
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

## Rollback

- Indexes: `drop index if exists public.<name>;` (no data effect; queries just get slower).
- `0027` column: `alter table public.mentor_profiles drop column qualifications;` only if nothing has
  written to it; the policy can be dropped by name.
- `0026`: restore the previous `sessions_read` policy text from the older file in Git history
  (`0022_fix_sessions_read_returning` at commit `866b8c7`, or `0010_sessions.sql` for the original).
- `0028`: inserted profile rows can be deleted by id; keep the list of inserted ids (the script is a no-op today).
- Nothing in this branch's application code needs a rollback of the database: it runs on either schema.
