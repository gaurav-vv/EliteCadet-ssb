-- SSB Academy — Academy Students (Phase 0).
-- Run once in Supabase's SQL Editor, after 0001, 0002 and 0003.
--
-- ADDITIVE. Creates one new enum and one new table and changes no existing
-- row. The only touch to an existing table is a UNIQUE INDEX on
-- batches (academy_id, id): batches.id is already the primary key, so this index
-- can never conflict with existing data; it exists only so students can use a
-- composite foreign key that makes a cross-academy batch assignment impossible.
--
-- Academy students are NOT platform students: no login, no email. A student is
-- identified by UUID, belongs to exactly one academy, may belong to one batch of
-- that same academy, and duplicate names are allowed.
--
-- Wrapped in one transaction: any error rolls everything back.

begin;

-- ---------------------------------------------------------------- prechecks
do $$
begin
  if to_regclass('public.academies') is null or to_regclass('public.batches') is null then
    raise exception '0004 needs 0001 and 0003 applied first (academies / batches missing).';
  end if;
  if to_regprocedure('public.current_admin_academy_id()') is null then
    raise exception '0004 needs public.current_admin_academy_id() from 0003_batches.sql.';
  end if;
  if to_regclass('public.academy_students') is not null then
    raise exception 'public.academy_students already exists; refusing to continue so nothing is overwritten.';
  end if;
end;
$$;

-- --------------------------------------------------------------------- types
create type public.academy_student_status as enum ('active', 'inactive');

-- Target of the composite foreign key below. Safe on existing data (id is already unique).
create unique index if not exists batches_academy_id_id_key on public.batches (academy_id, id);

-- --------------------------------------------------------------------- table
create table public.academy_students (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  -- NULL = student without a batch.
  batch_id uuid,
  -- Duplicate names are allowed (two real people can share a name).
  full_name text not null,
  status public.academy_student_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academy_students_full_name_length
    check (char_length(btrim(full_name)) between 2 and 80),
  -- SAME-ACADEMY PROTECTION. The pair (academy_id, batch_id) must exist in
  -- batches as (academy_id, id): a student of Academy A can never point at a batch
  -- of Academy B, no matter what the application sends. A NULL batch_id is not
  -- checked (MATCH SIMPLE). No ON DELETE action: batches are archived, never deleted.
  constraint academy_students_batch_fkey
    foreign key (academy_id, batch_id) references public.batches (academy_id, id)
);

create index academy_students_academy_batch_idx on public.academy_students (academy_id, batch_id);
create index academy_students_academy_status_idx on public.academy_students (academy_id, status);
create index academy_students_academy_created_idx on public.academy_students (academy_id, created_at desc, id);
create index academy_students_academy_name_idx on public.academy_students (academy_id, full_name, id);

-- --------------------------------------------------------------- updated_at
create function public.academy_students_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger academy_students_touch_updated_at
  before update on public.academy_students
  for each row execute function public.academy_students_touch_updated_at();

-- ------------------------------------------------------- privileges + RLS
alter table public.academy_students enable row level security;

-- Column-level privileges decide WHICH columns the API may write; RLS decides
-- WHICH rows. academy_id can be set only on insert and never changed. Nobody
-- gets DELETE: students are marked inactive, not deleted.
revoke all on table public.academy_students from anon, authenticated;
grant select on table public.academy_students to authenticated;
grant insert (academy_id, batch_id, full_name, status) on public.academy_students to authenticated;
grant update (full_name, batch_id, status) on public.academy_students to authenticated;

-- Only the admin of an academy can see or change that academy's students.
-- (current_admin_academy_id() comes from 0003; it returns the academy of the
-- signed-in user if, and only if, they are an academy admin.)
create policy "academy_students_select_admin" on public.academy_students
  for select to authenticated
  using (academy_id = public.current_admin_academy_id());

create policy "academy_students_insert_admin" on public.academy_students
  for insert to authenticated
  with check (academy_id = public.current_admin_academy_id());

create policy "academy_students_update_admin" on public.academy_students
  for update to authenticated
  using (academy_id = public.current_admin_academy_id())
  with check (academy_id = public.current_admin_academy_id());

-- Make the new table visible to the API immediately.
notify pgrst, 'reload schema';

commit;

-- ------------------------------------------------------- VERIFY (read-only)
-- Run these after the migration:
--
--   select column_name, data_type, is_nullable, column_default
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'academy_students' order by ordinal_position;
--
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.academy_students'::regclass order by conname;
--
--   select indexname from pg_indexes where tablename = 'academy_students';
--   select relrowsecurity from pg_class where oid = 'public.academy_students'::regclass;
--   select policyname, cmd, qual, with_check from pg_policies where tablename = 'academy_students';
--   select grantee, privilege_type from information_schema.role_table_grants
--     where table_name = 'academy_students' and grantee in ('anon', 'authenticated');

-- ------------------------------------------------------------------ ROLLBACK
-- Fully reversible. Warning: deletes every student created after this migration.
--
--   begin;
--   drop table if exists public.academy_students;        -- also drops its policies and trigger
--   drop function if exists public.academy_students_touch_updated_at();
--   drop type if exists public.academy_student_status;
--   -- batches_academy_id_id_key is harmless; drop it only if nothing else needs it:
--   -- drop index if exists public.batches_academy_id_id_key;
--   commit;
