-- SSB Academy — T105: onboarding preferences + diagnostic baseline (PRD §9.1–9.3,
-- FR-ONB-01/02, FR-PLAN-01). Run once in the Supabase SQL Editor, AFTER 0020.
--
--  * Onboarding moves from the browser into the account: entry scheme, target
--    SSB date, self-reported preparation stage, preferred language and daily
--    study time — editable any time (PRD §9.2).
--  * A short, low-anxiety diagnostic: 8 multiple-choice questions (SSB
--    knowledge and reasoning, scored here) and 4 short written answers
--    (communication, situational reasoning, self-awareness — AI feedback,
--    rubric 'diagnostic' v1). The FIRST attempt is the baseline and can never
--    change; later attempts are re-assessments stored separately, so before
--    and after can be compared honestly.
--  * The roadmap is computed by the app from these and the readiness profile
--    (lib/server/roadmap), so it recalculates whenever new evidence arrives.

alter table public.student_profiles
  add column entry_scheme text,
  add column target_ssb_date date,
  add column preferred_language text not null default 'en',
  add column daily_study_minutes integer,
  add column onboarded_at timestamptz,
  add constraint student_profiles_scheme check (entry_scheme is null or entry_scheme in ('nda', 'cds', 'afcat', 'tes', 'tgc', 'ssc', 'ncc', 'other')),
  add constraint student_profiles_stage check (preparation_stage is null or preparation_stage in ('just_starting', 'in_progress', 'final_stretch')),
  add constraint student_profiles_language check (preferred_language in ('en', 'hi')),
  add constraint student_profiles_minutes check (daily_study_minutes is null or daily_study_minutes between 10 and 600),
  add constraint student_profiles_goals check (goals is null or char_length(goals) <= 500);

-- Mentors and academy admins may read a student's preferences (to guide them).
create policy "student_profiles_mentor_read" on public.student_profiles for select using (public.is_my_mentee(user_id));
create policy "student_profiles_admin_read" on public.student_profiles for select using (
  exists (select 1 from public.profiles p where p.id = user_id and p.academy_id is not null and p.academy_id = public.current_admin_academy_id())
);

create function public.save_student_preferences(
  p_entry_scheme text, p_target_date date, p_stage text, p_language text, p_daily_minutes integer, p_goals text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.current_user_role() <> 'student' then
    raise exception 'only a student has preparation preferences' using errcode = '42501';
  end if;
  if p_target_date is not null and (p_target_date < current_date or p_target_date > current_date + 730) then
    raise exception 'target date must be within the next two years' using errcode = '23514';
  end if;
  insert into public.student_profiles (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  update public.student_profiles
  set entry_scheme = p_entry_scheme, target_ssb_date = p_target_date, preparation_stage = p_stage,
      preferred_language = coalesce(p_language, 'en'), daily_study_minutes = p_daily_minutes,
      goals = nullif(btrim(coalesce(p_goals, '')), ''),
      onboarded_at = coalesce(onboarded_at, now()), updated_at = now()
  where user_id = auth.uid();
end;
$$;

revoke execute on function public.save_student_preferences(text, date, text, text, integer, text) from public, anon;
grant execute on function public.save_student_preferences(text, date, text, text, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Diagnostic content (platform content, editable in Practice Banks)
-- ---------------------------------------------------------------------------

insert into public.practice_banks (slug, title, item_kind) values
  ('diagnostic-mcq', 'Diagnostic — knowledge and reasoning', 'mcq'),
  ('diagnostic-written', 'Diagnostic — short written answers', 'response');

-- Keys say what each item measures: dk- SSB knowledge, dr- reasoning,
-- dw-comm communication, dw-sit situational reasoning, dw-self self-awareness.
insert into public.practice_items (bank_slug, key, position, prompt, options, correct_option_id) values
  ('diagnostic-mcq', 'dk-1', 1, 'What does SSB stand for?', '[{"id":"dk-1-a","label":"Services Selection Board"},{"id":"dk-1-b","label":"Staff Selection Board"},{"id":"dk-1-c","label":"Service Screening Bureau"},{"id":"dk-1-d","label":"Senior Selection Board"}]', 'dk-1-a'),
  ('diagnostic-mcq', 'dk-2', 2, 'How many days does the SSB interview usually run?', '[{"id":"dk-2-a","label":"3 days"},{"id":"dk-2-b","label":"5 days"},{"id":"dk-2-c","label":"7 days"},{"id":"dk-2-d","label":"10 days"}]', 'dk-2-b'),
  ('diagnostic-mcq', 'dk-3', 3, 'Which tests make up screening on Day 1?', '[{"id":"dk-3-a","label":"GTO tasks"},{"id":"dk-3-b","label":"The personal interview"},{"id":"dk-3-c","label":"OIR test and PPDT"},{"id":"dk-3-d","label":"The conference"}]', 'dk-3-c'),
  ('diagnostic-mcq', 'dk-4', 4, 'Who conducts the personal interview at the SSB?', '[{"id":"dk-4-a","label":"The Group Testing Officer"},{"id":"dk-4-b","label":"The Interviewing Officer"},{"id":"dk-4-c","label":"The Psychologist"},{"id":"dk-4-d","label":"Another candidate"}]', 'dk-4-b'),
  ('diagnostic-mcq', 'dr-1', 5, 'Find the next number: 3, 6, 12, 24, ?', '[{"id":"dr-1-a","label":"30"},{"id":"dr-1-b","label":"36"},{"id":"dr-1-c","label":"48"},{"id":"dr-1-d","label":"72"}]', 'dr-1-c'),
  ('diagnostic-mcq', 'dr-2', 6, 'Book is to reading as fork is to ____', '[{"id":"dr-2-a","label":"Kitchen"},{"id":"dr-2-b","label":"Eating"},{"id":"dr-2-c","label":"Spoon"},{"id":"dr-2-d","label":"Metal"}]', 'dr-2-b'),
  ('diagnostic-mcq', 'dr-3', 7, 'All cadets are trainees, and some trainees are pilots. Which statement is certainly true?', '[{"id":"dr-3-a","label":"Some cadets are pilots"},{"id":"dr-3-b","label":"All pilots are cadets"},{"id":"dr-3-c","label":"All cadets are trainees"},{"id":"dr-3-d","label":"No cadet is a pilot"}]', 'dr-3-c'),
  ('diagnostic-mcq', 'dr-4', 8, 'A clock shows 3:15. What is the angle between the hour and minute hands?', '[{"id":"dr-4-a","label":"0°"},{"id":"dr-4-b","label":"7.5°"},{"id":"dr-4-c","label":"15°"},{"id":"dr-4-d","label":"90°"}]', 'dr-4-b');

insert into public.practice_items (bank_slug, key, position, prompt) values
  ('diagnostic-written', 'dw-comm-1', 1, 'In a few sentences, tell us why you want to join the Armed Forces.'),
  ('diagnostic-written', 'dw-sit-1', 2, 'You are leading a group trek and one member twists an ankle far from the road. What do you do?'),
  ('diagnostic-written', 'dw-sit-2', 3, 'A friend asks you to help them copy in an exam. What do you do?'),
  ('diagnostic-written', 'dw-self-1', 4, 'Name one thing you do well and one thing you are working to improve, with an example of each.');

-- ---------------------------------------------------------------------------
-- Attempts: the first is the immutable baseline
-- ---------------------------------------------------------------------------

create type public.diagnostic_kind as enum ('baseline', 'reassessment');

create table public.diagnostic_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  kind public.diagnostic_kind not null,
  -- [{"key", "prompt", "section", "optionId"?, "correct"?, "response"?}] — questions snapshotted.
  answers jsonb not null,
  -- {"knowledge": {"correct", "total"}, "reasoning": {"correct", "total"}}
  sections jsonb not null,
  submitted_at timestamptz not null default now(),
  constraint diagnostic_answers check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) <= 40)
);

create unique index diagnostic_one_baseline on public.diagnostic_attempts (student_id) where kind = 'baseline';
create index diagnostic_student_idx on public.diagnostic_attempts (student_id, submitted_at desc);

alter table public.diagnostic_attempts enable row level security;
create policy "diagnostic_own_read" on public.diagnostic_attempts for select using (student_id = auth.uid());
create policy "diagnostic_mentor_read" on public.diagnostic_attempts for select using (public.is_my_mentee(student_id));
-- Nobody edits or deletes an attempt: the baseline stays the baseline.
revoke insert, update, delete on public.diagnostic_attempts from authenticated, anon;
grant select on public.diagnostic_attempts to authenticated;

create function public.submit_diagnostic(p_answers jsonb)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  last_at timestamptz;
  the_kind public.diagnostic_kind;
  snap jsonb;
  written jsonb;
  attempt uuid;
begin
  if me is null or public.current_user_role() <> 'student' then
    raise exception 'only a student takes the diagnostic' using errcode = '42501';
  end if;
  if jsonb_typeof(p_answers) <> 'array' then
    raise exception 'answers must be a list' using errcode = '23514';
  end if;
  select max(submitted_at) into last_at from public.diagnostic_attempts where student_id = me;
  if last_at is not null and last_at > now() - interval '7 days' then
    raise exception 'you can retake the diagnostic once a week' using errcode = '23514';
  end if;
  the_kind := case when last_at is null then 'baseline' else 'reassessment' end;

  -- Every current diagnostic item, with this student's answer (blank if none).
  select jsonb_agg(jsonb_build_object(
           'key', i.key, 'prompt', i.prompt,
           'section', case when i.key like 'dk-%' then 'knowledge' when i.key like 'dr-%' then 'reasoning'
                           when i.key like 'dw-comm%' then 'communication' when i.key like 'dw-sit%' then 'situational_reasoning' else 'self_awareness' end)
         || case when i.bank_slug = 'diagnostic-mcq'
                 then jsonb_build_object('optionId', a.value->>'optionId', 'correct', coalesce(a.value->>'optionId' = i.correct_option_id, false))
                 else jsonb_build_object('response', left(coalesce(a.value->>'response', ''), 2000)) end
         order by i.bank_slug, i.position)
  into snap
  from public.practice_items i
  left join lateral (select x as value from jsonb_array_elements(p_answers) x where x->>'key' = i.key limit 1) a on true
  where i.bank_slug in ('diagnostic-mcq', 'diagnostic-written') and i.active;

  if snap is null then
    raise exception 'the diagnostic is not available' using errcode = 'P0002';
  end if;

  insert into public.diagnostic_attempts (student_id, kind, answers, sections)
  values (me, the_kind, snap, jsonb_build_object(
    'knowledge', jsonb_build_object('correct', (select count(*) from jsonb_array_elements(snap) x where x->>'section' = 'knowledge' and (x->>'correct')::boolean),
                                    'total', (select count(*) from jsonb_array_elements(snap) x where x->>'section' = 'knowledge')),
    'reasoning', jsonb_build_object('correct', (select count(*) from jsonb_array_elements(snap) x where x->>'section' = 'reasoning' and (x->>'correct')::boolean),
                                    'total', (select count(*) from jsonb_array_elements(snap) x where x->>'section' = 'reasoning'))))
  returning id into attempt;

  select jsonb_agg(jsonb_build_object('prompt', x->>'prompt', 'response', x->>'response') order by x->>'key')
  into written
  from jsonb_array_elements(snap) x where x ? 'response';
  if exists (select 1 from jsonb_array_elements(coalesce(written, '[]')) w where btrim(w->>'response') <> '') then
    perform public.enqueue_ai_evaluation('diagnostic_attempt', attempt, me, 'diagnostic', 1, jsonb_build_object('items', written, 'context', jsonb_build_object('kind', the_kind)));
  end if;
  return attempt;
end;
$$;

revoke execute on function public.submit_diagnostic(jsonb) from public, anon;
grant execute on function public.submit_diagnostic(jsonb) to authenticated;

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
  elsif new.subject_type = 'diagnostic_attempt' then
    perform public.notify(new.student_id, 'ai_feedback_ready', 'Your diagnostic feedback is ready',
      'Starting-point diagnostic', '/student/diagnostic/' || new.subject_id, new.id);
  end if;
  return new;
end;
$$;
