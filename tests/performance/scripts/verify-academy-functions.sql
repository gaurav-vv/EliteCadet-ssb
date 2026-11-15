-- LOCAL ONLY. Proves migration 0037's functions return exactly what the views return for the academy admin,
-- and nothing for anyone else. Run against the local database after `npm run perf:seed-dashboards`:
--   docker exec -i supabase_db_<project> psql -U postgres < tests/performance/scripts/verify-academy-functions.sql
-- Replace the four ids below with a seeded academy admin, a student, a mentor and a super admin.
\set admin   '504deed5-f86f-4f2c-a9b5-be5be42c2276'
\set student '17fb9b85-6e4a-41ad-bc80-fa6765e431c0'
\set mentor  '392cce84-29f4-4d9e-b6ae-c16b53886084'
\set super   'e2b5a54e-d8e8-4a78-b78d-f52fb40f305d'

begin;
set local role authenticated;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :'admin'), true);
-- Expect each pair of md5 values to be identical.
select 'progress view' as src, md5(string_agg(concat_ws('|',student_id,batch_id,practice_done,reviewed_count,sessions_present,sessions_absent,content_completed,last_submission_at), ',' order by student_id)), count(*) from student_progress
union all
select 'progress fn', md5(string_agg(concat_ws('|',student_id,batch_id,practice_done,reviewed_count,sessions_present,sessions_absent,content_completed,last_submission_at), ',' order by student_id)), count(*) from academy_progress_rows()
union all
select 'scores view', md5(string_agg(concat_ws('|',student_id,assessment_id,title,category,score,max_score,score_pct,reviewed_at,batch_id), ',' order by student_id,assessment_id)), count(*) from student_scores
union all
select 'scores fn', md5(string_agg(concat_ws('|',student_id,assessment_id,title,category,score,max_score,score_pct,reviewed_at,batch_id), ',' order by student_id,assessment_id)), count(*) from academy_score_points();
rollback;

-- Expect 0 rows from both functions for a student, a mentor and a super admin.
select 'non-admin' as who, :'student' as id;
begin; set local role authenticated;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :'student'), true);
select (select count(*) from academy_progress_rows()) as progress_rows, (select count(*) from academy_score_points()) as score_rows; rollback;
begin; set local role authenticated;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :'mentor'), true);
select (select count(*) from academy_progress_rows()) as progress_rows, (select count(*) from academy_score_points()) as score_rows; rollback;
begin; set local role authenticated;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :'super'), true);
select (select count(*) from academy_progress_rows()) as progress_rows, (select count(*) from academy_score_points()) as score_rows; rollback;

-- Expect "permission denied" for anonymous callers.
begin; set local role anon; select count(*) from academy_progress_rows(); rollback;
