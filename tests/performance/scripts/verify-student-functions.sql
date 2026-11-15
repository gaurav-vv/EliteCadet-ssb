-- Local checks for migration 0038: each function returns exactly what the old view/RLS path returned for the
-- same student (md5 of the rows), nothing for non-members, and is closed to anonymous callers.
-- Run: docker exec -i supabase_db_<project> psql -U postgres < tests/performance/scripts/verify-student-functions.sql
\set ON_ERROR_STOP off
do $$
declare s uuid; a text; b text;
begin
  for s in select p.id from public.profiles p where p.role = 'student' and exists (select 1 from public.batch_students bs where bs.student_id = p.id) order by p.id limit 5 loop
    perform set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
    set local role authenticated;

    select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) into a from (select reviewed_count, sessions_present, sessions_absent, content_completed, last_submission_at from public.student_progress where student_id = s) x;
    select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) into b from (select * from public.my_progress_summary()) x;
    raise notice 'progress  % %', s, case when a = b then 'SAME' else 'DIFFERENT '||a||' '||b end;

    select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) into a from (select assessment_id, title, category::text, score, max_score::integer, score_pct, improvement_areas, strengths, reviewed_at from public.student_scores where student_id = s) x;
    select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) into b from (select assessment_id, title, category, score, max_score, score_pct, improvement_areas, strengths, reviewed_at from public.my_score_points()) x;
    raise notice 'scores    % %', s, case when a = b then 'SAME' else 'DIFFERENT' end;

    -- old path: RLS-filtered assessments + own attempt + visible reviewed feedback
    select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) into a from (
      select a.id, a.title, t.id as attempt_id, f.id as feedback_id, f.score
      from public.assessments a left join public.assessment_attempts t on t.assessment_id = a.id and t.student_id = s
      left join public.feedback f on f.attempt_id = t.id
      where a.status <> 'draft') x;
    select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) into b from (select id, title, attempt_id, feedback_id, feedback_score from public.my_assessments()) x;
    raise notice 'assess    % %', s, case when a = b then 'SAME' else 'DIFFERENT' end;

    for a in select unnest(array['upcoming','past','cancelled']) loop
      select md5(coalesce(string_agg(x.id::text, '|' order by x.id::text), '')) into b from (select id from public.sessions where case when a='cancelled' then status='cancelled' when a='past' then status<>'cancelled' and ends_at < now() else status='scheduled' and ends_at >= now() end) x;
      declare c text; begin
        select md5(coalesce(string_agg(x.id::text, '|' order by x.id::text), '')) into c from public.my_sessions(a, now()) x;
        raise notice 'sessions  % % %', s, a, case when b = c then 'SAME' else 'DIFFERENT' end;
      end;
    end loop;
    reset role;
  end loop;
end $$;

-- A mentor / academy admin / super admin who is in no batch gets nothing; anonymous is refused.
begin;
select set_config('request.jwt.claims', json_build_object('sub', (select id from public.profiles where role = 'academy_admin' limit 1), 'role', 'authenticated')::text, true);
set local role authenticated;
select 'academy admin', (select count(*) from public.my_assessments()) as assessments, (select count(*) from public.my_sessions('upcoming', now())) as sessions, (select count(*) from public.my_score_points()) as scores;
rollback;
begin;
set local role anon;
select * from public.my_assessments();
rollback;
