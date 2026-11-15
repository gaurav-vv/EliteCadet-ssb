-- 0038: four read-only functions that give a student their own progress, scores, assessments and sessions
-- without re-checking row-level security on every row.
--
-- Why: the student pages read `student_progress` / `student_scores` (security_invoker views), `assessments`
-- (a policy that scans `batch_students`, which has its own policies, once per assessment row) and `sessions`
-- (`can_see_session_row()` per row, then a second request for host names). Measured locally for a student with
-- 6 reviewed attempts: the assessments list alone took 90 to 850 ms and the progress view 113 ms with 85 ms of
-- planning, before any network time.
--
-- Each function checks the caller ONCE and reads only that caller's rows:
--   * the student is ALWAYS auth.uid(); no function takes a student id, so nobody can ask for someone else's data;
--   * what a student may see is exactly what the existing policies already allow them: the non-draft assessments
--     of their own batch, their own attempt, their own REVIEWED feedback, and the sessions of their batch or ones
--     they were selected for;
--   * anyone who is not a member of a batch gets zero rows; anonymous gets "permission denied";
--   * SECURITY DEFINER with a fixed search_path, EXECUTE granted to `authenticated` only.
-- The views and every policy are unchanged; mentors and academy admins keep using them.
--
-- Rollback (nothing else depends on these):
--   drop function if exists public.my_progress_summary();
--   drop function if exists public.my_score_points();
--   drop function if exists public.my_assessments();
--   drop function if exists public.my_sessions(text, timestamptz);

-- Counts for the progress summary (same definitions as the student_progress view).
create or replace function public.my_progress_summary()
returns table (
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
  select
    (select count(*) from public.feedback f join public.assessment_attempts t on t.id = f.attempt_id
      where t.student_id = auth.uid() and f.status = 'reviewed' and f.score is not null),
    (select count(*) from public.session_attendance a where a.student_id = auth.uid() and a.status = 'present'),
    (select count(*) from public.session_attendance a where a.student_id = auth.uid() and a.status = 'absent'),
    (select count(*) from public.content_progress c where c.student_id = auth.uid()),
    (select max(t.submitted_at) from public.assessment_attempts t where t.student_id = auth.uid() and t.status = 'submitted')
$$;

-- Reviewed scores (same definitions as the student_scores view), oldest first.
create or replace function public.my_score_points()
returns table (
  assessment_id uuid,
  title text,
  category text,
  score numeric,
  max_score integer,
  score_pct numeric,
  improvement_areas text,
  strengths text,
  reviewed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.title, a.category::text, f.score, a.max_score::integer,
         round(f.score / a.max_score::numeric * 100::numeric, 1),
         f.improvement_areas, f.strengths, f.reviewed_at
  from public.assessment_attempts t
  join public.feedback f on f.attempt_id = t.id
  join public.assessments a on a.id = t.assessment_id
  where t.student_id = auth.uid() and f.status = 'reviewed' and f.score is not null
  order by f.reviewed_at
  limit 500
$$;

-- The student's assessments with their own attempt and reviewed feedback, in one read (newest first).
create or replace function public.my_assessments()
returns table (
  id uuid,
  batch_id uuid,
  mentor_id uuid,
  title text,
  instructions text,
  category text,
  questions jsonb,
  max_score integer,
  due_at timestamptz,
  status text,
  created_at timestamptz,
  batch_name text,
  mentor_name text,
  attempt_id uuid,
  attempt_answers jsonb,
  attempt_status text,
  attempt_submitted_at timestamptz,
  student_name text,
  student_email text,
  feedback_id uuid,
  feedback_score numeric,
  feedback_strengths text,
  feedback_improvement_areas text,
  feedback_comments text,
  feedback_status text,
  feedback_reviewed_at timestamptz,
  feedback_mentor_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.batch_id, a.mentor_id, a.title, a.instructions, a.category::text, a.questions,
         a.max_score::integer, a.due_at, a.status::text, a.created_at,
         b.name, m.full_name,
         t.id, t.answers, t.status::text, t.submitted_at,
         me.full_name, me.email,
         f.id, f.score, f.strengths, f.improvement_areas, f.comments, f.status::text, f.reviewed_at, fm.full_name
  from public.assessments a
  join public.batch_students bs on bs.batch_id = a.batch_id and bs.student_id = auth.uid()
  left join public.batches b on b.id = a.batch_id
  left join public.profiles m on m.id = a.mentor_id
  left join public.assessment_attempts t on t.assessment_id = a.id and t.student_id = auth.uid()
  left join public.profiles me on me.id = auth.uid()
  -- A student only ever sees feedback once it has been reviewed (policy feedback_student_read).
  left join public.feedback f on f.attempt_id = t.id and f.status = 'reviewed'
  left join public.profiles fm on fm.id = f.mentor_id
  where a.status <> 'draft'
  order by a.created_at desc
  limit 200
$$;

-- The student's sessions for one view (upcoming | past | cancelled), host name included.
create or replace function public.my_sessions(p_filter text, p_now timestamptz)
returns table (
  id uuid,
  batch_id uuid,
  mentor_id uuid,
  title text,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  mode text,
  meeting_url text,
  location text,
  for_whole_batch boolean,
  status text,
  cancel_reason text,
  meeting_kind text,
  actual_started_at timestamptz,
  actual_ended_at timestamptz,
  ended_early boolean,
  batch_name text,
  host_name text,
  participant_ids uuid[]
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.batch_id, s.mentor_id, s.title, s.description, s.starts_at, s.ends_at, s.mode::text,
         s.meeting_url, s.location, s.for_whole_batch, s.status::text, s.cancel_reason, s.meeting_kind::text,
         s.actual_started_at, s.actual_ended_at, s.ended_early,
         b.name, p.full_name,
         coalesce((select array_agg(sp.student_id) from public.session_participants sp where sp.session_id = s.id), '{}')
  from public.sessions s
  left join public.batches b on b.id = s.batch_id
  left join public.profiles p on p.id = s.mentor_id
  where (
      (s.for_whole_batch and exists (select 1 from public.batch_students bs where bs.batch_id = s.batch_id and bs.student_id = auth.uid()))
      or (not s.for_whole_batch and exists (select 1 from public.session_participants sp where sp.session_id = s.id and sp.student_id = auth.uid()))
    )
    and case
      when p_filter = 'cancelled' then s.status = 'cancelled'
      when p_filter = 'past' then s.status <> 'cancelled' and s.ends_at < p_now
      else s.status = 'scheduled' and s.ends_at >= p_now
    end
  order by
    case when p_filter in ('cancelled', 'past') then s.starts_at end desc nulls last,
    s.starts_at asc
  limit 200
$$;

revoke all on function public.my_progress_summary() from public, anon;
revoke all on function public.my_score_points() from public, anon;
revoke all on function public.my_assessments() from public, anon;
revoke all on function public.my_sessions(text, timestamptz) from public, anon;
grant execute on function public.my_progress_summary() to authenticated;
grant execute on function public.my_score_points() to authenticated;
grant execute on function public.my_assessments() to authenticated;
grant execute on function public.my_sessions(text, timestamptz) to authenticated;
