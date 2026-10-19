-- End-to-end workflow check of migrations 0001–0020 under real RLS.
-- Run with supabase/tests/run-workflow-check.sh (local throwaway database only).
\set ON_ERROR_STOP 1
\set QUIET 1

-- ---------- test helpers (schema t, not part of the app) ----------
create schema t;
grant usage on schema t to authenticated;
create function t.eq(actual bigint, expected bigint, label text) returns void language plpgsql as $$
begin
  if actual is distinct from expected then raise exception 'FAIL %: expected %, got %', label, expected, actual; end if;
  raise notice 'pass  %', label;
end $$;
create function t.fails(stmt text, label text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice 'pass  % (refused: %)', label, sqlerrm;
    return;
  end;
  raise exception 'FAIL %: statement was allowed', label;
end $$;
-- rows affected by an UPDATE (0 = silently blocked by RLS)
create function t.affected(stmt text) returns bigint language plpgsql as $$
declare n bigint;
begin execute stmt; get diagnostics n = row_count; return n; end $$;
grant execute on all functions in schema t to authenticated;
-- notification count by recipient + kind, read as postgres (bypasses RLS)
create function t.n(p uuid, k text) returns bigint language sql security definer as $$
  select count(*) from public.notifications where recipient_id = p and kind::text = k $$;
grant execute on function t.n(uuid, text) to authenticated;

-- ---------- 0. accounts (as the service role / signup trigger would) ----------
\set SUPER   '00000000-0000-4000-8000-000000000001'
\set ADMIN_A '00000000-0000-4000-8000-0000000000a1'
\set ADMIN_B '00000000-0000-4000-8000-0000000000b1'
\set MENT_A  '00000000-0000-4000-8000-0000000000a2'
\set MENT_B  '00000000-0000-4000-8000-0000000000b2'
\set S1      '00000000-0000-4000-8000-0000000000a3'
\set S2      '00000000-0000-4000-8000-0000000000a4'
\set S3      '00000000-0000-4000-8000-0000000000b3'

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  (:'SUPER',   'super@x.test',   '{"role":"super_admin"}', '{"full_name":"Super"}'),
  (:'ADMIN_A', 'admina@x.test',  '{"role":"academy_admin"}', '{"full_name":"Admin A","academy_name":"Alpha Academy"}'),
  (:'ADMIN_B', 'adminb@x.test',  '{"role":"academy_admin"}', '{"full_name":"Admin B","academy_name":"Bravo Academy"}');
select academy_id as "AC_A" from public.profiles where id = :'ADMIN_A' \gset
select academy_id as "AC_B" from public.profiles where id = :'ADMIN_B' \gset
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  (:'MENT_A', 'menta@x.test', json_build_object('role','mentor','academy_id',:'AC_A')::jsonb, '{"full_name":"Mentor A"}'),
  (:'MENT_B', 'mentb@x.test', json_build_object('role','mentor','academy_id',:'AC_B')::jsonb, '{"full_name":"Mentor B"}'),
  (:'S1', 's1@x.test', json_build_object('role','student','academy_id',:'AC_A')::jsonb, '{"full_name":"Student One"}'),
  (:'S2', 's2@x.test', json_build_object('role','student','academy_id',:'AC_A')::jsonb, '{"full_name":"Student Two"}'),
  (:'S3', 's3@x.test', json_build_object('role','student','academy_id',:'AC_B')::jsonb, '{"full_name":"Student Three"}');
select t.eq((select count(*) from public.profiles), 8, 'signup trigger created 8 profiles');
select t.eq((select count(*) from public.academies), 2, 'two academies created');

-- Browser-supplied role is NOT trusted: user_metadata says super_admin.
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-4000-8000-0000000000ff', 'evil@x.test', '{"role":"super_admin"}');
select t.eq((select count(*) from public.profiles where id = '00000000-0000-4000-8000-0000000000ff' and role = 'student'), 1, 'browser role ignored -> student');

-- ---------- 1. Super Admin publishes content ----------
select set_config('request.jwt.claim.sub', :'SUPER', false); set role authenticated;
insert into public.contents (title, category, type, status, body, created_by) values ('Group planning basics', 'gto', 'article', 'published', 'Plan, then act.', :'SUPER');
select id as "CONTENT" from public.contents limit 1 \gset
reset role;

-- ---------- 2. Academy A: batch, students, mentor ----------
select set_config('request.jwt.claim.sub', :'ADMIN_A', false); set role authenticated;
insert into public.batches (academy_id, name) values (:'AC_A', 'Alpha 1');
select id as "BA" from public.batches where name = 'Alpha 1' \gset
insert into public.batch_students (batch_id, student_id) values (:'BA', :'S1'), (:'BA', :'S2');
insert into public.batch_mentors (batch_id, mentor_id) values (:'BA', :'MENT_A');
select t.fails(format('insert into public.batch_students (batch_id, student_id) values (%L, %L)', :'BA', :'S3'), 'admin A cannot add academy B''s student to a batch');
select t.fails(format('insert into public.batches (academy_id, name) values (%L, %L)', :'AC_B', 'Sneaky'), 'admin A cannot create a batch in academy B');
reset role;

select set_config('request.jwt.claim.sub', :'ADMIN_B', false); set role authenticated;
insert into public.batches (academy_id, name) values (:'AC_B', 'Bravo 1');
select id as "BB" from public.batches where name = 'Bravo 1' \gset
insert into public.batch_students (batch_id, student_id) values (:'BB', :'S3');
insert into public.batch_mentors (batch_id, mentor_id) values (:'BB', :'MENT_B');
select t.eq((select count(*) from public.batches where academy_id = :'AC_A'), 0, 'admin B sees none of academy A''s batches');
reset role;

select t.eq(t.n(:'S1', 'batch_assigned'), 1, 'notify: S1 added to batch');
select t.eq(t.n(:'MENT_A', 'batch_assigned'), 1, 'notify: mentor A assigned to batch');

-- ---------- 3. Mentor A schedules sessions ----------
select set_config('request.jwt.claim.sub', :'MENT_A', false); set role authenticated;
insert into public.sessions (batch_id, mentor_id, created_by, title, starts_at, ends_at, mode, meeting_url)
  values (:'BA', :'MENT_A', :'MENT_A', 'GD practice', now() + interval '1 day', now() + interval '1 day 1 hour', 'online', 'https://meet.example.com/a');
select id as "SES_WHOLE" from public.sessions where title = 'GD practice' \gset
update public.sessions set title = 'GD practice (edited)' where id = :'SES_WHOLE';
select t.fails(format('insert into public.sessions (batch_id, mentor_id, created_by, title, starts_at, ends_at, mode, meeting_url) values (%L, %L, %L, %L, now() + interval ''2 days'', now() + interval ''2 days 1 hour'', ''online'', ''https://meet.example.com/b'')', :'BB', :'MENT_A', :'MENT_A', 'Not my batch'), 'mentor A cannot schedule for academy B''s batch');
select t.fails(format('insert into public.sessions (batch_id, mentor_id, created_by, title, starts_at, ends_at, mode, meeting_url) values (%L, %L, %L, %L, now() + interval ''1 day 30 minutes'', now() + interval ''1 day 2 hours'', ''online'', ''https://meet.example.com/c'')', :'BA', :'MENT_A', :'MENT_A', 'Overlap'), 'double-booking refused');

insert into public.sessions (batch_id, mentor_id, created_by, title, starts_at, ends_at, mode, meeting_url, for_whole_batch)
  values (:'BA', :'MENT_A', :'MENT_A', 'One-to-one', now() + interval '3 days', now() + interval '3 days 1 hour', 'online', 'https://meet.example.com/d', false);
select id as "SES_ONE" from public.sessions where title = 'One-to-one' \gset
insert into public.session_participants (session_id, student_id) values (:'SES_ONE', :'S1');
select t.fails(format('insert into public.session_participants (session_id, student_id) values (%L, %L)', :'SES_ONE', :'S3'), 'participant must be in the batch');
update public.sessions set status = 'cancelled', cancel_reason = 'Mentor unwell' where id = :'SES_ONE';

-- a session that already happened, for attendance
insert into public.sessions (batch_id, mentor_id, created_by, title, starts_at, ends_at, mode, meeting_url)
  values (:'BA', :'MENT_A', :'MENT_A', 'Lecturette drill', now() - interval '2 hours', now() - interval '1 hour', 'online', 'https://meet.example.com/e');
select id as "SES_PAST" from public.sessions where title = 'Lecturette drill' \gset
insert into public.session_attendance (session_id, student_id, status, marked_by) values (:'SES_PAST', :'S1', 'present', :'MENT_A'), (:'SES_PAST', :'S2', 'absent', :'MENT_A');
select t.fails(format('insert into public.session_attendance (session_id, student_id, status, marked_by) values (%L, %L, ''present'', %L)', :'SES_WHOLE', :'S1', :'MENT_A'), 'attendance refused before the session starts');
select t.fails(format('insert into public.session_attendance (session_id, student_id, status, marked_by) values (%L, %L, ''present'', %L)', :'SES_PAST', :'S3', :'MENT_A'), 'attendance refused for a non-participant');
reset role;

select t.eq(t.n(:'S1', 'session_scheduled'), 2, 'notify: S1 told about whole-batch + one-to-one (edit not repeated, past session not announced)');
select t.eq(t.n(:'S2', 'session_scheduled'), 1, 'notify: S2 told only about the whole-batch session');
select t.eq(t.n(:'S3', 'session_scheduled'), 0, 'notify: academy B student told nothing');
select t.eq(t.n(:'S1', 'session_cancelled'), 1, 'notify: S1 told about cancellation');
select t.eq(t.n(:'S2', 'session_cancelled'), 0, 'notify: S2 (not a participant) not told');
select t.eq(t.n(:'ADMIN_A', 'session_cancelled'), 1, 'notify: academy A admin told about cancellation');
select t.eq(t.n(:'ADMIN_B', 'session_cancelled'), 0, 'notify: academy B admin not told');

-- ---------- 4. Assessment: open, submit, review ----------
select set_config('request.jwt.claim.sub', :'MENT_A', false); set role authenticated;
insert into public.assessments (batch_id, mentor_id, title, category, questions, max_score, status)
  values (:'BA', :'MENT_A', 'GTO planning', 'gto', '[{"id":"q1","prompt":"Plan the obstacle run."}]', 10, 'draft');
select id as "ASM" from public.assessments where title = 'GTO planning' \gset
update public.assessments set status = 'published' where id = :'ASM';
update public.assessments set status = 'closed' where id = :'ASM';
update public.assessments set status = 'published' where id = :'ASM';
reset role;
select t.eq(t.n(:'S1', 'assessment_published'), 1, 'notify: S1 told once (re-open not repeated)');
select t.eq(t.n(:'S3', 'assessment_published'), 0, 'notify: academy B student not told');

select set_config('request.jwt.claim.sub', :'S3', false); set role authenticated;
select t.eq((select count(*) from public.assessments where id = :'ASM'), 0, 'S3 cannot see academy A''s assessment');
select t.fails(format('insert into public.assessment_attempts (assessment_id, student_id, answers, status) values (%L, %L, ''[]'', ''submitted'')', :'ASM', :'S3'), 'S3 cannot answer another batch''s assessment');
reset role;

select set_config('request.jwt.claim.sub', :'S1', false); set role authenticated;
insert into public.assessment_attempts (assessment_id, student_id, answers, status) values (:'ASM', :'S1', '[{"questionId":"q1","text":"Split into two teams..."}]', 'submitted');
select id as "ATT" from public.assessment_attempts where student_id = :'S1' \gset
select t.eq(t.affected(format('update public.assessment_attempts set answers = ''[]'' where id = %L', :'ATT')), 0, 'submitted attempt is locked for the student');
reset role;
select t.eq(t.n(:'MENT_A', 'submission_received'), 1, 'notify: mentor A told about the submission');

select set_config('request.jwt.claim.sub', :'MENT_B', false); set role authenticated;
select t.eq((select count(*) from public.assessment_attempts), 0, 'mentor B sees no academy A submissions');
select t.fails(format('insert into public.feedback (attempt_id, mentor_id, score, status) values (%L, %L, 1, ''in_review'')', :'ATT', :'MENT_B'), 'mentor B cannot review academy A work');
reset role;

select set_config('request.jwt.claim.sub', :'MENT_A', false); set role authenticated;
insert into public.feedback (attempt_id, mentor_id, score, strengths, improvement_areas, status) values (:'ATT', :'MENT_A', 6, 'Clear roles', 'Use the helper rope', 'in_review');
reset role;
select set_config('request.jwt.claim.sub', :'S1', false); set role authenticated;
select t.eq((select count(*) from public.feedback), 0, 'student cannot see a draft review');
reset role;
select set_config('request.jwt.claim.sub', :'MENT_A', false); set role authenticated;
update public.feedback set score = 7, status = 'reviewed' where attempt_id = :'ATT';
select t.eq(t.affected(format('update public.feedback set score = 10 where attempt_id = %L', :'ATT')), 0, 'reviewed feedback is locked (update matches nothing)');
select t.eq((select score::bigint from public.feedback where attempt_id = :'ATT'), 7, 'reviewed score unchanged');
reset role;
select t.eq(t.n(:'S1', 'feedback_reviewed'), 1, 'notify: S1 told feedback is ready');

-- ---------- 5. Progress views at each scope ----------
select set_config('request.jwt.claim.sub', :'S1', false); set role authenticated;
insert into public.content_progress (content_id, student_id) values (:'CONTENT', :'S1');
select t.fails(format('insert into public.content_progress (content_id, student_id) values (%L, %L)', :'CONTENT', :'S2'), 'S1 cannot mark reading for S2');
select t.eq((select reviewed_count from public.student_progress where student_id = :'S1'), 1, 'S1 progress: 1 reviewed');
select t.eq((select avg_score_pct::bigint from public.student_progress where student_id = :'S1'), 70, 'S1 progress: average 70%');
select t.eq((select sessions_present from public.student_progress where student_id = :'S1'), 1, 'S1 progress: 1 present');
select t.eq((select content_completed from public.student_progress where student_id = :'S1'), 1, 'S1 progress: 1 Library item read');
reset role;

select set_config('request.jwt.claim.sub', :'S2', false); set role authenticated;
select t.eq((select count(*) from public.student_scores where student_id = :'S1'), 0, 'S2 cannot see S1''s scores');
reset role;
select set_config('request.jwt.claim.sub', :'MENT_A', false); set role authenticated;
select t.eq((select count(*) from public.student_scores where student_id = :'S1'), 1, 'mentor A sees their mentee''s score');
select t.eq((select sessions_absent from public.student_progress where student_id = :'S2'), 1, 'mentor A sees S2 attendance');
reset role;
select set_config('request.jwt.claim.sub', :'ADMIN_A', false); set role authenticated;
select t.eq((select count(*) from public.student_scores where student_id = :'S1'), 1, 'admin A sees academy A scores');
reset role;
select set_config('request.jwt.claim.sub', :'ADMIN_B', false); set role authenticated;
select t.eq((select count(*) from public.student_scores), 0, 'admin B sees no academy A scores');
select t.eq((select count(*) from public.sessions where academy_id = :'AC_A'), 0, 'admin B sees no academy A sessions');
reset role;
select set_config('request.jwt.claim.sub', :'MENT_B', false); set role authenticated;
select t.eq((select count(*) from public.student_progress where student_id in (:'S1', :'S2') and reviewed_count > 0), 0, 'mentor B sees no academy A progress');
reset role;

-- ---------- 6. Content request: new, then quoted ----------
select set_config('request.jwt.claim.sub', :'MENT_A', false); set role authenticated;
insert into public.content_requests (mentor_id, academy_id, title, details, category, type) values (:'MENT_A', :'AC_A', 'SRT practice pack', 'Twenty situations with model answers.', 'psychology', 'practice_exercise');
select id as "REQ" from public.content_requests \gset
reset role;
select t.eq(t.n(:'SUPER', 'content_request_new'), 1, 'notify: super admin told about the request');
select set_config('request.jwt.claim.sub', :'SUPER', false); set role authenticated;
update public.content_requests set status = 'quoted', quoted_fee_inr = 1500, quoted_at = now() where id = :'REQ';
reset role;
select t.eq(t.n(:'MENT_A', 'content_request_update'), 1, 'notify: mentor told the request was quoted');

-- ---------- 7. Notifications are private ----------
select id as "N_S1" from public.notifications where recipient_id = :'S1' limit 1 \gset
select set_config('request.jwt.claim.sub', :'S2', false); set role authenticated;
select t.eq((select count(*) from public.notifications where recipient_id = :'S1'), 0, 'S2 cannot read S1''s notifications');
select t.eq(t.affected(format('update public.notifications set read_at = now() where id = %L', :'N_S1')), 0, 'S2 cannot mark S1''s notification read');
select t.fails(format('insert into public.notifications (recipient_id, kind, title) values (%L, ''batch_assigned'', ''Fake'')', :'S1'), 'clients cannot create notifications');
select t.fails(format('select public.notify(%L, ''batch_assigned'', ''Fake'', null, null, null)', :'S1'), 'clients cannot call notify()');
reset role;
select set_config('request.jwt.claim.sub', :'S1', false); set role authenticated;
select t.fails(format('update public.notifications set title = ''Changed'' where id = %L', :'N_S1'), 'recipient cannot change the title');
select t.eq(t.affected(format('update public.notifications set read_at = now() where id = %L', :'N_S1')), 1, 'recipient can mark their own read');
reset role;

-- ---------- 8. Platform analytics ----------
select set_config('request.jwt.claim.sub', :'ADMIN_A', false); set role authenticated;
select t.fails('select public.platform_analytics(now() - interval ''30 days'')', 'academy admin cannot call platform analytics');
reset role;
select set_config('request.jwt.claim.sub', :'SUPER', false); set role authenticated;
select public.platform_analytics(now() - interval '30 days') as "PA" \gset
select t.eq(((:'PA')::jsonb #>> '{totals,academies}')::bigint, 2, 'analytics: 2 academies');
select t.eq(((:'PA')::jsonb #>> '{totals,students}')::bigint, 4, 'analytics: 4 students (incl. the self-signup)');
select t.eq(((:'PA')::jsonb #>> '{activity,reviews}')::bigint, 1, 'analytics: 1 review');
select t.eq(((:'PA')::jsonb #>> '{activity,avgScorePct}')::numeric::bigint, 70, 'analytics: average 70%');
select t.eq(((:'PA')::jsonb #>> '{activity,attendancePct}')::numeric::bigint, 50, 'analytics: attendance 50%');
select t.eq(((:'PA')::jsonb #>> '{activity,sessionsHeld}')::bigint, 1, 'analytics: 1 session held');
select t.eq(jsonb_array_length((:'PA')::jsonb -> 'monthly'), 6, 'analytics: six months');
reset role;

-- ---------- 9. Practice banks and saved practice (0014) ----------
select id as "TAT1" from public.practice_items where bank_slug = 'tat' and key = 'tat-1' \gset
select id as "OIRT1" from public.practice_items where bank_slug = 'oir-verbal-test' and key = 'oir-t-1' \gset
select correct_option_id as "OIRT1_OK" from public.practice_items where id = :'OIRT1' \gset
select id as "OIRT2" from public.practice_items where bank_slug = 'oir-verbal-test' and key = 'oir-t-2' \gset
select t.eq((select count(*) from public.practice_items), 209, 'seed: 209 practice questions in 11 banks');

select set_config('request.jwt.claim.sub', :'S1', false); set role authenticated;
select t.eq((select count(*) from public.practice_items where bank_slug = 'tat'), 13, 'student reads the TAT bank');
select t.fails(format('insert into public.practice_items (bank_slug, prompt, created_by) values (%L, %L, %L)', 'tat', 'Mine', :'S1'), 'student cannot add bank questions');
insert into public.practice_answers (student_id, item_id, answer_text, done) values (:'S1', :'TAT1', 'A determined young officer...', true);
select t.fails(format('insert into public.practice_answers (student_id, item_id, answer_text) values (%L, %L, %L)', :'S2', :'TAT1', 'x'), 'student cannot save answers for another student');
insert into public.practice_attempts (student_id, bank_slug, mode, client_key, answers)
  values (:'S1', 'oir-verbal-test', 'test', 'run-0000000001', json_build_array(json_build_object('itemId', :'OIRT1', 'optionId', :'OIRT1_OK'), json_build_object('itemId', :'OIRT2', 'optionId', 'wrong'))::jsonb);
select t.eq((select correct from public.practice_attempts where client_key = 'run-0000000001'), 1, 'MCQ test scored by the database: 1 of 2');
select t.fails(format('insert into public.practice_attempts (student_id, bank_slug, mode, client_key, answers) values (%L, %L, %L, %L, %L)', :'S1', 'oir-verbal-test', 'test', 'run-0000000001', '[]'), 'a repeated submit (same client key) is refused');
select t.fails(format('insert into public.practice_attempts (student_id, bank_slug, mode, client_key, answers) values (%L, %L, %L, %L, %L::jsonb)', :'S1', 'tat', 'test', 'run-0000000002', json_build_array(json_build_object('itemId', :'OIRT1'))), 'an answer for another bank''s question is refused');
select t.fails(format('insert into public.practice_attempts (student_id, bank_slug, mode, client_key, answers) values (%L, %L, %L, %L, %L)', :'S1', 'interview', 'test', 'run-0000000003', '[{"prompt":"About Pune?","response":"Home"}]'), 'own (PIQ) questions only in mock runs');
insert into public.practice_attempts (student_id, bank_slug, mode, client_key, answers) values (:'S1', 'interview', 'mock', 'run-0000000004', '[{"prompt":"About Pune?","response":"Home"}]');
select t.eq(t.affected(format('update public.practice_attempts set self_review = %L where client_key = %L', '{"own-1":["Honest"]}', 'run-0000000004')), 1, 'student ticks self-review on their mock run');
select t.fails(format('update public.practice_attempts set answers = %L where client_key = %L', '[]', 'run-0000000004'), 'submitted answers can''t be changed');
reset role;

select set_config('request.jwt.claim.sub', :'S2', false); set role authenticated;
select t.eq((select count(*) from public.practice_answers where student_id = :'S1'), 0, 'S2 cannot read S1''s practice');
reset role;
select set_config('request.jwt.claim.sub', :'MENT_A', false); set role authenticated;
select t.eq((select count(*) from public.practice_answers where student_id = :'S1'), 1, 'mentor A reads their mentee''s practice answers');
select t.eq((select count(*) from public.practice_attempts where student_id = :'S1'), 2, 'mentor A sees their mentee''s tests and mock runs');
select t.fails(format('insert into public.practice_answers (student_id, item_id, answer_text) values (%L, %L, %L)', :'MENT_A', :'TAT1', 'x'), 'a mentor cannot save practice answers');
reset role;
select set_config('request.jwt.claim.sub', :'MENT_B', false); set role authenticated;
select t.eq((select count(*) from public.practice_answers where student_id = :'S1'), 0, 'mentor B cannot read academy A practice');
reset role;
select set_config('request.jwt.claim.sub', :'ADMIN_A', false); set role authenticated;
select t.eq((select count(*) from public.practice_answers where student_id = :'S1'), 0, 'academy admin cannot read answer text');
select t.eq((select practice_done from public.student_progress where student_id = :'S1'), 1, 'academy admin sees the practice count');
select t.eq((select practice_tests from public.student_progress where student_id = :'S1'), 2, 'academy admin sees the test count');
reset role;
select set_config('request.jwt.claim.sub', :'ADMIN_B', false); set role authenticated;
select t.eq((select count(*) from public.practice_stats(:'S1') where practice_done is not null), 0, 'admin B gets no counts for academy A''s student');
reset role;

select set_config('request.jwt.claim.sub', :'SUPER', false); set role authenticated;
insert into public.practice_items (bank_slug, key, prompt, created_by) values ('tat', 'tat-new', 'A new scene.', :'SUPER');
select t.eq((select position from public.practice_items where key = 'tat-new'), 14, 'new question goes to the end of the bank');
select t.fails(format('insert into public.practice_items (bank_slug, prompt, options, correct_option_id, created_by) values (%L, %L, %L, %L, %L)', 'oir-verbal-test', 'Q?', '[{"id":"a","label":"A"}]', 'a', :'SUPER'), 'an MCQ needs at least two options');
select public.practice_move_item(:'TAT1', 1);
select t.eq((select position from public.practice_items where id = :'TAT1'), 2, 'reorder swaps with the next question');
update public.practice_items set active = false where id = :'TAT1';
reset role;
select set_config('request.jwt.claim.sub', :'S1', false); set role authenticated;
select t.eq((select count(*) from public.practice_items where id = :'TAT1'), 0, 'a hidden question disappears for students');
select t.eq((select count(*) from public.practice_answers where item_id = :'TAT1'), 1, '...and their saved answer is kept');
select t.fails('select public.practice_move_item(gen_random_uuid(), 1)', 'only a super admin can reorder');
reset role;

-- ---------- 10. AI jobs and evaluations (0017) ----------
select public.enqueue_ai_evaluation('practice_attempt', gen_random_uuid(), :'S1', 'general-response', 1, '{"items":[{"prompt":"Q","response":"My answer"}]}') as "AIJOB" \gset
select id as "AIJOB2" from public.ai_claim_jobs('w-check', 1) \gset
select public.ai_complete_job(:'AIJOB2', 'w-check', 'claude-opus-5-5',
  '[{"dimension":"relevance","rating":"strong","confidence":"high","evidence":["My answer"],"note":"ok"}]',
  '{"observation":"o","evidence":"e","impact":"i","improvement_action":"a","recommended_practice":"p"}', 'high');
select t.eq((select count(*) from public.ai_evaluations where job_id = :'AIJOB'), 1, 'worker stores an evaluation for the claimed job');

select set_config('request.jwt.claim.sub', :'S1', false); set role authenticated;
select t.eq((select count(*) from public.ai_evaluations where student_id = :'S1'), 1, 'student reads their own AI evaluation');
select t.eq((select count(*) from public.ai_jobs where student_id = :'S1'), 1, 'student sees their job status');
select t.fails(format('insert into public.ai_evaluations (job_id, subject_type, subject_id, student_id, rubric_id, rubric_version, model, dimensions, feedback, overall_confidence) values (%L, %L, gen_random_uuid(), %L, %L, 1, %L, %L, %L, %L)', :'AIJOB', 'x_x', :'S1', 'general-response', 'm', '[{}]', '{"observation":"o","evidence":"e","impact":"i","improvement_action":"a","recommended_practice":"p"}', 'high'), 'students cannot write AI evaluations');
select t.fails(format('select public.enqueue_ai_evaluation(%L, gen_random_uuid(), %L, %L, 1, %L)', 'practice_attempt', :'S1', 'general-response', '{"items":[]}'), 'clients cannot enqueue AI jobs');
select t.fails('select * from public.ai_claim_jobs(''me'', 1)', 'clients cannot claim AI jobs');
select t.eq((select count(*) from public.ai_usage), 0, 'students cannot read AI cost data');
reset role;
select set_config('request.jwt.claim.sub', :'S2', false); set role authenticated;
select t.eq((select count(*) from public.ai_evaluations where student_id = :'S1'), 0, 'another student cannot read it');
reset role;
select set_config('request.jwt.claim.sub', :'MENT_A', false); set role authenticated;
select t.eq((select count(*) from public.ai_evaluations where student_id = :'S1'), 1, 'their mentor reads it');
reset role;
select set_config('request.jwt.claim.sub', :'MENT_B', false); set role authenticated;
select t.eq((select count(*) from public.ai_evaluations where student_id = :'S1'), 0, 'another academy''s mentor cannot');
reset role;
select set_config('request.jwt.claim.sub', :'ADMIN_A', false); set role authenticated;
select t.eq((select count(*) from public.ai_evaluations where student_id = :'S1'), 0, 'academy admin cannot read AI feedback text');
reset role;
select t.fails(format('insert into public.ai_evaluations (job_id, subject_type, subject_id, student_id, rubric_id, rubric_version, model, label, dimensions, feedback, overall_confidence) values (gen_random_uuid(), %L, gen_random_uuid(), %L, %L, 1, %L, %L, %L, %L, %L)', 'x_x', :'S1', 'r', 'm', 'Official SSB score', '[{}]', '{"observation":"o","evidence":"e","impact":"i","improvement_action":"a","recommended_practice":"p"}', 'high'), 'every evaluation must carry the AI practice label');

-- ---------- 11. Psychology AI feedback (0018) ----------
select id as "TAT2" from public.practice_items where bank_slug = 'tat' and key = 'tat-2' \gset
select id as "WAT1" from public.practice_items where bank_slug = 'wat' and key = 'wat-1' \gset
select set_config('request.jwt.claim.sub', :'S1', false); set role authenticated;
insert into public.practice_attempts (student_id, bank_slug, mode, client_key, answers)
  values (:'S1', 'tat', 'test', 'psy-0000000001', json_build_array(json_build_object('itemId', :'TAT2', 'response', 'Ravi calls a meeting and plans the relief work.'))::jsonb);
select id as "PSY_ATT" from public.practice_attempts where client_key = 'psy-0000000001' \gset
insert into public.practice_attempts (student_id, bank_slug, mode, client_key, answers)
  values (:'S1', 'wat', 'test', 'psy-0000000002', json_build_array(json_build_object('itemId', :'WAT1', 'response', '   '))::jsonb);
reset role;
select t.eq((select count(*) from public.ai_jobs where subject_id = :'PSY_ATT' and rubric_id = 'psychology-tat' and rubric_version = 1), 1, 'submitting a TAT test queues one AI evaluation');
select t.eq((select count(*) from public.ai_jobs where subject_id = :'PSY_ATT' and input->'items'->0->>'response' = 'Ravi calls a meeting and plans the relief work.' and input->'items'->0->>'prompt' <> ''), 1, '...with the question and answer snapshotted');
select t.eq((select count(*) from public.ai_jobs j join public.practice_attempts a on a.id = j.subject_id where a.client_key = 'psy-0000000002'), 0, 'a test with nothing written is not queued');
select t.eq((select count(*) from public.ai_jobs j join public.practice_attempts a on a.id = j.subject_id where a.client_key in ('run-0000000001', 'run-0000000004')), 0, 'OIR tests and mock interviews are not queued for psychology feedback');

select id as "PSYJOB" from public.ai_claim_jobs('w-psy', 5) where subject_id = :'PSY_ATT' \gset
select public.ai_complete_job(:'PSYJOB', 'w-psy', 'claude-opus-5-5',
  '[{"dimension":"action","name":"Action toward the goal","rating":"strong","confidence":"medium","evidence":["plans the relief work"],"note":"The character acts."}]',
  '{"observation":"o","evidence":"e","impact":"i","improvement_action":"a","recommended_practice":"p"}', 'medium');
select t.eq(t.n(:'S1', 'ai_feedback_ready'), 1, 'notify: student told their practice feedback is ready');
select t.eq((select count(*) from public.notifications where recipient_id = :'S1' and kind = 'ai_feedback_ready' and href = '/student/practice/psychology/results/' || :'PSY_ATT'), 1, '...linking to the results page');

select set_config('request.jwt.claim.sub', :'S1', false); set role authenticated;
select t.fails('select public.set_practice_bank_timing(''srt'', ''{"mode":"budget","totalSeconds":1200}'')', 'a student cannot change timers');
reset role;
select set_config('request.jwt.claim.sub', :'SUPER', false); set role authenticated;
select public.set_practice_bank_timing('srt', '{"mode":"budget","totalSeconds":1200}');
select t.eq((select (timing->>'totalSeconds')::bigint from public.practice_banks where slug = 'srt'), 1200, 'super admin sets the SRT timer');
select t.fails('select public.set_practice_bank_timing(''wat'', ''{"mode":"carousel","responseSeconds":1}'')', 'an out-of-range timer is refused');
reset role;

-- ---------- 12. AI interview (0019) ----------
select set_config('request.jwt.claim.sub', :'S1', false); set role authenticated;
select public.start_interview_session('topic', 'hobbies', '{}') as "INT_S" \gset
select t.eq((select count(*) from public.interview_turns where session_id = :'INT_S' and seq = 1 and question = 'What do you do in your free time, and how did you get into it?'), 1, 'a topic interview opens with that topic''s question');
select id as "INT_T1" from public.interview_turns where session_id = :'INT_S' and seq = 1 \gset
select t.fails('select public.start_interview_session(''topic'', null, ''{}'')', 'a topic interview needs a topic');
select public.answer_interview_turn(:'INT_T1', 'I play hockey; I started at school.');
select t.fails(format('select public.answer_interview_turn(%L, %L)', :'INT_T1', 'again'), 'a question can be answered only once');
reset role;
select t.eq((select count(*) from public.ai_jobs where kind = 'interview_question' and subject_id = :'INT_T1'), 1, 'answering queues the next AI question');

select set_config('request.jwt.claim.sub', :'S2', false); set role authenticated;
select t.eq((select count(*) from public.interview_turns where session_id = :'INT_S'), 0, 'another student cannot read the interview');
select t.fails(format('select public.skip_interview_wait(%L)', :'INT_S'), 'another student cannot change it');
reset role;
select set_config('request.jwt.claim.sub', :'MENT_A', false); set role authenticated;
select t.eq((select count(*) from public.interview_turns where session_id = :'INT_S'), 1, 'their mentor reads the interview');
select t.fails('select public.start_interview_session(''mock'', null, ''{}'')', 'a mentor cannot start a student interview');
reset role;
select set_config('request.jwt.claim.sub', :'MENT_B', false); set role authenticated;
select t.eq((select count(*) from public.interview_sessions where id = :'INT_S'), 0, 'another academy''s mentor cannot');
reset role;
select set_config('request.jwt.claim.sub', :'ADMIN_A', false); set role authenticated;
select t.eq((select count(*) from public.interview_turns where session_id = :'INT_S'), 0, 'the academy admin cannot read interview answers');
reset role;
select set_config('request.jwt.claim.sub', :'S1', false); set role authenticated;
select t.fails(format('select public.interview_append_question(%L, %L, ''new_topic'', null)', :'INT_S', 'Any question?'), 'students cannot write questions themselves');
select t.fails(format('update public.interview_turns set answer = %L where id = %L', 'changed', :'INT_T1'), 'answers cannot be edited afterwards');
select public.skip_interview_wait(:'INT_S');
select t.eq((select count(*) from public.interview_turns where session_id = :'INT_S' and seq = 2 and kind = 'bank'), 1, 'skipping the wait continues from the question bank');
reset role;

-- ---------- 13. Readiness signals (0020) ----------
select set_config('request.jwt.claim.sub', :'S1', false); set role authenticated;
select public.readiness_signals(:'S1') as "RS" \gset
select t.eq(((:'RS')::jsonb -> 'mentor' -> 0 ->> 'n')::bigint, 1, 'readiness: the student''s mentor review is counted');
select t.eq(((:'RS')::jsonb -> 'mentor' -> 0 ->> 'avg_pct')::numeric::bigint, 70, '...with its average');
select t.eq((select count(*) from jsonb_array_elements((:'RS')::jsonb -> 'ai') x where x->>'rubric_id' = 'psychology-tat'), 1, 'readiness: AI practice feedback ratings are counted');
select t.eq((case when ((:'RS')::jsonb ->> 'active_days_28')::int >= 1 then 1 else 0 end), 1, 'readiness: active days are counted');
select t.eq((case when (:'RS')::jsonb::text ~ '(Ravi calls|plans the relief|My answer)' then 1 else 0 end), 0, 'readiness signals contain no answer or feedback text');
select t.fails(format('select public.readiness_signals(%L)', :'S2'), 'a student cannot read another student''s signals');
reset role;
select set_config('request.jwt.claim.sub', :'MENT_A', false); set role authenticated;
select t.eq((select count(*) from (select public.readiness_signals(:'S1')) x), 1, 'their mentor reads the signals');
reset role;
select set_config('request.jwt.claim.sub', :'ADMIN_A', false); set role authenticated;
select t.eq((select count(*) from (select public.readiness_signals(:'S1')) x), 1, 'their academy admin reads the signals (states only in the app)');
reset role;
select set_config('request.jwt.claim.sub', :'MENT_B', false); set role authenticated;
select t.fails(format('select public.readiness_signals(%L)', :'S1'), 'another academy''s mentor cannot');
reset role;
select set_config('request.jwt.claim.sub', :'ADMIN_B', false); set role authenticated;
select t.fails(format('select public.readiness_signals(%L)', :'S1'), 'another academy''s admin cannot');
reset role;
\echo
\echo ALL CHECKS PASSED
