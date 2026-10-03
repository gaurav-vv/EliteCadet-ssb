-- SSB Academy — batches (Academy Admin "Batches" MVP).
-- Run once in Supabase's SQL Editor, after 0001 and 0002.
--
-- Design notes
--  * A batch belongs to exactly one academy and has at most one mentor
--    (a mentor's profile). The relationship lives in ONE place:
--    batches.mentor_id -> profiles.id. Nothing is duplicated onto profiles.
--  * There is deliberately NO delete policy. Batches are archived
--    (status = 'archived'), never deleted: students will reference batches,
--    and deleting would orphan them. Add a delete path only together with a
--    students.batch_id relationship and an explicit rule for it.
--  * All access is through the signed-in admin's own session (anon key + RLS).
--    The service-role key is never involved.

create type public.batch_status as enum ('active', 'archived');

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  name text not null,
  mentor_id uuid references public.profiles(id) on delete set null,
  status public.batch_status not null default 'active',
  start_date date,
  created_at timestamptz not null default now(),
  constraint batches_name_length check (char_length(btrim(name)) between 2 and 60)
);

-- One batch name per academy, ignoring case and surrounding spaces.
create unique index batches_academy_name_unique
  on public.batches (academy_id, lower(btrim(name)));

create index batches_academy_status_idx on public.batches (academy_id, status);
create index batches_mentor_idx on public.batches (mentor_id);

alter table public.batches enable row level security;

-- Helper functions are SECURITY DEFINER so policies on `profiles` and
-- `batches` can look up the caller's academy / a mentor's membership without
-- recursing into `profiles`' own RLS.

-- The academy the signed-in user administers (null if they are not an admin).
create function public.current_admin_academy_id()
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select academy_id from public.profiles
  where id = auth.uid() and role = 'academy_admin'
$$;

-- True when p_mentor is a mentor profile in p_academy.
create function public.mentor_in_academy(p_mentor uuid, p_academy uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_mentor and role = 'mentor' and academy_id = p_academy
  )
$$;

-- An academy admin can read the profiles in their own academy (needed to show
-- a batch's mentor name and to list mentors to assign). Permissive policies
-- are OR-ed with the existing "own profile" policy.
create policy "profiles_select_academy_admin" on public.profiles
  for select using (
    academy_id is not null
    and academy_id = public.current_admin_academy_id()
  );

create policy "batches_select_admin" on public.batches
  for select using (academy_id = public.current_admin_academy_id());

create policy "batches_insert_admin" on public.batches
  for insert with check (
    academy_id = public.current_admin_academy_id()
    and (mentor_id is null or public.mentor_in_academy(mentor_id, academy_id))
  );

create policy "batches_update_admin" on public.batches
  for update
  using (academy_id = public.current_admin_academy_id())
  with check (
    academy_id = public.current_admin_academy_id()
    and (mentor_id is null or public.mentor_in_academy(mentor_id, academy_id))
  );
