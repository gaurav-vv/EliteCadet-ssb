-- SSB Academy — direct student assignments for independent mentors (2026-11-13).
-- Run once AFTER 0033. Forward-only and additive: no existing row, table, column or policy is changed.
--
-- Why
--  * Everything an ACADEMY mentor sees about a student runs through batches (batch_mentors /
--    batch_students, 0007). An INDEPENDENT mentor (role 'mentor', academy_id null, 0024) has no
--    batches, so they could see no students at all.
--  * mentor_students is the one new relationship: a super admin assigns specific students to an
--    independent mentor. Academy mentors never use it, and batch access is untouched.
--
-- Scope of what an assigned independent mentor gets
--  * Read access to the same student data a batch mentor reads through is_my_mentee() (profile,
--    practice, interviews, AI evaluations, diagnostics, readiness) plus library progress.
--  * NOT sessions, assessments, feedback or live meetings: those policies use is_batch_mentor(),
--    which this migration does not touch, so they stay batch-only.
--
-- Rollback (nothing else depends on the new objects)
--    drop view public.assigned_students;
--    drop policy "profiles_select_assigned_mentee" on public.profiles;
--    drop policy "content_progress_assigned_mentor_read" on public.content_progress;
--    drop trigger profiles_independent_assignment_cleanup on public.profiles;
--    -- restore is_my_mentee to its 0014 body (the batch join only), then:
--    drop function public.is_assigned_mentee(uuid);
--    drop function public.cleanup_independent_assignments();
--    drop table public.mentor_students;

-- ---------------------------------------------------------------------------
-- 1. Table: one row per (independent mentor, student). The primary key is what
--    prevents a duplicate assignment, even under concurrent requests.
-- ---------------------------------------------------------------------------

create table public.mentor_students (
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (mentor_id, student_id)
);

create index mentor_students_student_idx on public.mentor_students (student_id);
create index mentor_students_assigned_by_idx on public.mentor_students (assigned_by);

alter table public.mentor_students enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Integrity: an independent mentor, a student who belongs to no academy
-- ---------------------------------------------------------------------------

create function public.check_mentor_student()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  m public.profiles%rowtype;
  s public.profiles%rowtype;
begin
  select * into m from public.profiles where id = new.mentor_id;
  select * into s from public.profiles where id = new.student_id;
  if m.role is distinct from 'mentor' then
    raise exception 'only a mentor can be assigned students here' using errcode = '23514';
  end if;
  if m.academy_id is not null then
    raise exception 'academy mentors get their students through batches' using errcode = '23514';
  end if;
  if s.role is distinct from 'student' then
    raise exception 'only a student can be assigned' using errcode = '23514';
  end if;
  if s.academy_id is not null then
    raise exception 'academy students are mentored through their academy' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger mentor_students_check before insert or update on public.mentor_students
  for each row execute function public.check_mentor_student();

-- When either person joins an academy (or a mentor changes role) the assignment no longer
-- makes sense and must not keep granting access. Same idea as 0024's batch cleanup.
create function public.cleanup_independent_assignments()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.mentor_students where mentor_id = new.id or student_id = new.id;
  return new;
end;
$$;

create trigger profiles_independent_assignment_cleanup
  after update of academy_id, role on public.profiles
  for each row
  when (new.academy_id is not null and new.academy_id is distinct from old.academy_id
        or new.role is distinct from old.role)
  execute function public.cleanup_independent_assignments();

-- ---------------------------------------------------------------------------
-- 3. Access: who may read or change assignments
-- ---------------------------------------------------------------------------

create policy "mentor_students_super_all" on public.mentor_students
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "mentor_students_mentor_read" on public.mentor_students
  for select using (mentor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Scope helpers (SECURITY DEFINER: no RLS recursion)
-- ---------------------------------------------------------------------------

-- The caller is an independent mentor this student was directly assigned to.
create function public.is_assigned_mentee(p_student uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.mentor_students where student_id = p_student and mentor_id = auth.uid())
$$;

-- is_my_mentee (0014) already gates every mentor-facing read of student practice, interview, AI
-- evaluation, diagnostic and readiness data. It now also accepts a direct assignment; the batch
-- branch is exactly the old body, and an academy mentor never has a mentor_students row (the
-- trigger above refuses it), so nothing changes for them.
create or replace function public.is_my_mentee(p_student uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.batch_students bs
    join public.batch_mentors bm on bm.batch_id = bs.batch_id
    where bs.student_id = p_student and bm.mentor_id = auth.uid()
  )
  or public.is_assigned_mentee(p_student)
$$;

-- Additive read policies for tables that were gated by is_batch_peer() rather than is_my_mentee().
create policy "profiles_select_assigned_mentee" on public.profiles
  for select using (public.is_assigned_mentee(id));

create policy "content_progress_assigned_mentor_read" on public.content_progress
  for select using (public.is_assigned_mentee(student_id));

-- ---------------------------------------------------------------------------
-- 5. Read view for the mentor's Mentees list (security invoker: RLS of the caller applies)
-- ---------------------------------------------------------------------------

create view public.assigned_students
with (security_invoker = true) as
  select
    ms.mentor_id,
    p.id,
    p.full_name,
    p.email,
    p.status,
    p.academy_id,
    p.last_login_at,
    p.created_at,
    null::uuid as batch_id,
    null::text as batch_name,
    ms.created_at as assigned_at
  from public.mentor_students ms
  join public.profiles p on p.id = ms.student_id
  where p.role = 'student';

grant select on public.assigned_students to authenticated;
