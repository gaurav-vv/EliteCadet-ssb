-- SSB Academy — Phase 3 (T082): batch membership (students + mentors).
-- Run once in the Supabase SQL Editor, AFTER 0004–0006.
--
-- Design notes
--  * batch_students: a student is in at most ONE batch (unique student_id).
--  * batch_mentors: any number of mentors per batch. Replaces the single
--    batches.mentor_id column (existing assignments are copied, then the
--    column is dropped), so membership has exactly one source of truth.
--  * A trigger enforces that the person has the right role and belongs to the
--    batch's academy — RLS alone can't express that cross-row rule.
--  * Mentors read only their own batches, those batches' students and their
--    co-mentors (AGENTS.md §10: never an unrelated batch or academy).
--  * Academy admins add/remove academy students through SECURITY DEFINER
--    functions, because profiles.academy_id is otherwise super-admin-only
--    (0005). The functions only ever touch the caller's own academy.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table public.batch_students (
  batch_id uuid not null references public.batches(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (batch_id, student_id),
  constraint batch_students_one_batch unique (student_id)
);

create table public.batch_mentors (
  batch_id uuid not null references public.batches(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (batch_id, mentor_id)
);

create index batch_mentors_mentor_idx on public.batch_mentors (mentor_id);

alter table public.batch_students enable row level security;
alter table public.batch_mentors enable row level security;

-- Copy existing single-mentor assignments, then retire the column (and the
-- 0003 policies that reference it).
insert into public.batch_mentors (batch_id, mentor_id)
select id, mentor_id from public.batches where mentor_id is not null
on conflict do nothing;

drop policy "batches_insert_admin" on public.batches;
drop policy "batches_update_admin" on public.batches;
drop index if exists public.batches_mentor_idx;
alter table public.batches drop column mentor_id;

create policy "batches_insert_admin" on public.batches
  for insert with check (academy_id = public.current_admin_academy_id());

create policy "batches_update_admin" on public.batches
  for update
  using (academy_id = public.current_admin_academy_id())
  with check (academy_id = public.current_admin_academy_id());

-- ---------------------------------------------------------------------------
-- 2. Integrity: right role, same academy
-- ---------------------------------------------------------------------------

create function public.check_batch_member()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  batch_academy uuid;
  member_id uuid;
  member_role public.user_role;
  member_academy uuid;
  wanted public.user_role;
begin
  select academy_id into batch_academy from public.batches where id = new.batch_id;
  if tg_table_name = 'batch_students' then
    member_id := new.student_id; wanted := 'student';
  else
    member_id := new.mentor_id; wanted := 'mentor';
  end if;
  select role, academy_id into member_role, member_academy from public.profiles where id = member_id;

  if member_role is distinct from wanted then
    raise exception 'only a % can be added here', wanted using errcode = '23514';
  end if;
  if member_academy is null or member_academy is distinct from batch_academy then
    raise exception 'that person is not in this batch''s academy' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger batch_students_check before insert or update on public.batch_students
  for each row execute function public.check_batch_member();
create trigger batch_mentors_check before insert or update on public.batch_mentors
  for each row execute function public.check_batch_member();

-- ---------------------------------------------------------------------------
-- 3. Scope helpers (SECURITY DEFINER: no RLS recursion)
-- ---------------------------------------------------------------------------

create function public.is_batch_mentor(p_batch uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.batch_mentors where batch_id = p_batch and mentor_id = auth.uid())
$$;

-- True when the caller mentors a batch that p_person is a student or mentor of.
create function public.is_batch_peer(p_person uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.batch_mentors mine
    where mine.mentor_id = auth.uid()
      and (
        exists (select 1 from public.batch_students s where s.batch_id = mine.batch_id and s.student_id = p_person)
        or exists (select 1 from public.batch_mentors m where m.batch_id = mine.batch_id and m.mentor_id = p_person)
      )
  )
$$;

create function public.batch_academy(p_batch uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select academy_id from public.batches where id = p_batch
$$;

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------

-- Academy admins manage membership of their own academy's batches.
create policy "batch_students_admin" on public.batch_students
  for all
  using (public.batch_academy(batch_id) = public.current_admin_academy_id())
  with check (public.batch_academy(batch_id) = public.current_admin_academy_id());

create policy "batch_mentors_admin" on public.batch_mentors
  for all
  using (public.batch_academy(batch_id) = public.current_admin_academy_id())
  with check (public.batch_academy(batch_id) = public.current_admin_academy_id());

-- Mentors read their own batches' rosters; students read their own row.
create policy "batch_students_mentor_read" on public.batch_students
  for select using (public.is_batch_mentor(batch_id));
create policy "batch_students_own_read" on public.batch_students
  for select using (student_id = auth.uid());
create policy "batch_mentors_mentor_read" on public.batch_mentors
  for select using (public.is_batch_mentor(batch_id));

-- Super admins read everything (platform oversight).
create policy "batch_students_super_read" on public.batch_students for select using (public.is_super_admin());
create policy "batch_mentors_super_read" on public.batch_mentors for select using (public.is_super_admin());
create policy "batches_select_super_admin" on public.batches for select using (public.is_super_admin());

-- Mentors see the batches they're assigned to.
create policy "batches_select_mentor" on public.batches
  for select using (public.is_batch_mentor(id));

-- Mentors see the profiles of their batches' students and co-mentors only.
create policy "profiles_select_batch_peer" on public.profiles
  for select using (public.is_batch_peer(id));

-- ---------------------------------------------------------------------------
-- 5. Read views (security invoker: each caller's RLS still applies)
-- ---------------------------------------------------------------------------

create view public.batch_overview
with (security_invoker = true) as
  select
    b.id,
    b.academy_id,
    b.name,
    b.status,
    b.start_date,
    b.created_at,
    coalesce(array_agg(bm.mentor_id order by p.full_name) filter (where bm.mentor_id is not null), '{}') as mentor_ids,
    coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.full_name) order by p.full_name) filter (where p.id is not null), '[]'::jsonb) as mentors,
    count(bm.mentor_id) as mentor_count,
    (select count(*) from public.batch_students s where s.batch_id = b.id) as student_count
  from public.batches b
  left join public.batch_mentors bm on bm.batch_id = b.id
  left join public.profiles p on p.id = bm.mentor_id
  group by b.id;

create view public.academy_students
with (security_invoker = true) as
  select
    p.id,
    p.full_name,
    p.email,
    p.status,
    p.academy_id,
    p.last_login_at,
    p.created_at,
    bs.batch_id,
    b.name as batch_name
  from public.profiles p
  left join public.batch_students bs on bs.student_id = p.id
  left join public.batches b on b.id = bs.batch_id
  where p.role = 'student';

grant select on public.batch_overview to authenticated;
grant select on public.academy_students to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Academy admins add / remove students of THEIR academy
-- ---------------------------------------------------------------------------

-- The 0005 guard rejects privileged profile changes from anyone but a super
-- admin. The functions below are the only other sanctioned path: they set a
-- transaction-local flag first. set_config lives in pg_catalog, which the API
-- doesn't expose, so a client can't set this flag itself.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  privileged_changed boolean :=
    new.role is distinct from old.role
    or new.academy_id is distinct from old.academy_id
    or new.status is distinct from old.status
    or new.email is distinct from old.email
    or new.last_login_at is distinct from old.last_login_at
    or new.id is distinct from old.id;
  trusted boolean := coalesce(current_setting('app.trusted_change', true), '') = 'on';
begin
  if auth.uid() is not null and privileged_changed and not trusted then
    if not public.is_super_admin() then
      raise exception 'only a super admin can change role, academy, status or email'
        using errcode = '42501';
    end if;
    if old.id = auth.uid() and (new.role is distinct from old.role or new.status is distinct from old.status) then
      raise exception 'you cannot change your own role or status'
        using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  if new.role is distinct from old.role then
    perform public.ensure_role_profile(new.id, new.role);
  end if;
  return new;
end;
$$;

-- Returns the student's id and name. Only takes accounts with no academy (or
-- already in the caller's): never pulls a student out of another academy.
create function public.academy_add_student(p_email text)
returns table (id uuid, full_name text)
language plpgsql
security definer set search_path = public
as $$
declare
  my_academy uuid := public.current_admin_academy_id();
  target public.profiles%rowtype;
begin
  if my_academy is null then
    raise exception 'only an academy admin can add students' using errcode = '42501';
  end if;
  select * into target from public.profiles where lower(email) = lower(btrim(p_email));
  if not found then
    raise exception 'no account uses that email' using errcode = 'P0002';
  end if;
  if target.role <> 'student' then
    raise exception 'that account is not a student' using errcode = '23514';
  end if;
  if target.academy_id is not null and target.academy_id <> my_academy then
    raise exception 'that student belongs to another academy' using errcode = '23505';
  end if;
  perform set_config('app.trusted_change', 'on', true);
  update public.profiles set academy_id = my_academy where profiles.id = target.id;
  insert into public.audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'academy.student_added', 'user', target.id, jsonb_build_object('summary', 'Added to academy by an academy admin'));
  return query select target.id, target.full_name;
end;
$$;

create function public.academy_remove_student(p_student uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  my_academy uuid := public.current_admin_academy_id();
begin
  if my_academy is null then
    raise exception 'only an academy admin can remove students' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_student and role = 'student' and academy_id = my_academy) then
    raise exception 'not a student of your academy' using errcode = 'P0002';
  end if;
  delete from public.batch_students where student_id = p_student;
  perform set_config('app.trusted_change', 'on', true);
  update public.profiles set academy_id = null where id = p_student;
  insert into public.audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'academy.student_removed', 'user', p_student, jsonb_build_object('summary', 'Removed from academy by an academy admin'));
end;
$$;

revoke execute on function public.academy_add_student(text) from public, anon;
revoke execute on function public.academy_remove_student(uuid) from public, anon;
grant execute on function public.academy_add_student(text) to authenticated;
grant execute on function public.academy_remove_student(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Invited students join their academy (extends the 0005 signup trigger)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  app_role text := new.raw_app_meta_data->>'role';        -- service-role only
  meta_role text := new.raw_user_meta_data->>'role';      -- browser-controlled
  signup_role public.user_role;
  new_academy_id uuid;
  trusted_academy text;
begin
  if app_role in ('student', 'mentor', 'academy_admin', 'super_admin') then
    signup_role := app_role::public.user_role;
    trusted_academy := new.raw_app_meta_data->>'academy_id';
  elsif meta_role in ('mentor', 'student') and new.invited_at is not null then
    -- inviteUserByEmail (server-side, service role) is the only way to get here.
    signup_role := meta_role::public.user_role;
    trusted_academy := new.raw_user_meta_data->>'academy_id';
  elsif meta_role = 'academy_admin' then
    signup_role := 'academy_admin';
  else
    signup_role := 'student';
  end if;

  if signup_role = 'academy_admin' and trusted_academy is null then
    insert into public.academies (name, owner_id)
    values (coalesce(nullif(btrim(new.raw_user_meta_data->>'academy_name'), ''), 'My Academy'), new.id)
    returning id into new_academy_id;
  elsif trusted_academy is not null then
    new_academy_id := trusted_academy::uuid;
  end if;

  insert into public.profiles (id, role, full_name, academy_id, email, last_login_at)
  values (new.id, signup_role, coalesce(new.raw_user_meta_data->>'full_name', ''), new_academy_id, new.email, new.last_sign_in_at);

  perform public.ensure_role_profile(new.id, signup_role);
  return new;
end;
$$;
