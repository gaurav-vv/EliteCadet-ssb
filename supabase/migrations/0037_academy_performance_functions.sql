-- 0037: two read-only functions that give an academy admin their academy's performance data without
-- re-checking row-level security on every row.
--
-- Why: the academy dashboard and performance pages read the `student_progress` and `student_scores` views.
-- Those views are `security_invoker`, so for every student, score and attendance row Postgres re-evaluates
-- the access policies (and `practice_stats()` runs once per student). Measured on a 300-student academy with
-- 1,435 reviewed scores: about 1 to 3 s per request, close to the hosted 8 s statement timeout for
-- the `authenticated` role on a large academy.
--
-- These functions check the caller ONCE, then read each table once in a grouped pass:
--   * the academy comes from the CALLER'S OWN profile (`current_admin_academy_id()` = auth.uid() + role
--     'academy_admin'); it is never a parameter, so no one can ask for another academy's data;
--   * anyone who is not an academy admin (student, mentor, super admin, anonymous) gets zero rows;
--   * SECURITY DEFINER with a fixed search_path, EXECUTE granted to `authenticated` only.
-- The views and every existing policy are unchanged; mentors and students keep using the views.
--
-- Rollback (nothing else depends on these):
--   drop function if exists public.academy_progress_rows();
--   drop function if exists public.academy_score_points();

create or replace function public.academy_progress_rows()
returns table (
  student_id uuid,
  batch_id uuid,
  practice_done bigint,
  reviewed_count bigint,
  sessions_present bigint,
  sessions_absent bigint,
  content_completed bigint,
  last_submission_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (select public.current_admin_academy_id() as academy_id),
  stu as (
    select p.id
    from public.profiles p, me
    where me.academy_id is not null and p.academy_id = me.academy_id and p.role = 'student'
  ),
  sc as (
    select t.student_id, count(*) as n
    from public.feedback f
    join public.assessment_attempts t on t.id = f.attempt_id
    join public.assessments a on a.id = t.assessment_id
    where f.status = 'reviewed' and f.score is not null and t.student_id in (select id from stu)
    group by t.student_id
  ),
  att as (
    select s.student_id,
           count(*) filter (where s.status = 'present') as present,
           count(*) filter (where s.status = 'absent') as absent
    from public.session_attendance s
    where s.student_id in (select id from stu)
    group by s.student_id
  ),
  cp as (
    select c.student_id, count(*) as n from public.content_progress c
    where c.student_id in (select id from stu) group by c.student_id
  ),
  sub as (
    select t.student_id, max(t.submitted_at) as last_at
    from public.assessment_attempts t
    where t.status = 'submitted' and t.student_id in (select id from stu)
    group by t.student_id
  ),
  pr as (
    select a.student_id, count(*) as n from public.practice_answers a
    where a.done and a.student_id in (select id from stu) group by a.student_id
  )
  select stu.id,
         bs.batch_id,
         coalesce(pr.n, 0),
         coalesce(sc.n, 0),
         coalesce(att.present, 0),
         coalesce(att.absent, 0),
         coalesce(cp.n, 0),
         sub.last_at
  from stu
  left join public.batch_students bs on bs.student_id = stu.id
  left join sc on sc.student_id = stu.id
  left join att on att.student_id = stu.id
  left join cp on cp.student_id = stu.id
  left join sub on sub.student_id = stu.id
  left join pr on pr.student_id = stu.id;
$$;

create or replace function public.academy_score_points()
returns table (
  student_id uuid,
  assessment_id uuid,
  title text,
  category text,
  score numeric,
  max_score integer,
  score_pct numeric,
  reviewed_at timestamptz,
  batch_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select t.student_id,
         a.id,
         a.title,
         a.category::text,
         f.score,
         a.max_score::integer,
         round(f.score / a.max_score::numeric * 100::numeric, 1),
         f.reviewed_at,
         a.batch_id
  from public.feedback f
  join public.assessment_attempts t on t.id = f.attempt_id
  join public.assessments a on a.id = t.assessment_id
  where f.status = 'reviewed' and f.score is not null
    and a.academy_id = public.current_admin_academy_id();
$$;

revoke all on function public.academy_progress_rows() from public, anon;
revoke all on function public.academy_score_points() from public, anon;
grant execute on function public.academy_progress_rows() to authenticated;
grant execute on function public.academy_score_points() to authenticated;
