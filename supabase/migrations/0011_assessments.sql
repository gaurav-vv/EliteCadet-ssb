-- SSB Academy — Phase 7 (T086): assessments, attempts and mentor feedback.
-- Run once in the Supabase SQL Editor, AFTER 0004–0010.
--
-- Design notes
--  * An assessment belongs to ONE batch and is created by a mentor who
--    teaches it. Questions are a small JSON array of {id, prompt}; answers are
--    free text (the MVP is text-based, specs.md §6.4).
--  * One attempt per (assessment, student). Students write their own attempt
--    only while it's a draft AND the assessment is published and not past due;
--    once submitted it's locked (enforced by RLS + a trigger).
--  * One feedback per attempt (unique), written by a mentor of the batch.
--    'in_review' = draft (staff only), 'reviewed' = final, locked, visible to
--    the student. The unique key makes a double submit idempotent.

create type public.assessment_status as enum ('draft', 'published', 'closed');
create type public.attempt_status as enum ('draft', 'submitted');
create type public.feedback_status as enum ('in_review', 'reviewed');

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  instructions text,
  category public.content_category not null default 'general',
  questions jsonb not null,
  max_score smallint not null default 10,
  due_at timestamptz,
  status public.assessment_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessments_title_length check (char_length(btrim(title)) between 3 and 140),
  constraint assessments_max_score check (max_score between 1 and 100),
  constraint assessments_questions_shape check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 1 and 20)
);

create index assessments_batch_idx on public.assessments (batch_id, created_at desc);
create index assessments_mentor_idx on public.assessments (mentor_id, created_at desc);

create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  status public.attempt_status not null default 'draft',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attempts_one_per_student unique (assessment_id, student_id),
  constraint attempts_answers_shape check (jsonb_typeof(answers) = 'array')
);

create index attempts_student_idx on public.assessment_attempts (student_id);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.assessment_attempts(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  score numeric(5, 2),
  strengths text,
  improvement_areas text,
  comments text,
  status public.feedback_status not null default 'in_review',
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feedback_reviewed_complete check (
    status <> 'reviewed'
    or (score is not null and coalesce(btrim(strengths), '') <> '' and coalesce(btrim(improvement_areas), '') <> '')
  )
);

alter table public.assessments enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.feedback enable row level security;

-- ---------------------------------------------------------------------------
-- Triggers: derived fields + lifecycle locks
-- ---------------------------------------------------------------------------

create function public.prepare_assessment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.academy_id := (select academy_id from public.batches where id = new.batch_id);
  new.updated_at := now();
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := coalesce(new.published_at, now());
  end if;
  -- Questions can't change once students may have answered them.
  if tg_op = 'UPDATE' and old.status <> 'draft' and new.questions is distinct from old.questions then
    raise exception 'questions are locked once an assessment is published' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger assessments_prepare before insert or update on public.assessments
  for each row execute function public.prepare_assessment();

create function public.guard_attempt()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  a public.assessments%rowtype;
begin
  if tg_op = 'UPDATE' and old.status = 'submitted' then
    raise exception 'a submitted attempt is locked' using errcode = '23514';
  end if;
  select * into a from public.assessments where id = new.assessment_id;
  if a.status <> 'published' or (a.due_at is not null and a.due_at < now()) then
    raise exception 'this assessment is not open for answers' using errcode = '23514';
  end if;
  if not exists (select 1 from public.batch_students bs where bs.batch_id = a.batch_id and bs.student_id = new.student_id) then
    raise exception 'only students of the batch can answer' using errcode = '23514';
  end if;
  new.updated_at := now();
  if new.status = 'submitted' then
    new.submitted_at := now();
  end if;
  return new;
end;
$$;

create trigger attempts_guard before insert or update on public.assessment_attempts
  for each row execute function public.guard_attempt();

create function public.guard_feedback()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  max_s smallint;
  att_status public.attempt_status;
begin
  if tg_op = 'UPDATE' and old.status = 'reviewed' then
    raise exception 'reviewed feedback is locked' using errcode = '23514';
  end if;
  select a.max_score, t.status into max_s, att_status
  from public.assessment_attempts t join public.assessments a on a.id = t.assessment_id
  where t.id = new.attempt_id;
  if att_status is distinct from 'submitted' then
    raise exception 'only a submitted attempt can be evaluated' using errcode = '23514';
  end if;
  if new.score is not null and (new.score < 0 or new.score > max_s) then
    raise exception 'score must be between 0 and the maximum' using errcode = '23514';
  end if;
  new.updated_at := now();
  if new.status = 'reviewed' then
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;

create trigger feedback_guard before insert or update on public.feedback
  for each row execute function public.guard_feedback();

-- ---------------------------------------------------------------------------
-- Scope helpers
-- ---------------------------------------------------------------------------

create function public.assessment_batch(p_assessment uuid)
returns uuid
language sql stable security definer set search_path = public
as $$ select batch_id from public.assessments where id = p_assessment $$;

create function public.attempt_batch(p_attempt uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select a.batch_id from public.assessment_attempts t join public.assessments a on a.id = t.assessment_id where t.id = p_attempt
$$;

create function public.attempt_owner(p_attempt uuid)
returns uuid
language sql stable security definer set search_path = public
as $$ select student_id from public.assessment_attempts where id = p_attempt $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

-- Assessments
create policy "assessments_mentor_read" on public.assessments for select using (public.is_batch_mentor(batch_id));
create policy "assessments_mentor_insert" on public.assessments
  for insert with check (mentor_id = auth.uid() and public.is_batch_mentor(batch_id));
create policy "assessments_mentor_update" on public.assessments
  for update using (public.is_batch_mentor(batch_id)) with check (public.is_batch_mentor(batch_id));
create policy "assessments_student_read" on public.assessments
  for select using (
    status <> 'draft'
    and exists (select 1 from public.batch_students bs where bs.batch_id = assessments.batch_id and bs.student_id = auth.uid())
  );
create policy "assessments_admin_read" on public.assessments
  for select using (academy_id = public.current_admin_academy_id() or public.is_super_admin());

-- Attempts
create policy "attempts_student_own_read" on public.assessment_attempts for select using (student_id = auth.uid());
create policy "attempts_student_insert" on public.assessment_attempts
  for insert with check (student_id = auth.uid());
create policy "attempts_student_update" on public.assessment_attempts
  for update using (student_id = auth.uid() and status = 'draft') with check (student_id = auth.uid());
create policy "attempts_mentor_read" on public.assessment_attempts
  for select using (status = 'submitted' and public.is_batch_mentor(public.assessment_batch(assessment_id)));
create policy "attempts_admin_read" on public.assessment_attempts
  for select using (public.batch_academy(public.assessment_batch(assessment_id)) = public.current_admin_academy_id() or public.is_super_admin());

-- Feedback
create policy "feedback_mentor_read" on public.feedback for select using (public.is_batch_mentor(public.attempt_batch(attempt_id)));
create policy "feedback_mentor_insert" on public.feedback
  for insert with check (mentor_id = auth.uid() and public.is_batch_mentor(public.attempt_batch(attempt_id)));
create policy "feedback_mentor_update" on public.feedback
  for update using (public.is_batch_mentor(public.attempt_batch(attempt_id)) and status = 'in_review')
  with check (mentor_id = auth.uid() and public.is_batch_mentor(public.attempt_batch(attempt_id)));
create policy "feedback_student_read" on public.feedback
  for select using (status = 'reviewed' and public.attempt_owner(attempt_id) = auth.uid());
create policy "feedback_admin_read" on public.feedback
  for select using (public.batch_academy(public.attempt_batch(attempt_id)) = public.current_admin_academy_id() or public.is_super_admin());
