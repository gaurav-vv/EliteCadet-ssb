-- SSB Academy — T083b: practice banks and saved practice.
-- Run once in the Supabase SQL Editor, AFTER 0004–0013.
--
-- Design notes
--  * The question banks (TAT/WAT/SRT/SDT, OIR, PPDT, interview, conference)
--    move from code into practice_banks / practice_items. Only a super admin
--    edits them; items are deactivated, never deleted, so saved answers keep
--    their question. The seed at the end is the exact content the app shipped
--    with — platform content, not user data.
--  * practice_answers: one row per student per question for self-paced
--    practice (text or chosen option, self-review ticks, done).
--    practice_attempts: one row per timed test or mock interview/conference
--    run, idempotent on (student, client_key); MCQ is scored here, never by
--    the browser.
--  * Who reads answers (decided 2026-10-08): the student and the mentors of
--    their batch. Academy admins and super admins get counts only, through
--    practice_stats().

create type public.practice_item_kind as enum ('response', 'mcq');
create type public.practice_attempt_mode as enum ('test', 'mock');

create table public.practice_banks (
  slug text primary key,
  title text not null,
  item_kind public.practice_item_kind not null,
  created_at timestamptz not null default now(),
  constraint practice_banks_slug check (slug ~ '^[a-z0-9-]{2,40}$')
);

create table public.practice_items (
  id uuid primary key default gen_random_uuid(),
  bank_slug text not null references public.practice_banks(slug),
  -- Stable, human-readable id (e.g. 'tat-13'); app config refers to it.
  key text not null default ('item-' || substr(md5(random()::text), 1, 10)),
  position integer not null,  -- next free position when omitted (trigger)
  prompt text not null,
  options jsonb,
  correct_option_id text,
  guidance jsonb,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practice_items_key unique (bank_slug, key),
  constraint practice_items_position unique (bank_slug, position) deferrable initially deferred,
  constraint practice_items_prompt check (char_length(btrim(prompt)) between 1 and 2000)
);

create index practice_items_bank_idx on public.practice_items (bank_slug, position);

-- Item shape per bank kind: MCQ needs 2–6 options and a correct one among
-- them; free-text items have neither. Guidance is {assesses, tips[]}.
create function public.check_practice_item()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  kind public.practice_item_kind;
begin
  select item_kind into kind from public.practice_banks where slug = new.bank_slug;
  if new.position is null then
    select coalesce(max(position), 0) + 1 into new.position from public.practice_items where bank_slug = new.bank_slug;
  end if;
  if kind = 'mcq' then
    if jsonb_typeof(new.options) is distinct from 'array'
      or jsonb_array_length(new.options) not between 2 and 6
      or exists (select 1 from jsonb_array_elements(new.options) o where jsonb_typeof(o->'id') <> 'string' or coalesce(btrim(o->>'label'), '') = '')
      or not exists (select 1 from jsonb_array_elements(new.options) o where o->>'id' = new.correct_option_id)
    then
      raise exception 'a multiple-choice item needs 2-6 labelled options and a correct option among them' using errcode = '23514';
    end if;
  elsif new.options is not null or new.correct_option_id is not null then
    raise exception 'a free-text item has no options' using errcode = '23514';
  end if;
  if new.guidance is not null and (
    jsonb_typeof(new.guidance) <> 'object'
    or coalesce(btrim(new.guidance->>'assesses'), '') = ''
    or jsonb_typeof(new.guidance->'tips') is distinct from 'array'
  ) then
    raise exception 'guidance needs what it assesses and a list of tips' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger practice_items_check before insert or update on public.practice_items
  for each row execute function public.check_practice_item();

alter table public.practice_banks enable row level security;
alter table public.practice_items enable row level security;

create policy "practice_banks_read" on public.practice_banks for select using (auth.uid() is not null);
create policy "practice_items_read_active" on public.practice_items for select using (auth.uid() is not null and active);
create policy "practice_items_super_read" on public.practice_items for select using (public.is_super_admin());
create policy "practice_items_super_insert" on public.practice_items
  for insert with check (public.is_super_admin() and created_by = auth.uid());
create policy "practice_items_super_update" on public.practice_items
  for update using (public.is_super_admin()) with check (public.is_super_admin());
revoke delete on public.practice_items from authenticated, anon;

-- Reorder: swap an item with its neighbour, atomically (super admin only).
create function public.practice_move_item(p_item uuid, p_direction integer)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  me public.practice_items%rowtype;
  other public.practice_items%rowtype;
begin
  if not public.is_super_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into me from public.practice_items where id = p_item;
  if not found then
    raise exception 'no such item' using errcode = 'P0002';
  end if;
  if p_direction < 0 then
    select * into other from public.practice_items where bank_slug = me.bank_slug and position < me.position order by position desc limit 1;
  else
    select * into other from public.practice_items where bank_slug = me.bank_slug and position > me.position order by position asc limit 1;
  end if;
  if not found then
    return;
  end if;
  update public.practice_items
  set position = case when id = me.id then other.position else me.position end, updated_by = auth.uid()
  where id in (me.id, other.id);
end;
$$;

revoke execute on function public.practice_move_item(uuid, integer) from public, anon;
grant execute on function public.practice_move_item(uuid, integer) to authenticated;
revoke insert, update, delete on public.practice_banks from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Saved practice
-- ---------------------------------------------------------------------------

-- The caller mentors a batch this student is in.
create function public.is_my_mentee(p_student uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.batch_students bs
    join public.batch_mentors bm on bm.batch_id = bs.batch_id
    where bs.student_id = p_student and bm.mentor_id = auth.uid()
  )
$$;

create table public.practice_answers (
  student_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.practice_items(id) on delete cascade,
  answer_text text,
  selected_option_id text,
  self_review text[] not null default '{}',
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (student_id, item_id),
  constraint practice_answers_text check (answer_text is null or char_length(answer_text) <= 5000),
  constraint practice_answers_review check (cardinality(self_review) <= 20)
);

create index practice_answers_student_idx on public.practice_answers (student_id, updated_at desc);

create function public.touch_practice_answer()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger practice_answers_touch before insert or update on public.practice_answers
  for each row execute function public.touch_practice_answer();

create table public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  bank_slug text not null references public.practice_banks(slug),
  mode public.practice_attempt_mode not null,
  -- Generated by the browser once per run: a retried submit can't duplicate.
  client_key text not null,
  -- [{ "itemId": uuid, "prompt": text, "response": text } | { "itemId": uuid, "optionId": text }]
  answers jsonb not null,
  self_review jsonb not null default '{}'::jsonb,
  correct integer,
  total integer not null default 0,
  submitted_at timestamptz not null default now(),
  constraint practice_attempts_once unique (student_id, client_key),
  constraint practice_attempts_key check (char_length(client_key) between 8 and 80),
  constraint practice_attempts_answers check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) <= 200),
  constraint practice_attempts_review check (jsonb_typeof(self_review) = 'object')
);

create index practice_attempts_student_idx on public.practice_attempts (student_id, submitted_at desc);

-- Answers must belong to the bank; MCQ is scored here. Text is capped.
create function public.score_practice_attempt()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  kind public.practice_item_kind;
begin
  -- Each answer is for a question in this bank; a mock run may also carry
  -- the student's own PIQ-based questions, which have a prompt and no itemId.
  if exists (
    select 1 from jsonb_array_elements(new.answers) a
    where char_length(coalesce(a->>'response', '')) > 5000
       or (a ? 'itemId' and not exists (select 1 from public.practice_items i where i.id::text = a->>'itemId' and i.bank_slug = new.bank_slug))
       or (not a ? 'itemId' and (new.mode <> 'mock' or char_length(coalesce(btrim(a->>'prompt'), '')) not between 1 and 500))
  ) then
    raise exception 'answers must be for questions in this bank' using errcode = '23514';
  end if;
  select item_kind into kind from public.practice_banks where slug = new.bank_slug;
  new.total := jsonb_array_length(new.answers);
  if kind = 'mcq' then
    select count(*) into new.correct
    from jsonb_array_elements(new.answers) a
    join public.practice_items i on i.id::text = a->>'itemId'
    where a->>'optionId' = i.correct_option_id;
  else
    new.correct := null;
  end if;
  new.submitted_at := now();
  return new;
end;
$$;

create trigger practice_attempts_score before insert on public.practice_attempts
  for each row execute function public.score_practice_attempt();

alter table public.practice_answers enable row level security;
alter table public.practice_attempts enable row level security;

create policy "practice_answers_own" on public.practice_answers
  for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid() and public.current_user_role() = 'student');
create policy "practice_answers_mentor_read" on public.practice_answers
  for select using (public.is_my_mentee(student_id));

create policy "practice_attempts_own_read" on public.practice_attempts
  for select using (student_id = auth.uid());
create policy "practice_attempts_own_insert" on public.practice_attempts
  for insert with check (student_id = auth.uid() and public.current_user_role() = 'student');
create policy "practice_attempts_own_review" on public.practice_attempts
  for update using (student_id = auth.uid() and mode = 'mock') with check (student_id = auth.uid());
create policy "practice_attempts_mentor_read" on public.practice_attempts
  for select using (public.is_my_mentee(student_id));

-- After submit only the mock review ticks may change.
revoke update, delete on public.practice_attempts from authenticated, anon;
grant update (self_review) on public.practice_attempts to authenticated;

-- Counts only — for the student, their mentors, their academy's admins and
-- super admins. Anyone else gets nulls.
create function public.practice_stats(p_student uuid)
returns table (practice_done bigint, practice_tests bigint, last_practice_at timestamptz)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not (
    p_student = auth.uid()
    or public.is_my_mentee(p_student)
    or exists (select 1 from public.profiles p where p.id = p_student and p.academy_id is not null and p.academy_id = public.current_admin_academy_id())
    or public.is_super_admin()
  ) then
    return query select null::bigint, null::bigint, null::timestamptz;
    return;
  end if;
  return query
    select
      (select count(*) from public.practice_answers a where a.student_id = p_student and a.done),
      (select count(*) from public.practice_attempts t where t.student_id = p_student),
      greatest(
        (select max(a.updated_at) from public.practice_answers a where a.student_id = p_student and a.done),
        (select max(t.submitted_at) from public.practice_attempts t where t.student_id = p_student)
      );
end;
$$;

revoke execute on function public.practice_stats(uuid) from public, anon;
grant execute on function public.practice_stats(uuid) to authenticated;

-- student_progress (0012) gains the practice counts (new columns at the end).
create or replace view public.student_progress
with (security_invoker = true) as
  select
    p.id as student_id,
    p.academy_id,
    bs.batch_id,
    (select count(*) from public.student_scores sc where sc.student_id = p.id) as reviewed_count,
    (select round(avg(sc.score_pct), 1) from public.student_scores sc where sc.student_id = p.id) as avg_score_pct,
    (select count(*) from public.session_attendance a where a.student_id = p.id and a.status = 'present') as sessions_present,
    (select count(*) from public.session_attendance a where a.student_id = p.id and a.status = 'absent') as sessions_absent,
    (select count(*) from public.content_progress c where c.student_id = p.id) as content_completed,
    (select max(t.submitted_at) from public.assessment_attempts t where t.student_id = p.id and t.status = 'submitted') as last_submission_at,
    ps.practice_done,
    ps.practice_tests,
    ps.last_practice_at
  from public.profiles p
  left join public.batch_students bs on bs.student_id = p.id
  left join lateral public.practice_stats(p.id) ps on true
  where p.role = 'student';

grant select on public.practice_banks, public.practice_items, public.practice_answers, public.practice_attempts to authenticated;

-- ---------------------------------------------------------------------------
-- Seed: the banks the app shipped with (generated from the previous code).
-- ---------------------------------------------------------------------------

insert into public.practice_banks (slug, title, item_kind) values
  ('tat', 'TAT — Thematic Apperception Test', 'response'),
  ('wat', 'WAT — Word Association Test', 'response'),
  ('srt', 'SRT — Situation Reaction Test', 'response'),
  ('sdt', 'SDT — Self Description Test', 'response'),
  ('oir-verbal-practice', 'OIR — Verbal reasoning (practice)', 'mcq'),
  ('oir-verbal-test', 'OIR — Verbal reasoning (test)', 'mcq'),
  ('oir-nonverbal-practice', 'OIR — Non-verbal reasoning (practice)', 'mcq'),
  ('oir-nonverbal-test', 'OIR — Non-verbal reasoning (test)', 'mcq'),
  ('ppdt', 'PPDT — Picture Perception and Description', 'response'),
  ('interview', 'Personal interview questions', 'response'),
  ('conference', 'Conference questions', 'response');

insert into public.practice_items (bank_slug, key, position, prompt, options, correct_option_id, guidance) values
  ('tat', 'tat-1', 1, 'A young person stands at a doorway, looking out into a stormy night, with a lit lamp beside them.', null, null, null),
  ('tat', 'tat-2', 2, 'A group of people sit around a table, some pointing at documents, one person staring into the distance.', null, null, null),
  ('tat', 'tat-3', 3, 'A figure stands atop a hill, overlooking a village below at dawn.', null, null, null),
  ('tat', 'tat-4', 4, 'Two people sit facing each other across a desk; one is speaking, the other is silent, looking down.', null, null, null),
  ('tat', 'tat-5', 5, 'A crowd gathers near a building entrance; a few onlookers watch from windows above.', null, null, null),
  ('tat', 'tat-6', 6, 'A person kneels beside another who appears to have fallen, in an outdoor setting.', null, null, null),
  ('tat', 'tat-7', 7, 'A rope bridge stretches across a gorge; someone stands at the edge deciding whether to cross.', null, null, null),
  ('tat', 'tat-8', 8, 'A worker stands beside broken machinery in a workshop, looking uncertain.', null, null, null),
  ('tat', 'tat-9', 9, 'A parent and child sit together in a dim room, the child looking up expectantly.', null, null, null),
  ('tat', 'tat-10', 10, 'A soldier stands at attention before a senior officer inside a tent.', null, null, null),
  ('tat', 'tat-11', 11, 'A person is illuminated by a single window of light in an otherwise dark room, papers scattered on the floor.', null, null, null),
  ('tat', 'tat-12', 12, 'Several people wait in a line outside an office, with one person checking a watch impatiently.', null, null, null),
  ('tat', 'tat-13', 13, 'No picture is shown for this final story — imagine your own scene and write about it.', null, null, null);

insert into public.practice_items (bank_slug, key, position, prompt, options, correct_option_id, guidance) values
  ('wat', 'wat-1', 1, 'Duty', null, null, null),
  ('wat', 'wat-2', 2, 'Fear', null, null, null),
  ('wat', 'wat-3', 3, 'Friends', null, null, null),
  ('wat', 'wat-4', 4, 'Failure', null, null, null),
  ('wat', 'wat-5', 5, 'Success', null, null, null),
  ('wat', 'wat-6', 6, 'Leader', null, null, null),
  ('wat', 'wat-7', 7, 'Danger', null, null, null),
  ('wat', 'wat-8', 8, 'Family', null, null, null),
  ('wat', 'wat-9', 9, 'Death', null, null, null),
  ('wat', 'wat-10', 10, 'Courage', null, null, null),
  ('wat', 'wat-11', 11, 'Fight', null, null, null),
  ('wat', 'wat-12', 12, 'Help', null, null, null),
  ('wat', 'wat-13', 13, 'Team', null, null, null),
  ('wat', 'wat-14', 14, 'Weakness', null, null, null),
  ('wat', 'wat-15', 15, 'Strength', null, null, null),
  ('wat', 'wat-16', 16, 'Enemy', null, null, null),
  ('wat', 'wat-17', 17, 'Discipline', null, null, null),
  ('wat', 'wat-18', 18, 'Honesty', null, null, null),
  ('wat', 'wat-19', 19, 'Trust', null, null, null),
  ('wat', 'wat-20', 20, 'Betrayal', null, null, null),
  ('wat', 'wat-21', 21, 'Sacrifice', null, null, null),
  ('wat', 'wat-22', 22, 'Ambition', null, null, null),
  ('wat', 'wat-23', 23, 'Justice', null, null, null),
  ('wat', 'wat-24', 24, 'Anger', null, null, null),
  ('wat', 'wat-25', 25, 'Patience', null, null, null),
  ('wat', 'wat-26', 26, 'Confidence', null, null, null),
  ('wat', 'wat-27', 27, 'Loyalty', null, null, null),
  ('wat', 'wat-28', 28, 'Responsibility', null, null, null),
  ('wat', 'wat-29', 29, 'Freedom', null, null, null),
  ('wat', 'wat-30', 30, 'Risk', null, null, null),
  ('wat', 'wat-31', 31, 'Victory', null, null, null),
  ('wat', 'wat-32', 32, 'Defeat', null, null, null),
  ('wat', 'wat-33', 33, 'Hope', null, null, null),
  ('wat', 'wat-34', 34, 'Doubt', null, null, null),
  ('wat', 'wat-35', 35, 'Bravery', null, null, null),
  ('wat', 'wat-36', 36, 'Panic', null, null, null),
  ('wat', 'wat-37', 37, 'Order', null, null, null),
  ('wat', 'wat-38', 38, 'Rules', null, null, null),
  ('wat', 'wat-39', 39, 'Command', null, null, null),
  ('wat', 'wat-40', 40, 'Obedience', null, null, null),
  ('wat', 'wat-41', 41, 'Rebellion', null, null, null),
  ('wat', 'wat-42', 42, 'Peace', null, null, null),
  ('wat', 'wat-43', 43, 'War', null, null, null),
  ('wat', 'wat-44', 44, 'Nation', null, null, null),
  ('wat', 'wat-45', 45, 'Soldier', null, null, null),
  ('wat', 'wat-46', 46, 'Officer', null, null, null),
  ('wat', 'wat-47', 47, 'Mission', null, null, null),
  ('wat', 'wat-48', 48, 'Plan', null, null, null),
  ('wat', 'wat-49', 49, 'Crisis', null, null, null),
  ('wat', 'wat-50', 50, 'Decision', null, null, null),
  ('wat', 'wat-51', 51, 'Truth', null, null, null),
  ('wat', 'wat-52', 52, 'Lie', null, null, null),
  ('wat', 'wat-53', 53, 'Praise', null, null, null),
  ('wat', 'wat-54', 54, 'Criticism', null, null, null),
  ('wat', 'wat-55', 55, 'Change', null, null, null),
  ('wat', 'wat-56', 56, 'Challenge', null, null, null),
  ('wat', 'wat-57', 57, 'Opportunity', null, null, null),
  ('wat', 'wat-58', 58, 'Sorrow', null, null, null),
  ('wat', 'wat-59', 59, 'Joy', null, null, null),
  ('wat', 'wat-60', 60, 'Pride', null, null, null);

insert into public.practice_items (bank_slug, key, position, prompt, options, correct_option_id, guidance) values
  ('srt', 'srt-1', 1, 'You are walking alone at night when you notice someone following you.', null, null, null),
  ('srt', 'srt-2', 2, 'Your friend is caught cheating in an exam and asks you not to tell anyone.', null, null, null),
  ('srt', 'srt-3', 3, 'You see a fire breaking out in a neighboring house.', null, null, null),
  ('srt', 'srt-4', 4, 'Your team loses an important match because of your mistake.', null, null, null),
  ('srt', 'srt-5', 5, 'You find a wallet full of cash on the road.', null, null, null),
  ('srt', 'srt-6', 6, 'Your junior refuses to follow your instructions during a task.', null, null, null),
  ('srt', 'srt-7', 7, 'You are stuck in a traffic jam and late for an important interview.', null, null, null),
  ('srt', 'srt-8', 8, 'A stranger asks you for directions to a place you don''t know.', null, null, null),
  ('srt', 'srt-9', 9, 'Your best friend borrows money and forgets to return it.', null, null, null),
  ('srt', 'srt-10', 10, 'You witness a road accident while driving to work.', null, null, null),
  ('srt', 'srt-11', 11, 'Your boss assigns you a task with an unrealistic deadline.', null, null, null),
  ('srt', 'srt-12', 12, 'You see a child crying alone in a crowded market.', null, null, null),
  ('srt', 'srt-13', 13, 'Your phone battery dies just before an important call.', null, null, null),
  ('srt', 'srt-14', 14, 'A colleague takes credit for your idea in front of everyone.', null, null, null),
  ('srt', 'srt-15', 15, 'You are asked to lead a group of strangers on a trek.', null, null, null),
  ('srt', 'srt-16', 16, 'Your vehicle breaks down on a deserted highway at night.', null, null, null),
  ('srt', 'srt-17', 17, 'You find out a close friend has been lying to you.', null, null, null),
  ('srt', 'srt-18', 18, 'Your team disagrees with your plan during a group task.', null, null, null),
  ('srt', 'srt-19', 19, 'You are the only one who knows how to fix a critical problem at work.', null, null, null),
  ('srt', 'srt-20', 20, 'A younger sibling looks up to you for advice on a tough decision.', null, null, null),
  ('srt', 'srt-21', 21, 'You are blamed for something you did not do.', null, null, null),
  ('srt', 'srt-22', 22, 'Your flight gets cancelled and you must reach your destination urgently.', null, null, null),
  ('srt', 'srt-23', 23, 'You see someone shoplifting in a store.', null, null, null),
  ('srt', 'srt-24', 24, 'Your group is lost while trekking in unfamiliar terrain.', null, null, null),
  ('srt', 'srt-25', 25, 'A friend confides in you about a serious personal problem.', null, null, null),
  ('srt', 'srt-26', 26, 'You are given charge of a task you have never done before.', null, null, null),
  ('srt', 'srt-27', 27, 'Your subordinate makes a costly mistake during an important project.', null, null, null),
  ('srt', 'srt-28', 28, 'You overhear a plan that could harm someone if not stopped.', null, null, null),
  ('srt', 'srt-29', 29, 'Your close friend is being bullied by a group of people.', null, null, null),
  ('srt', 'srt-30', 30, 'You are asked to make a quick decision with incomplete information.', null, null, null),
  ('srt', 'srt-31', 31, 'Your team''s morale is low after a series of failures.', null, null, null),
  ('srt', 'srt-32', 32, 'You see an elderly person struggling to cross a busy road.', null, null, null),
  ('srt', 'srt-33', 33, 'Your plans for the day are disrupted by unexpected heavy rain.', null, null, null),
  ('srt', 'srt-34', 34, 'A new member joins your team and struggles to fit in.', null, null, null),
  ('srt', 'srt-35', 35, 'You realize you made an error in an important report just before submission.', null, null, null),
  ('srt', 'srt-36', 36, 'Your neighbor''s house is being burgled while they are away.', null, null, null),
  ('srt', 'srt-37', 37, 'You are asked to resolve a conflict between two close friends.', null, null, null),
  ('srt', 'srt-38', 38, 'Your resources are insufficient to complete an assigned task on time.', null, null, null),
  ('srt', 'srt-39', 39, 'You find a group of people arguing loudly in a public place.', null, null, null),
  ('srt', 'srt-40', 40, 'Your senior gives you feedback that feels unfair.', null, null, null),
  ('srt', 'srt-41', 41, 'You must choose between helping a friend and completing your own work.', null, null, null),
  ('srt', 'srt-42', 42, 'A stranger collapses in front of you on the street.', null, null, null),
  ('srt', 'srt-43', 43, 'Your team member is injured during an outdoor exercise.', null, null, null),
  ('srt', 'srt-44', 44, 'You are put in charge during an emergency with no clear instructions.', null, null, null),
  ('srt', 'srt-45', 45, 'Your request for leave is denied just before a family emergency.', null, null, null),
  ('srt', 'srt-46', 46, 'You notice a safety hazard that others have ignored.', null, null, null),
  ('srt', 'srt-47', 47, 'A friend asks you to cover for their mistake.', null, null, null),
  ('srt', 'srt-48', 48, 'You are stranded with your group due to a sudden weather change.', null, null, null),
  ('srt', 'srt-49', 49, 'Your work is criticized publicly by someone senior to you.', null, null, null),
  ('srt', 'srt-50', 50, 'You must convince a reluctant team to follow a new plan.', null, null, null),
  ('srt', 'srt-51', 51, 'Your effort goes unnoticed while someone else gets the credit.', null, null, null),
  ('srt', 'srt-52', 52, 'You find an unattended bag in a crowded place.', null, null, null),
  ('srt', 'srt-53', 53, 'A close relative needs urgent help while you are away from home.', null, null, null),
  ('srt', 'srt-54', 54, 'Your team is split on an important decision and time is running out.', null, null, null),
  ('srt', 'srt-55', 55, 'You are unexpectedly asked to give a speech in front of a large audience.', null, null, null),
  ('srt', 'srt-56', 56, 'Your plan fails despite careful preparation.', null, null, null),
  ('srt', 'srt-57', 57, 'You see a group of people ignoring safety instructions during an activity.', null, null, null),
  ('srt', 'srt-58', 58, 'A junior colleague comes to you for guidance during a crisis.', null, null, null),
  ('srt', 'srt-59', 59, 'You are the last one to leave and notice something suspicious.', null, null, null),
  ('srt', 'srt-60', 60, 'Your team succeeds, but you feel the credit was unfairly distributed.', null, null, null);

insert into public.practice_items (bank_slug, key, position, prompt, options, correct_option_id, guidance) values
  ('sdt', 'sdt-1', 1, 'What does your father think of you?', null, null, null),
  ('sdt', 'sdt-2', 2, 'What does your mother think of you?', null, null, null),
  ('sdt', 'sdt-3', 3, 'What do your teachers or employers think of you?', null, null, null),
  ('sdt', 'sdt-4', 4, 'What do your friends or colleagues think of you?', null, null, null),
  ('sdt', 'sdt-5', 5, 'What do you think of yourself, and what would you like to become?', null, null, null);

insert into public.practice_items (bank_slug, key, position, prompt, options, correct_option_id, guidance) values
  ('oir-verbal-practice', 'oir-p-1', 1, 'Soldier is to Army as Sailor is to ____', '[{"id":"oir-p-1-a","label":"Navy"},{"id":"oir-p-1-b","label":"Air Force"},{"id":"oir-p-1-c","label":"Police"},{"id":"oir-p-1-d","label":"Marines"}]'::jsonb, 'oir-p-1-a', null),
  ('oir-verbal-practice', 'oir-p-2', 2, 'Complete the series: 2, 4, 8, 16, ?', '[{"id":"oir-p-2-a","label":"24"},{"id":"oir-p-2-b","label":"30"},{"id":"oir-p-2-c","label":"32"},{"id":"oir-p-2-d","label":"36"}]'::jsonb, 'oir-p-2-c', null),
  ('oir-verbal-practice', 'oir-p-3', 3, 'Which does not belong: Rifle, Sword, Tank, Helmet', '[{"id":"oir-p-3-a","label":"Rifle"},{"id":"oir-p-3-b","label":"Sword"},{"id":"oir-p-3-c","label":"Tank"},{"id":"oir-p-3-d","label":"Helmet"}]'::jsonb, 'oir-p-3-d', null),
  ('oir-verbal-practice', 'oir-p-4', 4, 'If CAT is coded as DBU (each letter +1), how is DOG coded?', '[{"id":"oir-p-4-a","label":"EPH"},{"id":"oir-p-4-b","label":"EPI"},{"id":"oir-p-4-c","label":"DPG"},{"id":"oir-p-4-d","label":"EOH"}]'::jsonb, 'oir-p-4-a', null),
  ('oir-verbal-practice', 'oir-p-5', 5, 'A man says, "She is the daughter of my grandfather''s only son." How is the girl related to the man, if he is that son?', '[{"id":"oir-p-5-a","label":"Mother"},{"id":"oir-p-5-b","label":"Sister"},{"id":"oir-p-5-c","label":"Cousin"},{"id":"oir-p-5-d","label":"Aunt"}]'::jsonb, 'oir-p-5-b', null),
  ('oir-verbal-practice', 'oir-p-6', 6, 'Complete the series: 3, 6, 11, 18, 27, ?', '[{"id":"oir-p-6-a","label":"34"},{"id":"oir-p-6-b","label":"36"},{"id":"oir-p-6-c","label":"38"},{"id":"oir-p-6-d","label":"40"}]'::jsonb, 'oir-p-6-c', null),
  ('oir-verbal-practice', 'oir-p-7', 7, 'Pen is to Write as Knife is to ____', '[{"id":"oir-p-7-a","label":"Sharp"},{"id":"oir-p-7-b","label":"Cut"},{"id":"oir-p-7-c","label":"Kitchen"},{"id":"oir-p-7-d","label":"Metal"}]'::jsonb, 'oir-p-7-b', null),
  ('oir-verbal-practice', 'oir-p-8', 8, 'Which is different: Delhi, Mumbai, Punjab, Chennai', '[{"id":"oir-p-8-a","label":"Delhi"},{"id":"oir-p-8-b","label":"Mumbai"},{"id":"oir-p-8-c","label":"Punjab"},{"id":"oir-p-8-d","label":"Chennai"}]'::jsonb, 'oir-p-8-c', null),
  ('oir-verbal-practice', 'oir-p-9', 9, 'Complete the series: A, C, E, G, ?', '[{"id":"oir-p-9-a","label":"H"},{"id":"oir-p-9-b","label":"I"},{"id":"oir-p-9-c","label":"J"},{"id":"oir-p-9-d","label":"F"}]'::jsonb, 'oir-p-9-b', null),
  ('oir-verbal-practice', 'oir-p-10', 10, 'All soldiers are disciplined. Ram is a soldier. Therefore:', '[{"id":"oir-p-10-a","label":"Ram is disciplined"},{"id":"oir-p-10-b","label":"Ram is an officer"},{"id":"oir-p-10-c","label":"All disciplined people are soldiers"},{"id":"oir-p-10-d","label":"Cannot be determined"}]'::jsonb, 'oir-p-10-a', null),
  ('oir-verbal-practice', 'oir-p-11', 11, 'If ROSE is coded as 6-15-19-5 (A=1..Z=26), how is BUD coded?', '[{"id":"oir-p-11-a","label":"2-21-4"},{"id":"oir-p-11-b","label":"2-20-4"},{"id":"oir-p-11-c","label":"1-21-4"},{"id":"oir-p-11-d","label":"2-21-5"}]'::jsonb, 'oir-p-11-a', null),
  ('oir-verbal-practice', 'oir-p-12', 12, 'Doctor is to Hospital as Teacher is to ____', '[{"id":"oir-p-12-a","label":"Classroom"},{"id":"oir-p-12-b","label":"School"},{"id":"oir-p-12-c","label":"Book"},{"id":"oir-p-12-d","label":"Student"}]'::jsonb, 'oir-p-12-b', null),
  ('oir-verbal-practice', 'oir-p-13', 13, 'Complete the letter series: Z, X, V, T, ?', '[{"id":"oir-p-13-a","label":"S"},{"id":"oir-p-13-b","label":"Q"},{"id":"oir-p-13-c","label":"R"},{"id":"oir-p-13-d","label":"U"}]'::jsonb, 'oir-p-13-c', null),
  ('oir-verbal-practice', 'oir-p-14', 14, 'Which does not belong: Triangle, Square, Circle, Cube', '[{"id":"oir-p-14-a","label":"Triangle"},{"id":"oir-p-14-b","label":"Square"},{"id":"oir-p-14-c","label":"Circle"},{"id":"oir-p-14-d","label":"Cube"}]'::jsonb, 'oir-p-14-d', null),
  ('oir-verbal-practice', 'oir-p-15', 15, 'Complete the series: 5, 10, 20, 40, ?', '[{"id":"oir-p-15-a","label":"60"},{"id":"oir-p-15-b","label":"70"},{"id":"oir-p-15-c","label":"80"},{"id":"oir-p-15-d","label":"90"}]'::jsonb, 'oir-p-15-c', null);

insert into public.practice_items (bank_slug, key, position, prompt, options, correct_option_id, guidance) values
  ('oir-verbal-test', 'oir-t-1', 1, 'Bird is to Nest as Bee is to ____', '[{"id":"oir-t-1-a","label":"Hive"},{"id":"oir-t-1-b","label":"Flower"},{"id":"oir-t-1-c","label":"Garden"},{"id":"oir-t-1-d","label":"Honey"}]'::jsonb, 'oir-t-1-a', null),
  ('oir-verbal-test', 'oir-t-2', 2, 'Which is different: Apple, Mango, Potato, Banana', '[{"id":"oir-t-2-a","label":"Apple"},{"id":"oir-t-2-b","label":"Mango"},{"id":"oir-t-2-c","label":"Potato"},{"id":"oir-t-2-d","label":"Banana"}]'::jsonb, 'oir-t-2-c', null),
  ('oir-verbal-test', 'oir-t-3', 3, 'If BOOK is coded as CPPL (each letter +1), how is PAGE coded?', '[{"id":"oir-t-3-a","label":"QBHF"},{"id":"oir-t-3-b","label":"QBGF"},{"id":"oir-t-3-c","label":"QAHF"},{"id":"oir-t-3-d","label":"PBHF"}]'::jsonb, 'oir-t-3-a', null),
  ('oir-verbal-test', 'oir-t-4', 4, 'A is B''s brother. B is C''s sister. C is D''s father. How is A related to D?', '[{"id":"oir-t-4-a","label":"Father"},{"id":"oir-t-4-b","label":"Uncle"},{"id":"oir-t-4-c","label":"Brother"},{"id":"oir-t-4-d","label":"Grandfather"}]'::jsonb, 'oir-t-4-b', null),
  ('oir-verbal-test', 'oir-t-5', 5, 'Complete the series: 7, 14, 28, 56, ?', '[{"id":"oir-t-5-a","label":"84"},{"id":"oir-t-5-b","label":"100"},{"id":"oir-t-5-c","label":"112"},{"id":"oir-t-5-d","label":"120"}]'::jsonb, 'oir-t-5-c', null),
  ('oir-verbal-test', 'oir-t-6', 6, 'Fish is to Water as Bird is to ____', '[{"id":"oir-t-6-a","label":"Nest"},{"id":"oir-t-6-b","label":"Sky"},{"id":"oir-t-6-c","label":"Wing"},{"id":"oir-t-6-d","label":"Tree"}]'::jsonb, 'oir-t-6-b', null),
  ('oir-verbal-test', 'oir-t-7', 7, 'Which does not belong: Rose, Lotus, Jasmine, Mango', '[{"id":"oir-t-7-a","label":"Rose"},{"id":"oir-t-7-b","label":"Lotus"},{"id":"oir-t-7-c","label":"Jasmine"},{"id":"oir-t-7-d","label":"Mango"}]'::jsonb, 'oir-t-7-d', null),
  ('oir-verbal-test', 'oir-t-8', 8, 'Complete the letter series: B, D, F, H, ?', '[{"id":"oir-t-8-a","label":"I"},{"id":"oir-t-8-b","label":"J"},{"id":"oir-t-8-c","label":"K"},{"id":"oir-t-8-d","label":"G"}]'::jsonb, 'oir-t-8-b', null),
  ('oir-verbal-test', 'oir-t-9', 9, 'All officers are punctual. Some punctual people are strict. Therefore:', '[{"id":"oir-t-9-a","label":"All officers are strict"},{"id":"oir-t-9-b","label":"Some officers are strict"},{"id":"oir-t-9-c","label":"Cannot be determined"},{"id":"oir-t-9-d","label":"No officers are strict"}]'::jsonb, 'oir-t-9-c', null),
  ('oir-verbal-test', 'oir-t-10', 10, 'If WATER is coded as XBUFS (each letter +1), how is EARTH coded?', '[{"id":"oir-t-10-a","label":"FBSUI"},{"id":"oir-t-10-b","label":"FBSUH"},{"id":"oir-t-10-c","label":"FBSTI"},{"id":"oir-t-10-d","label":"EBSUI"}]'::jsonb, 'oir-t-10-a', null),
  ('oir-verbal-test', 'oir-t-11', 11, 'Author is to Book as Sculptor is to ____', '[{"id":"oir-t-11-a","label":"Chisel"},{"id":"oir-t-11-b","label":"Statue"},{"id":"oir-t-11-c","label":"Museum"},{"id":"oir-t-11-d","label":"Stone"}]'::jsonb, 'oir-t-11-b', null),
  ('oir-verbal-test', 'oir-t-12', 12, 'Complete the series: 100, 90, 81, 73, ?', '[{"id":"oir-t-12-a","label":"64"},{"id":"oir-t-12-b","label":"65"},{"id":"oir-t-12-c","label":"66"},{"id":"oir-t-12-d","label":"68"}]'::jsonb, 'oir-t-12-c', null),
  ('oir-verbal-test', 'oir-t-13', 13, 'Which is different: Delhi, Kolkata, Mumbai, India', '[{"id":"oir-t-13-a","label":"Delhi"},{"id":"oir-t-13-b","label":"Kolkata"},{"id":"oir-t-13-c","label":"Mumbai"},{"id":"oir-t-13-d","label":"India"}]'::jsonb, 'oir-t-13-d', null),
  ('oir-verbal-test', 'oir-t-14', 14, 'A man faces North, turns 90° clockwise, then 180°. Which direction does he now face?', '[{"id":"oir-t-14-a","label":"North"},{"id":"oir-t-14-b","label":"South"},{"id":"oir-t-14-c","label":"East"},{"id":"oir-t-14-d","label":"West"}]'::jsonb, 'oir-t-14-b', null),
  ('oir-verbal-test', 'oir-t-15', 15, 'Complete the series: 1, 4, 9, 16, ?', '[{"id":"oir-t-15-a","label":"20"},{"id":"oir-t-15-b","label":"24"},{"id":"oir-t-15-c","label":"25"},{"id":"oir-t-15-d","label":"36"}]'::jsonb, 'oir-t-15-c', null);

insert into public.practice_items (bank_slug, key, position, prompt, options, correct_option_id, guidance) values
  ('oir-nonverbal-practice', 'oirnv-p-1', 1, 'A circle appears with 0 dots, then 1 dot, then 2 dots, then 3 dots inside it. What comes next?', '[{"id":"oirnv-p-1-a","label":"A circle with 4 dots"},{"id":"oirnv-p-1-b","label":"A circle with 0 dots"},{"id":"oirnv-p-1-c","label":"A square with 4 dots"},{"id":"oirnv-p-1-d","label":"A circle with 3 dots"}]'::jsonb, 'oirnv-p-1-a', null),
  ('oir-nonverbal-practice', 'oirnv-p-2', 2, 'A triangle rotates 90° clockwise each step: pointing up, pointing right, pointing down. What is the next position?', '[{"id":"oirnv-p-2-a","label":"Pointing up"},{"id":"oirnv-p-2-b","label":"Pointing left"},{"id":"oirnv-p-2-c","label":"Pointing down"},{"id":"oirnv-p-2-d","label":"Pointing right"}]'::jsonb, 'oirnv-p-2-b', null),
  ('oir-nonverbal-practice', 'oirnv-p-3', 3, 'A shape gains one side each step: triangle (3), square (4), pentagon (5). What comes next?', '[{"id":"oirnv-p-3-a","label":"Hexagon (6)"},{"id":"oirnv-p-3-b","label":"Heptagon (7)"},{"id":"oirnv-p-3-c","label":"Square (4)"},{"id":"oirnv-p-3-d","label":"Circle"}]'::jsonb, 'oirnv-p-3-a', null),
  ('oir-nonverbal-practice', 'oirnv-p-4', 4, 'A pattern alternates: black square, white square, black square, white square. What comes next?', '[{"id":"oirnv-p-4-a","label":"White square"},{"id":"oirnv-p-4-b","label":"Black square"},{"id":"oirnv-p-4-c","label":"Grey square"},{"id":"oirnv-p-4-d","label":"Black circle"}]'::jsonb, 'oirnv-p-4-b', null),
  ('oir-nonverbal-practice', 'oirnv-p-5', 5, 'An arrow rotates 45° counter-clockwise each step: right, up-right, up. What is next?', '[{"id":"oirnv-p-5-a","label":"Up-left"},{"id":"oirnv-p-5-b","label":"Down"},{"id":"oirnv-p-5-c","label":"Right"},{"id":"oirnv-p-5-d","label":"Up-right"}]'::jsonb, 'oirnv-p-5-a', null),
  ('oir-nonverbal-practice', 'oirnv-p-6', 6, 'Shading moves around a square: top-left, top-right, bottom-right. Where next?', '[{"id":"oirnv-p-6-a","label":"Top-left"},{"id":"oirnv-p-6-b","label":"Bottom-left"},{"id":"oirnv-p-6-c","label":"Centre"},{"id":"oirnv-p-6-d","label":"Top-right"}]'::jsonb, 'oirnv-p-6-b', null),
  ('oir-nonverbal-practice', 'oirnv-p-7', 7, 'A row of stars doubles each step: 1, 2, 4, 8. How many stars come next?', '[{"id":"oirnv-p-7-a","label":"10"},{"id":"oirnv-p-7-b","label":"12"},{"id":"oirnv-p-7-c","label":"16"},{"id":"oirnv-p-7-d","label":"20"}]'::jsonb, 'oirnv-p-7-c', null),
  ('oir-nonverbal-practice', 'oirnv-p-8', 8, 'Circles alternate filled/empty and grow: small filled, small empty, medium filled, medium empty. What comes next?', '[{"id":"oirnv-p-8-a","label":"Large filled"},{"id":"oirnv-p-8-b","label":"Large empty"},{"id":"oirnv-p-8-c","label":"Medium filled"},{"id":"oirnv-p-8-d","label":"Small filled"}]'::jsonb, 'oirnv-p-8-a', null),
  ('oir-nonverbal-practice', 'oirnv-p-9', 9, 'A line grows by one unit each step: 1, 2, 3 units long. How long is the next line?', '[{"id":"oirnv-p-9-a","label":"3 units"},{"id":"oirnv-p-9-b","label":"4 units"},{"id":"oirnv-p-9-c","label":"5 units"},{"id":"oirnv-p-9-d","label":"6 units"}]'::jsonb, 'oirnv-p-9-b', null),
  ('oir-nonverbal-practice', 'oirnv-p-10', 10, 'A shape loses one side each step: hexagon (6), pentagon (5), square (4). What comes next?', '[{"id":"oirnv-p-10-a","label":"Triangle (3)"},{"id":"oirnv-p-10-b","label":"Circle"},{"id":"oirnv-p-10-c","label":"Pentagon (5)"},{"id":"oirnv-p-10-d","label":"Line"}]'::jsonb, 'oirnv-p-10-a', null);

insert into public.practice_items (bank_slug, key, position, prompt, options, correct_option_id, guidance) values
  ('oir-nonverbal-test', 'oirnv-t-1', 1, 'A pattern adds one parallel line each step: 1 line, 2 lines, 3 lines. What comes next?', '[{"id":"oirnv-t-1-a","label":"3 lines"},{"id":"oirnv-t-1-b","label":"4 lines"},{"id":"oirnv-t-1-c","label":"5 lines"},{"id":"oirnv-t-1-d","label":"2 lines"}]'::jsonb, 'oirnv-t-1-b', null),
  ('oir-nonverbal-test', 'oirnv-t-2', 2, 'A square rotates 90° clockwise each step, starting at 0°. What is its rotation after the 4th step?', '[{"id":"oirnv-t-2-a","label":"90°"},{"id":"oirnv-t-2-b","label":"180°"},{"id":"oirnv-t-2-c","label":"270°"},{"id":"oirnv-t-2-d","label":"360° (back to start)"}]'::jsonb, 'oirnv-t-2-d', null),
  ('oir-nonverbal-test', 'oirnv-t-3', 3, 'Dots arranged in a growing triangle: 1 dot, 3 dots, 6 dots. How many dots come next?', '[{"id":"oirnv-t-3-a","label":"8"},{"id":"oirnv-t-3-b","label":"9"},{"id":"oirnv-t-3-c","label":"10"},{"id":"oirnv-t-3-d","label":"12"}]'::jsonb, 'oirnv-t-3-c', null),
  ('oir-nonverbal-test', 'oirnv-t-4', 4, 'A pentagon gains one dot inside each step: 0 dots, 1 dot, 2 dots. How many dots come next?', '[{"id":"oirnv-t-4-a","label":"2"},{"id":"oirnv-t-4-b","label":"3"},{"id":"oirnv-t-4-c","label":"4"},{"id":"oirnv-t-4-d","label":"5"}]'::jsonb, 'oirnv-t-4-b', null),
  ('oir-nonverbal-test', 'oirnv-t-5', 5, 'An arrow rotates 90° clockwise each step: up, right, down. What is next?', '[{"id":"oirnv-t-5-a","label":"Up"},{"id":"oirnv-t-5-b","label":"Left"},{"id":"oirnv-t-5-c","label":"Down"},{"id":"oirnv-t-5-d","label":"Right"}]'::jsonb, 'oirnv-t-5-b', null),
  ('oir-nonverbal-test', 'oirnv-t-6', 6, 'A square doubles in size each step: 1cm, 2cm, 4cm. What is the next size?', '[{"id":"oirnv-t-6-a","label":"6cm"},{"id":"oirnv-t-6-b","label":"8cm"},{"id":"oirnv-t-6-c","label":"10cm"},{"id":"oirnv-t-6-d","label":"12cm"}]'::jsonb, 'oirnv-t-6-b', null),
  ('oir-nonverbal-test', 'oirnv-t-7', 7, 'A shape alternates every step: circle, square, circle, square. What comes next?', '[{"id":"oirnv-t-7-a","label":"Circle"},{"id":"oirnv-t-7-b","label":"Square"},{"id":"oirnv-t-7-c","label":"Triangle"},{"id":"oirnv-t-7-d","label":"Pentagon"}]'::jsonb, 'oirnv-t-7-a', null),
  ('oir-nonverbal-test', 'oirnv-t-8', 8, 'A circle''s shaded portion grows each step: a quarter, a half, three-quarters. What comes next?', '[{"id":"oirnv-t-8-a","label":"Fully shaded"},{"id":"oirnv-t-8-b","label":"Still three-quarters"},{"id":"oirnv-t-8-c","label":"Half shaded"},{"id":"oirnv-t-8-d","label":"Unshaded"}]'::jsonb, 'oirnv-t-8-a', null),
  ('oir-nonverbal-test', 'oirnv-t-9', 9, 'A shape loses one side each step: octagon (8), heptagon (7), hexagon (6). What comes next?', '[{"id":"oirnv-t-9-a","label":"Hexagon (6)"},{"id":"oirnv-t-9-b","label":"Pentagon (5)"},{"id":"oirnv-t-9-c","label":"Square (4)"},{"id":"oirnv-t-9-d","label":"Heptagon (7)"}]'::jsonb, 'oirnv-t-9-b', null),
  ('oir-nonverbal-test', 'oirnv-t-10', 10, 'Triangles alternate up/down and increase in count: 1 up, 2 down, 3 up. What comes next?', '[{"id":"oirnv-t-10-a","label":"3 down"},{"id":"oirnv-t-10-b","label":"4 down"},{"id":"oirnv-t-10-c","label":"4 up"},{"id":"oirnv-t-10-d","label":"5 down"}]'::jsonb, 'oirnv-t-10-b', null);

insert into public.practice_items (bank_slug, key, position, prompt, options, correct_option_id, guidance) values
  ('ppdt', 'ppdt-1', 1, 'A hazy, indistinct picture: a figure stands near a river at dusk, with two other shadowy figures nearby and what could be a boat or a fallen log in the water.', null, null, null);

insert into public.practice_items (bank_slug, key, position, prompt, options, correct_option_id, guidance) values
  ('interview', 'int-1', 1, 'Tell us about yourself in a few sentences.', null, null, '{"assesses":"How clearly and honestly you summarise yourself — the IO compares it with your PIQ.","tips":["Cover background, education, interests and why the forces in about a minute.","Only mention what you can talk about in depth — every point invites a follow-up."]}'::jsonb),
  ('interview', 'int-2', 2, 'Why do you want to join the Armed Forces?', null, null, '{"assesses":"Whether your motivation is genuine and thought through, not borrowed.","tips":["Give a personal reason — a person, experience or value that led you here.","Avoid lines you can''t expand on, whether that''s ''job security'' or a rehearsed patriotic speech."]}'::jsonb),
  ('interview', 'int-3', 3, 'What are your strengths and weaknesses?', null, null, '{"assesses":"Self-awareness and honesty.","tips":["Back each strength with a real example.","Name a real weakness and what you''re doing about it — not a disguised strength."]}'::jsonb),
  ('interview', 'int-4', 4, 'Describe a situation where you showed leadership.', null, null, '{"assesses":"Initiative and how you influence others.","tips":["Use situation → what you did → what happened.","A small, real example (a college event, a team, family) beats an invented big one."]}'::jsonb),
  ('interview', 'int-5', 5, 'What do you know about the role you have applied for?', null, null, '{"assesses":"Whether you''ve researched the service and entry you chose.","tips":["Know the academy, training length and what a young officer in that branch actually does.","It''s fine to say what you don''t know yet rather than guess."]}'::jsonb),
  ('interview', 'int-6', 6, 'How do you handle failure or criticism?', null, null, '{"assesses":"Emotional stability and ability to learn.","tips":["Pick a real setback, own your part, and say what changed afterwards.","Don''t blame other people."]}'::jsonb),
  ('interview', 'int-7', 7, 'Tell us about your hobbies and how they help you.', null, null, '{"assesses":"Whether the interests in your PIQ are real.","tips":["Expect detailed follow-ups — only list hobbies you actively pursue.","Link one hobby to a quality it built, like patience or teamwork."]}'::jsonb),
  ('interview', 'int-8', 8, 'What is your family''s reaction to your decision to join the forces?', null, null, '{"assesses":"Your support system and how you handle differing views.","tips":["If your family has concerns, say so honestly and explain how you discussed them.","Speak about family members with respect."]}'::jsonb),
  ('interview', 'int-9', 9, 'Describe a difficult decision you had to make and how you made it.', null, null, '{"assesses":"How soundly and quickly you decide.","tips":["Explain the options you weighed and why you chose one.","Say what you''d do differently now, if anything."]}'::jsonb),
  ('interview', 'int-10', 10, 'What are your short-term and long-term goals?', null, null, '{"assesses":"How clear and realistic your plans are.","tips":["Give concrete short-term steps (fitness, studies) and a long-term direction.","Have a calm answer ready for what you''ll do if you''re not recommended this time."]}'::jsonb),
  ('interview', 'int-11', 11, 'How do you stay updated with current affairs?', null, null, '{"assesses":"Awareness and a real habit of staying informed.","tips":["Name the sources you actually use and how often.","Be ready to discuss one recent national and one international event."]}'::jsonb),
  ('interview', 'int-12', 12, 'Why should we select you over other candidates?', null, null, '{"assesses":"Confidence without arrogance.","tips":["Point to qualities you''ve already shown with real examples.","Talk about yourself, not about other candidates."]}'::jsonb);

insert into public.practice_items (bank_slug, key, position, prompt, options, correct_option_id, guidance) values
  ('conference', 'conf-1', 1, 'Looking back at your GTO tasks, what would you do differently?', null, null, '{"assesses":"Whether you can reflect honestly on your own performance.","tips":["Name one specific moment and what you''d change.","Keep it short — the board saw the task."]}'::jsonb),
  ('conference', 'conf-2', 2, 'What feedback did you receive during the psychology tests, and how do you view it?', null, null, '{"assesses":"Openness to feedback.","tips":["If you received no direct feedback, say so plainly.","Show you can take a critical point without getting defensive."]}'::jsonb),
  ('conference', 'conf-3', 3, 'How would you describe your overall performance across the five days?', null, null, '{"assesses":"Balanced self-assessment.","tips":["Mention one thing that went well and one that didn''t.","Avoid both ''everything was perfect'' and ''I did badly''."]}'::jsonb),
  ('conference', 'conf-4', 4, 'What is one Officer-Like Quality you feel you demonstrated well?', null, null, '{"assesses":"Whether your self-view matches what the board observed.","tips":["Pick one OLQ and tie it to a moment from this week.","Don''t list several without evidence."]}'::jsonb),
  ('conference', 'conf-5', 5, 'What is one area you plan to work on regardless of the result?', null, null, '{"assesses":"Commitment to improving.","tips":["Name a concrete area and a first step you''ll take.","It shouldn''t depend on being recommended."]}'::jsonb),
  ('conference', 'conf-6', 6, 'How did you handle disagreements within your group during tasks?', null, null, '{"assesses":"Cooperation under pressure.","tips":["Describe what you actually did, not what you''d ideally do.","Show you listened as well as argued your point."]}'::jsonb),
  ('conference', 'conf-7', 7, 'What did this SSB experience teach you about yourself?', null, null, '{"assesses":"Self-awareness.","tips":["One honest insight is enough.","Keep it about you, not about the process."]}'::jsonb),
  ('conference', 'conf-8', 8, 'If selected, how will you prepare for the next stage?', null, null, '{"assesses":"Forward planning.","tips":["Mention the medical exam, fitness and how you''ll prepare for training.","Keep it brief and practical."]}'::jsonb);

