-- SSB Academy — make student_progress read each table once instead of once per student (2026-11-14).
-- Run once AFTER 0035. Replaces ONE view definition; same columns, same names, same types, same order, same
-- security_invoker setting, same rows for every caller. No table, policy, function or data is changed.
--
-- Why
--  * student_progress (0012, extended by 0014) computed its figures with eight correlated subqueries that ran
--    once per student, and the score count and the score average each re-read student_scores separately.
--    Every read of student_scores re-checks the assessments row-level-security policy per row.
--  * Measured on the local stack with one academy of 300 students, 1,800 attempts, 1,435 reviewed scores and
--    2,400 attendance rows (tests/performance/scripts/seed-dashboard-load.*), as that academy's admin:
--    EXPLAIN (ANALYZE) of the academy dashboard's student_progress read: about 6.3 s, roughly 785,000 buffer
--    hits; two SubPlans (score count, score average) cost about 2.3 s each.
--  * Now each figure is computed in ONE grouped pass over its table, and the view joins the groups. The
--    grouped subqueries reference the same tables and views as before, so the invoker's row-level security
--    applies to every row exactly as it did.
--
-- Same results: counts are coalesced to 0 for a student with no rows (a correlated count(*) returned 0), the
-- average and the latest submission stay null, as before. Checked by comparing an md5 of every row for an
-- academy admin, a mentor and a student before and after (see the test notes in the commit).
--
-- Rollback: restore the previous definition (the one in 0014, with the eight correlated subqueries):
--    create or replace view public.student_progress with (security_invoker = true) as
--      select p.id as student_id, p.academy_id, bs.batch_id,
--        (select count(*) from public.student_scores sc where sc.student_id = p.id) as reviewed_count,
--        (select round(avg(sc.score_pct), 1) from public.student_scores sc where sc.student_id = p.id) as avg_score_pct,
--        (select count(*) from public.session_attendance a where a.student_id = p.id and a.status = 'present') as sessions_present,
--        (select count(*) from public.session_attendance a where a.student_id = p.id and a.status = 'absent') as sessions_absent,
--        (select count(*) from public.content_progress c where c.student_id = p.id) as content_completed,
--        (select max(t.submitted_at) from public.assessment_attempts t where t.student_id = p.id and t.status = 'submitted') as last_submission_at,
--        ps.practice_done, ps.practice_tests, ps.last_practice_at
--      from public.profiles p
--      left join public.batch_students bs on bs.student_id = p.id
--      left join lateral public.practice_stats(p.id) ps(practice_done, practice_tests, last_practice_at) on true
--      where p.role = 'student';

create or replace view public.student_progress
with (security_invoker = true) as
  select
    p.id as student_id,
    p.academy_id,
    bs.batch_id,
    coalesce(sc.reviewed_count, 0) as reviewed_count,
    sc.avg_score_pct,
    coalesce(att.sessions_present, 0) as sessions_present,
    coalesce(att.sessions_absent, 0) as sessions_absent,
    coalesce(cp.content_completed, 0) as content_completed,
    sub.last_submission_at,
    ps.practice_done,
    ps.practice_tests,
    ps.last_practice_at
  from public.profiles p
  left join public.batch_students bs on bs.student_id = p.id
  left join (
    select student_id, count(*) as reviewed_count, round(avg(score_pct), 1) as avg_score_pct
    from public.student_scores group by student_id
  ) sc on sc.student_id = p.id
  left join (
    select student_id,
           count(*) filter (where status = 'present') as sessions_present,
           count(*) filter (where status = 'absent') as sessions_absent
    from public.session_attendance group by student_id
  ) att on att.student_id = p.id
  left join (
    select student_id, count(*) as content_completed from public.content_progress group by student_id
  ) cp on cp.student_id = p.id
  left join (
    select student_id, max(submitted_at) as last_submission_at
    from public.assessment_attempts where status = 'submitted' group by student_id
  ) sub on sub.student_id = p.id
  left join lateral public.practice_stats(p.id) ps(practice_done, practice_tests, last_practice_at) on true
  where p.role = 'student';
