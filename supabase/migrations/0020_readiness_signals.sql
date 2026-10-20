-- SSB Academy — T104: readiness profile signals (PRD §11.8, FR-DASH-02).
-- Run once in the Supabase SQL Editor, AFTER 0019.
--
-- One function gathers, for one student, the numbers the readiness profile is
-- built from: mentor review scores by category, AI practice-evaluation ratings
-- by rubric dimension, practice activity, Library reads, attendance and active
-- days. It returns counts and averages only — never answer or feedback text —
-- so the same numbers can be shown to the student, their mentors, their
-- academy's admins (states only, in the app) and super admins. The states are
-- computed in the app (lib/server/readiness/compute.ts) by fixed rules, never
-- by AI (PRD §5.3: deterministic logic for progress math).

create function public.readiness_signals(p_student uuid)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  result jsonb;
  since_28 timestamptz := now() - interval '28 days';
  since_7 timestamptz := now() - interval '7 days';
begin
  if not (
    p_student = auth.uid()
    or public.is_my_mentee(p_student)
    or exists (select 1 from public.profiles p where p.id = p_student and p.role = 'student' and p.academy_id is not null and p.academy_id = public.current_admin_academy_id())
    or public.is_super_admin()
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  with
  scores as (
    select category::text as category, score_pct, row_number() over (partition by category order by reviewed_at desc) as rn
    from public.student_scores where student_id = p_student
  ),
  evals as (
    select e.rubric_id, e.dimensions, row_number() over (partition by e.rubric_id order by e.created_at desc) as rn
    from public.ai_evaluations e
    where e.student_id = p_student and e.created_at >= now() - interval '90 days'
  ),
  ai_rows as (
    select ev.rubric_id, d->>'dimension' as dimension, d->>'rating' as rating, d->>'confidence' as confidence, (ev.rn <= 2) as recent
    from evals ev, jsonb_array_elements(ev.dimensions) d
  ),
  activity as (
    select (updated_at at time zone 'Asia/Kolkata')::date as day from public.practice_answers where student_id = p_student and done and updated_at >= since_28
    union select (submitted_at at time zone 'Asia/Kolkata')::date from public.practice_attempts where student_id = p_student and submitted_at >= since_28
    union select (submitted_at at time zone 'Asia/Kolkata')::date from public.assessment_attempts where student_id = p_student and status = 'submitted' and submitted_at >= since_28
    union select (completed_at at time zone 'Asia/Kolkata')::date from public.content_progress where student_id = p_student and completed_at >= since_28
    union select (s.starts_at at time zone 'Asia/Kolkata')::date from public.session_attendance a join public.sessions s on s.id = a.session_id where a.student_id = p_student and a.status = 'present' and s.starts_at >= since_28
  )
  select jsonb_build_object(
    'account_created_at', (select created_at from public.profiles where id = p_student),
    'mentor', coalesce((select jsonb_agg(jsonb_build_object(
        'category', category, 'n', n, 'avg_pct', avg_pct, 'recent_avg', recent_avg, 'previous_avg', previous_avg))
      from (select category, count(*) as n, round(avg(score_pct), 1) as avg_pct,
                   round(avg(score_pct) filter (where rn <= 3), 1) as recent_avg,
                   round(avg(score_pct) filter (where rn between 4 and 6), 1) as previous_avg
            from scores group by category) m), '[]'::jsonb),
    'ai', coalesce((select jsonb_agg(jsonb_build_object('rubric_id', rubric_id, 'dimension', dimension, 'rating', rating, 'confidence', confidence, 'recent', recent, 'n', n))
      from (select rubric_id, dimension, rating, confidence, recent, count(*) as n from ai_rows group by 1, 2, 3, 4, 5) a), '[]'::jsonb),
    'practice', jsonb_build_object(
      'done_28d', (select count(*) from public.practice_answers where student_id = p_student and done and updated_at >= since_28),
      'tests_28d', (select count(*) from public.practice_attempts where student_id = p_student and submitted_at >= since_28),
      'interviews_28d', (select count(*) from public.interview_sessions where student_id = p_student and created_at >= since_28),
      -- Tests retaken after earlier AI feedback on the same test: evidence of revision.
      'repeats_after_feedback_28d', (
        select count(*) from public.practice_attempts pa
        where pa.student_id = p_student and pa.submitted_at >= since_28
          and exists (select 1 from public.ai_evaluations e join public.practice_attempts prev on prev.id = e.subject_id
                      where e.subject_type = 'practice_attempt' and prev.student_id = p_student
                        and prev.bank_slug = pa.bank_slug and e.created_at < pa.submitted_at))
    ),
    'library_28d', (select count(*) from public.content_progress where student_id = p_student and completed_at >= since_28),
    'attendance', jsonb_build_object(
      'present', (select count(*) from public.session_attendance where student_id = p_student and status = 'present'),
      'absent', (select count(*) from public.session_attendance where student_id = p_student and status = 'absent')),
    'active_days_28', (select count(distinct day) from activity),
    'active_days_7', (select count(distinct day) from activity where day >= (since_7 at time zone 'Asia/Kolkata')::date)
  ) into result;
  return result;
end;
$$;

revoke execute on function public.readiness_signals(uuid) from public, anon;
grant execute on function public.readiness_signals(uuid) to authenticated;
