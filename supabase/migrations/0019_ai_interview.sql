-- SSB Academy — T103: AI interview with dynamic follow-ups (PRD §11.1, FR-INT-01/02).
-- Run once in the Supabase SQL Editor, AFTER 0018.
--
--  * A session is a sequence of turns (question → answer). After each answer
--    the worker writes the next question, chosen from what the student just
--    said (clarification, evidence, depth, consistency, reflection) or a new
--    topic. After the last answer it writes structured feedback (rubric
--    'interview' v1), stored as an ordinary ai_evaluation.
--  * The AI never blocks practice: if a question can't be generated, the next
--    question comes from the interview bank instead — automatically when the
--    job gives up, or when the student chooses "Skip to the next question".
--  * Students write only through the functions below; reads follow the usual
--    rule (the student, and the mentors of their batch).
--  * New AI jobs wake the worker immediately (pg_notify), so a follow-up
--    doesn't wait for the next poll.

create type public.interview_mode as enum ('guided', 'topic', 'mock');
create type public.interview_status as enum ('active', 'completed');
create type public.interview_turn_kind as enum ('opening', 'follow_up', 'new_topic', 'bank');
create type public.interview_follow_up as enum ('clarification', 'evidence', 'depth', 'consistency', 'reflection');

-- Topic practice: the student picks one; the opening question comes from here.
create table public.interview_topics (
  slug text primary key,
  title text not null,
  opening_question text not null,
  position integer not null,
  constraint interview_topics_slug check (slug ~ '^[a-z0-9-]{2,40}$')
);

insert into public.interview_topics (slug, title, opening_question, position) values
  ('motivation', 'Why the Armed Forces', 'Why do you want to join the Armed Forces?', 1),
  ('family', 'Family and background', 'Tell us about your family and how you grew up.', 2),
  ('education', 'Education', 'Tell us about your studies so far and what you enjoyed most.', 3),
  ('responsibility', 'Responsibilities and leadership', 'Tell us about a responsibility you have taken on recently.', 4),
  ('hobbies', 'Hobbies and sports', 'What do you do in your free time, and how did you get into it?', 5),
  ('friends', 'Friends and teamwork', 'Tell us about your friends and what you do together.', 6),
  ('current-affairs', 'Current affairs', 'Which recent event in India or the world have you followed closely, and why?', 7);

alter table public.interview_topics enable row level security;
create policy "interview_topics_read" on public.interview_topics for select using (auth.uid() is not null);
revoke insert, update, delete on public.interview_topics from authenticated, anon;
grant select on public.interview_topics to authenticated;

create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  mode public.interview_mode not null,
  topic_slug text references public.interview_topics(slug),
  max_questions integer not null,
  -- Optional PIQ details the student chose to share for this session only.
  context jsonb not null default '{}'::jsonb,
  status public.interview_status not null default 'active',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint interview_sessions_topic check ((mode = 'topic') = (topic_slug is not null)),
  constraint interview_sessions_max check (max_questions between 3 and 12),
  constraint interview_sessions_context check (jsonb_typeof(context) = 'object' and pg_column_size(context) < 8000)
);

create index interview_sessions_student_idx on public.interview_sessions (student_id, created_at desc);

create table public.interview_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  seq integer not null,
  question text not null,
  kind public.interview_turn_kind not null,
  follow_up_type public.interview_follow_up,
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint interview_turns_seq unique (session_id, seq),
  constraint interview_turns_question check (char_length(btrim(question)) between 5 and 400),
  constraint interview_turns_answer check (answer is null or char_length(answer) <= 3000),
  constraint interview_turns_follow_up check ((kind = 'follow_up') = (follow_up_type is not null))
);

alter table public.interview_sessions enable row level security;
alter table public.interview_turns enable row level security;

create policy "interview_sessions_own_read" on public.interview_sessions for select using (student_id = auth.uid());
create policy "interview_sessions_mentor_read" on public.interview_sessions for select using (public.is_my_mentee(student_id));
create policy "interview_turns_read" on public.interview_turns for select using (
  exists (select 1 from public.interview_sessions s where s.id = session_id and (s.student_id = auth.uid() or public.is_my_mentee(s.student_id)))
);
revoke insert, update, delete on public.interview_sessions, public.interview_turns from authenticated, anon;
grant select on public.interview_sessions, public.interview_turns to authenticated;

-- AI jobs gain a kind: 'evaluation' (0017) or 'interview_question'.
alter table public.ai_jobs add column kind text not null default 'evaluation';
alter table public.ai_jobs add constraint ai_jobs_kind check (kind in ('evaluation', 'interview_question'));

-- Wake the worker as soon as a job is queued.
create function public.ai_jobs_wake()
returns trigger
language plpgsql
as $$
begin
  perform pg_notify('ai_jobs', new.id::text);
  return new;
end;
$$;

create trigger ai_jobs_wake after insert on public.ai_jobs
  for each row execute function public.ai_jobs_wake();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- The transcript the worker sees: every turn so far, plus the session settings.
create function public.interview_job_input(p_session uuid)
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select jsonb_build_object(
    'session', jsonb_build_object('mode', s.mode, 'topic', t.title, 'max_questions', s.max_questions, 'context', s.context),
    'items', coalesce((select jsonb_agg(jsonb_build_object('prompt', it.question, 'response', coalesce(it.answer, ''), 'kind', it.kind) order by it.seq)
                       from public.interview_turns it where it.session_id = s.id), '[]'::jsonb)
  )
  from public.interview_sessions s
  left join public.interview_topics t on t.slug = s.topic_slug
  where s.id = p_session;
$$;

-- Next question from the bank that this session hasn't asked yet.
create function public.interview_bank_question(p_session uuid)
returns text
language sql
stable
security definer set search_path = public
as $$
  select i.prompt from public.practice_items i
  where i.bank_slug = 'interview' and i.active
    and not exists (select 1 from public.interview_turns t where t.session_id = p_session and t.question = i.prompt)
  order by i.position
  limit 1;
$$;

-- Append the next question (worker or bank), or finish the session when the
-- question budget is used up. Idempotent: only when the last turn is answered.
create function public.interview_append_question(p_session uuid, p_question text, p_kind public.interview_turn_kind, p_follow_up public.interview_follow_up)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  s public.interview_sessions%rowtype;
  last public.interview_turns%rowtype;
begin
  select * into s from public.interview_sessions where id = p_session for update;
  if not found or s.status <> 'active' then
    return false;
  end if;
  select * into last from public.interview_turns where session_id = p_session order by seq desc limit 1;
  if last.answered_at is null or last.seq >= s.max_questions then
    return false;
  end if;
  insert into public.interview_turns (session_id, seq, question, kind, follow_up_type)
  values (p_session, last.seq + 1, btrim(p_question), p_kind, case when p_kind = 'follow_up' then p_follow_up end);
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Student actions
-- ---------------------------------------------------------------------------

create function public.start_interview_session(p_mode public.interview_mode, p_topic text, p_context jsonb)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  sid uuid;
  opening text;
begin
  if me is null or public.current_user_role() <> 'student' then
    raise exception 'only a student can start an interview' using errcode = '42501';
  end if;
  if p_mode = 'topic' then
    select opening_question into opening from public.interview_topics where slug = p_topic;
    if opening is null then
      raise exception 'choose a topic' using errcode = '23514';
    end if;
  else
    -- "Tell us about yourself" opens guided and mock interviews.
    select prompt into opening from public.practice_items where bank_slug = 'interview' and key = 'int-1' and active;
    opening := coalesce(opening, (select prompt from public.practice_items where bank_slug = 'interview' and active order by position limit 1));
  end if;
  insert into public.interview_sessions (student_id, mode, topic_slug, max_questions, context)
  values (me, p_mode, case when p_mode = 'topic' then p_topic end, case p_mode when 'mock' then 8 else 5 end, coalesce(p_context, '{}'::jsonb))
  returning id into sid;
  insert into public.interview_turns (session_id, seq, question, kind) values (sid, 1, opening, 'opening');
  return sid;
end;
$$;

-- Save the answer to the current question, then queue the next question —
-- or, after the last one, the feedback.
create function public.answer_interview_turn(p_turn uuid, p_answer text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  t public.interview_turns%rowtype;
  s public.interview_sessions%rowtype;
begin
  select * into t from public.interview_turns where id = p_turn for update;
  select * into s from public.interview_sessions where id = t.session_id for update;
  if not found or s.student_id is distinct from auth.uid() then
    raise exception 'not your interview' using errcode = '42501';
  end if;
  if s.status <> 'active' or t.answered_at is not null
     or t.seq <> (select max(seq) from public.interview_turns where session_id = s.id) then
    raise exception 'this question is no longer open' using errcode = '23514';
  end if;
  update public.interview_turns set answer = left(coalesce(p_answer, ''), 3000), answered_at = now() where id = p_turn;

  if t.seq >= s.max_questions then
    update public.interview_sessions set status = 'completed', completed_at = now() where id = s.id;
    perform public.enqueue_ai_evaluation('interview_session', s.id, s.student_id, 'interview', 1, public.interview_job_input(s.id));
  else
    insert into public.ai_jobs (kind, subject_type, subject_id, student_id, rubric_id, rubric_version, input, max_attempts)
    values ('interview_question', 'interview_turn', t.id, s.student_id, 'interview-question', 1, public.interview_job_input(s.id), 2)
    on conflict (subject_type, subject_id, rubric_id, rubric_version) do nothing;
  end if;
end;
$$;

-- "Skip to the next question" when the AI is slow: take one from the bank.
create function public.skip_interview_wait(p_session uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  s public.interview_sessions%rowtype;
  q text;
begin
  select * into s from public.interview_sessions where id = p_session;
  if not found or s.student_id is distinct from auth.uid() then
    raise exception 'not your interview' using errcode = '42501';
  end if;
  q := public.interview_bank_question(p_session);
  if q is null then
    return false;
  end if;
  return public.interview_append_question(p_session, q, 'bank', null);
end;
$$;

-- ---------------------------------------------------------------------------
-- Worker side (internal)
-- ---------------------------------------------------------------------------

create function public.ai_complete_interview_question(p_job uuid, p_worker text, p_question text, p_kind public.interview_turn_kind, p_follow_up public.interview_follow_up)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  j public.ai_jobs%rowtype;
  sid uuid;
begin
  select * into j from public.ai_jobs where id = p_job for update;
  if not found or j.status <> 'running' or j.locked_by is distinct from p_worker or j.kind <> 'interview_question' then
    raise exception 'job % is not held by this worker', p_job using errcode = '55000';
  end if;
  select session_id into sid from public.interview_turns where id = j.subject_id;
  -- Only if the answer this question follows is still the latest turn: if the
  -- student skipped ahead in the meantime, the follow-up is stale and dropped.
  if (select id from public.interview_turns where session_id = sid order by seq desc limit 1) = j.subject_id then
    perform public.interview_append_question(sid, p_question, p_kind, p_follow_up);
  end if;
  update public.ai_jobs set status = 'succeeded', locked_at = null, locked_by = null, last_error_code = null, updated_at = now() where id = p_job;
end;
$$;

-- When a question job gives up, continue from the bank so practice never stops.
create function public.interview_fallback_on_dead()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  sid uuid;
  q text;
begin
  if new.kind = 'interview_question' and new.status = 'dead' and old.status <> 'dead' then
    select session_id into sid from public.interview_turns where id = new.subject_id;
    q := public.interview_bank_question(sid);
    if q is not null then
      perform public.interview_append_question(sid, q, 'bank', null);
    end if;
  end if;
  return new;
end;
$$;

create trigger ai_jobs_interview_fallback after update of status on public.ai_jobs
  for each row execute function public.interview_fallback_on_dead();

-- Feedback ready → notify, linking to the interview.
create or replace function public.notify_ai_feedback()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.subject_type = 'practice_attempt' and new.rubric_id like 'psychology-%' then
    perform public.notify(new.student_id, 'ai_feedback_ready', 'Your practice feedback is ready',
      upper(replace(new.rubric_id, 'psychology-', '')) || ' practice', '/student/practice/psychology/results/' || new.subject_id, new.id);
  elsif new.subject_type = 'interview_session' then
    perform public.notify(new.student_id, 'ai_feedback_ready', 'Your interview feedback is ready',
      'AI interview practice', '/student/practice/interview/ai/' || new.subject_id, new.id);
  end if;
  return new;
end;
$$;

revoke execute on function public.interview_job_input(uuid) from public, anon, authenticated;
revoke execute on function public.interview_bank_question(uuid) from public, anon, authenticated;
revoke execute on function public.interview_append_question(uuid, text, public.interview_turn_kind, public.interview_follow_up) from public, anon, authenticated;
revoke execute on function public.ai_complete_interview_question(uuid, text, text, public.interview_turn_kind, public.interview_follow_up) from public, anon, authenticated;
revoke execute on function public.start_interview_session(public.interview_mode, text, jsonb) from public, anon;
revoke execute on function public.answer_interview_turn(uuid, text) from public, anon;
revoke execute on function public.skip_interview_wait(uuid) from public, anon;
grant execute on function public.start_interview_session(public.interview_mode, text, jsonb) to authenticated;
grant execute on function public.answer_interview_turn(uuid, text) to authenticated;
grant execute on function public.skip_interview_wait(uuid) to authenticated;
