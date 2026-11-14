-- Realistic dashboard volume for profiling (LOCAL database only; run through seed-dashboard-load.mjs).
--
-- One academy with :students students in :batches batches taught by :mentors mentors, :aper published
-- assessments per batch (every student submits every one; about 80% are reviewed), ten sessions per batch
-- (eight past with attendance, two upcoming). With the defaults (300 / 12 / 8 / 6) that is 1,800 attempts,
-- about 1,440 reviewed scores, 120 sessions and 2,400 attendance rows: enough to show how the dashboards
-- behave as an academy grows, and to cross PostgREST's 1,000-row response limit.
--
-- Variables (psql -v): academy (uuid of an existing academy), stamp (unique text), students, batches,
-- mentors, aper. Triggers are switched off for the bulk inserts (no notification flood, no per-row checks);
-- the rows are built to satisfy the same rules those triggers enforce.
\set ON_ERROR_STOP on

begin;

-- Accounts: the signup trigger creates each profile (role and academy come from trusted app metadata).
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'load.mentor.' || :'stamp' || '.' || g || '@example.test', '', now(),
       jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'mentor', 'academy_id', :'academy'),
       jsonb_build_object('full_name', 'Load Mentor ' || g), now(), now()
from generate_series(1, :mentors) g;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'load.student.' || :'stamp' || '.' || g || '@example.test', '', now(),
       jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'student', 'academy_id', :'academy'),
       jsonb_build_object('full_name', 'Load Student ' || g), now(), now()
from generate_series(1, :students) g;

-- GoTrue cannot load users whose token columns are NULL (rows inserted by raw SQL); it expects ''.
update auth.users set confirmation_token = '', recovery_token = '', email_change_token_new = '', email_change = '',
  email_change_token_current = '', phone_change = '', phone_change_token = '', reauthentication_token = ''
where email like 'load.%.' || :'stamp' || '.%';

set local session_replication_role = replica;

insert into public.batches (academy_id, name, status, start_date)
select :'academy', 'Load Batch ' || :'stamp' || ' ' || lpad(g::text, 2, '0'), 'active', current_date - 60
from generate_series(1, :batches) g;

create temp table _m as
  select id, row_number() over (order by email) as rn
  from public.profiles where email like 'load.mentor.' || :'stamp' || '.%' and academy_id = :'academy';
create temp table _s as
  select id, row_number() over (order by email) as rn
  from public.profiles where email like 'load.student.' || :'stamp' || '.%' and academy_id = :'academy';
create temp table _b as
  select id, row_number() over (order by name) as rn
  from public.batches where academy_id = :'academy' and name like 'Load Batch ' || :'stamp' || ' %';

insert into public.batch_mentors (batch_id, mentor_id)
select b.id, m.id from _b b join _m m on m.rn = ((b.rn - 1) % :mentors) + 1;

insert into public.batch_students (batch_id, student_id)
select b.id, s.id from _s s join _b b on b.rn = ((s.rn - 1) % :batches) + 1;

insert into public.assessments (academy_id, batch_id, mentor_id, title, category, questions, max_score, status, published_at)
select :'academy', b.id, bm.mentor_id, 'Load Assessment ' || k || ' / ' || b.rn,
       (array['psychology', 'gto', 'interview', 'communication', 'current_affairs', 'general'])[((k - 1) % 6) + 1]::public.content_category,
       '[{"q":"one"},{"q":"two"},{"q":"three"}]'::jsonb, 10, 'published', now() - (k * 3 || ' days')::interval
from _b b join public.batch_mentors bm on bm.batch_id = b.id cross join generate_series(1, :aper) k;

insert into public.assessment_attempts (assessment_id, student_id, answers, status, submitted_at)
select a.id, bs.student_id, '[]'::jsonb, 'submitted', a.published_at + (random() * interval '2 days')
from public.assessments a join public.batch_students bs on bs.batch_id = a.batch_id
where a.academy_id = :'academy' and a.title like 'Load Assessment %';

insert into public.feedback (attempt_id, mentor_id, score, strengths, improvement_areas, comments, status, reviewed_at)
select t.id, a.mentor_id, round((3 + random() * 7)::numeric, 2), 'Clear and structured.', 'Add more concrete examples.', 'Good attempt.', 'reviewed',
       t.submitted_at + interval '1 day'
from public.assessment_attempts t join public.assessments a on a.id = t.assessment_id
where a.academy_id = :'academy' and a.title like 'Load Assessment %' and random() < 0.8;

-- Sessions: eight past (completed), two upcoming per batch; upcoming ones on distinct days so no mentor overlaps.
insert into public.sessions (academy_id, batch_id, mentor_id, title, starts_at, ends_at, mode, meeting_url, for_whole_batch, status, created_by)
select :'academy', b.id, bm.mentor_id, 'Load Session ' || j,
       date_trunc('hour', now()) - (j * 4 || ' days')::interval - (b.rn || ' hours')::interval,
       date_trunc('hour', now()) - (j * 4 || ' days')::interval - (b.rn || ' hours')::interval + interval '1 hour',
       'online', 'https://meet.example.test/load', true, 'completed', bm.mentor_id
from _b b join public.batch_mentors bm on bm.batch_id = b.id cross join generate_series(1, 8) j;

insert into public.sessions (academy_id, batch_id, mentor_id, title, starts_at, ends_at, mode, meeting_url, for_whole_batch, status, created_by)
select :'academy', b.id, bm.mentor_id, 'Load Upcoming ' || j,
       date_trunc('hour', now()) + ((b.rn * 2 + j) || ' days')::interval,
       date_trunc('hour', now()) + ((b.rn * 2 + j) || ' days')::interval + interval '1 hour',
       'online', 'https://meet.example.test/load', true, 'scheduled', bm.mentor_id
from _b b join public.batch_mentors bm on bm.batch_id = b.id cross join generate_series(1, 2) j;

insert into public.session_attendance (session_id, student_id, status, marked_by)
select se.id, bs.student_id,
       (case when r < 0.8 then 'present' when r < 0.95 then 'absent' else 'excused' end)::public.attendance_status, se.mentor_id
from (select se.*, random() as r from public.sessions se) se
join public.batch_students bs on bs.batch_id = se.batch_id
where se.academy_id = :'academy' and se.title like 'Load Session %' and se.status = 'completed';

commit;

analyze;

select 'students' as what, count(*) from _s union all
select 'mentors', count(*) from _m union all
select 'batches', count(*) from _b union all
select 'assessments', count(*) from public.assessments where academy_id = :'academy' and title like 'Load Assessment %' union all
select 'attempts', count(*) from public.assessment_attempts t join public.assessments a on a.id = t.assessment_id where a.academy_id = :'academy' and a.title like 'Load Assessment %' union all
select 'reviewed scores', count(*) from public.student_scores sc join public.assessments a on a.id = sc.assessment_id where a.academy_id = :'academy' and a.title like 'Load Assessment %' union all
select 'sessions', count(*) from public.sessions where academy_id = :'academy' and title like 'Load %' union all
select 'attendance rows', count(*) from public.session_attendance sa join public.sessions s on s.id = sa.session_id where s.academy_id = :'academy' and s.title like 'Load Session %';
