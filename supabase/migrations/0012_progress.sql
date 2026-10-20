-- SSB Academy — Phase 8 (T087): progress sources + derived views.
-- Run once in the Supabase SQL Editor, AFTER 0004–0011.
--
-- Design notes
--  * Two new SOURCE tables: session_attendance (marked by the session's
--    mentor) and content_progress (marked by the student). Everything else
--    is derived from existing rows (reviewed feedback, sessions).
--  * Derived data lives in security-invoker VIEWS, not copied tables: one
--    source of truth, and every reader's RLS still applies to the rows the
--    view reads. `student_progress` in the brief is this view.

create type public.attendance_status as enum ('present', 'absent', 'excused');

create table public.session_attendance (
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status public.attendance_status not null,
  marked_by uuid references public.profiles(id) on delete set null,
  marked_at timestamptz not null default now(),
  primary key (session_id, student_id)
);

create index session_attendance_student_idx on public.session_attendance (student_id);

create table public.content_progress (
  content_id uuid not null references public.contents(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (content_id, student_id)
);

create index content_progress_student_idx on public.content_progress (student_id);

alter table public.session_attendance enable row level security;
alter table public.content_progress enable row level security;

-- Attendance: only for a participant of the session (the whole batch, or the
-- selected students), only once it has started.
create function public.check_attendance()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  s public.sessions%rowtype;
begin
  select * into s from public.sessions where id = new.session_id;
  if s.starts_at > now() or s.status = 'cancelled' then
    raise exception 'attendance can be marked once the session has started' using errcode = '23514';
  end if;
  if not (
    (s.for_whole_batch and exists (select 1 from public.batch_students bs where bs.batch_id = s.batch_id and bs.student_id = new.student_id))
    or (not s.for_whole_batch and exists (select 1 from public.session_participants sp where sp.session_id = s.id and sp.student_id = new.student_id))
  ) then
    raise exception 'that student is not a participant of this session' using errcode = '23514';
  end if;
  new.marked_at := now();
  return new;
end;
$$;

create trigger session_attendance_check before insert or update on public.session_attendance
  for each row execute function public.check_attendance();

create policy "attendance_mentor_write" on public.session_attendance
  for all
  using (exists (select 1 from public.sessions s where s.id = session_id and s.mentor_id = auth.uid()))
  with check (marked_by = auth.uid() and exists (select 1 from public.sessions s where s.id = session_id and s.mentor_id = auth.uid()));
create policy "attendance_read" on public.session_attendance
  for select using (student_id = auth.uid() or public.can_see_session(session_id) and public.current_user_role() <> 'student');

-- Library completion: the student, for content they can read.
create policy "content_progress_student" on public.content_progress
  for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid() and public.can_read_content(content_id));
create policy "content_progress_staff_read" on public.content_progress
  for select using (
    public.is_batch_peer(student_id)
    or exists (select 1 from public.profiles p where p.id = student_id and p.academy_id = public.current_admin_academy_id())
    or public.is_super_admin()
  );

-- ---------------------------------------------------------------------------
-- Derived views (security invoker)
-- ---------------------------------------------------------------------------

-- One row per reviewed assessment attempt: the score as a percentage.
create view public.student_scores
with (security_invoker = true) as
  select
    t.student_id,
    a.id as assessment_id,
    a.title,
    a.category,
    a.batch_id,
    f.score,
    a.max_score,
    round((f.score / a.max_score) * 100, 1) as score_pct,
    f.improvement_areas,
    f.strengths,
    f.reviewed_at
  from public.feedback f
  join public.assessment_attempts t on t.id = f.attempt_id
  join public.assessments a on a.id = t.assessment_id
  where f.status = 'reviewed' and f.score is not null;

-- Per-student summary — the brief's `student_progress`.
create view public.student_progress
with (security_invoker = true) as
  select
    p.id as student_id,
    p.academy_id,
    bs.batch_id,
    (select count(*) from public.student_scores sc where sc.student_id = p.id) as reviewed_count,
    (select round(avg(sc.score_pct), 1) from public.student_scores sc where sc.student_id = p.id) as avg_score_pct,
    (select count(*) from public.session_attendance a where a.student_id = p.id and a.status = 'present') as sessions_present,
    (select count(*) from public.session_attendance a where a.student_id = p.id and a.status = 'absent') as sessions_absent,
    (select count(*) from public.content_progress c where c.student_id = p.id) as content_completed,
    (select max(t.submitted_at) from public.assessment_attempts t where t.student_id = p.id and t.status = 'submitted') as last_submission_at
  from public.profiles p
  left join public.batch_students bs on bs.student_id = p.id
  where p.role = 'student';

grant select on public.student_scores to authenticated;
grant select on public.student_progress to authenticated;
