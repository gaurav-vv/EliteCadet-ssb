-- SSB Academy — T101: AI foundation (job queue, evaluations, usage).
-- Run once in the Supabase SQL Editor, AFTER 0016.
--
-- Design notes (specs.md §0.1, PRD §11.7/§12)
--  * AI work never runs inside a web request. The app (or a trigger) enqueues
--    a job; the separate worker service (worker/) claims it, calls the model,
--    validates the output and writes the evaluation. The student's answer is
--    already stored before the job exists, so an AI failure never loses input.
--  * The job snapshots its input (question + answer) so an evaluation is
--    reproducible and tied to the rubric version that produced it.
--  * Clients can read their own (student) or their mentee's (mentor) jobs and
--    evaluations; nobody writes them through the API. The worker connects as
--    the database owner and uses the functions below.
--  * Every evaluation carries the label "AI-generated practice evaluation".

create type public.ai_job_status as enum ('queued', 'running', 'succeeded', 'failed', 'dead');
create type public.ai_rating as enum ('needs_attention', 'developing', 'strong');
create type public.ai_confidence as enum ('low', 'medium', 'high');

create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  -- What is being evaluated, e.g. ('practice_attempt', <id>).
  subject_type text not null,
  subject_id uuid not null,
  student_id uuid not null references public.profiles(id) on delete cascade,
  rubric_id text not null,
  rubric_version integer not null,
  -- {"items": [{"prompt": text, "response": text}], "context": {...}}
  input jsonb not null,
  status public.ai_job_status not null default 'queued',
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_jobs_subject_type check (subject_type ~ '^[a-z_]{2,40}$'),
  constraint ai_jobs_rubric check (rubric_id ~ '^[a-z0-9-]{2,60}$' and rubric_version > 0),
  constraint ai_jobs_input check (jsonb_typeof(input) = 'object' and jsonb_typeof(input->'items') = 'array'),
  constraint ai_jobs_attempts check (attempts >= 0 and max_attempts between 1 and 10),
  -- One evaluation per subject per rubric version: re-enqueueing is a no-op.
  constraint ai_jobs_once unique (subject_type, subject_id, rubric_id, rubric_version)
);

create index ai_jobs_claim_idx on public.ai_jobs (run_after) where status = 'queued';
create index ai_jobs_student_idx on public.ai_jobs (student_id, created_at desc);

create table public.ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.ai_jobs(id) on delete cascade,
  subject_type text not null,
  subject_id uuid not null,
  student_id uuid not null references public.profiles(id) on delete cascade,
  rubric_id text not null,
  rubric_version integer not null,
  model text not null,
  label text not null default 'AI-generated practice evaluation',
  -- [{"dimension": id, "rating": ai_rating, "confidence": ai_confidence, "evidence": [quote], "note": text}]
  dimensions jsonb not null,
  -- {"observation", "evidence", "impact", "improvement_action", "recommended_practice"}
  feedback jsonb not null,
  overall_confidence public.ai_confidence not null,
  created_at timestamptz not null default now(),
  constraint ai_evaluations_label check (label = 'AI-generated practice evaluation'),
  constraint ai_evaluations_dimensions check (jsonb_typeof(dimensions) = 'array' and jsonb_array_length(dimensions) between 1 and 12),
  constraint ai_evaluations_feedback check (
    jsonb_typeof(feedback) = 'object'
    and feedback ?& array['observation', 'evidence', 'impact', 'improvement_action', 'recommended_practice']
  )
);

create index ai_evaluations_subject_idx on public.ai_evaluations (subject_type, subject_id);
create index ai_evaluations_student_idx on public.ai_evaluations (student_id, created_at desc);

-- Per model call: cost and latency telemetry (PRD §12.9 "log telemetry").
create table public.ai_usage (
  id bigint generated always as identity primary key,
  job_id uuid references public.ai_jobs(id) on delete set null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  cost_micro_usd bigint,
  latency_ms integer not null,
  outcome text not null,
  created_at timestamptz not null default now(),
  constraint ai_usage_outcome check (outcome ~ '^[a-z_]{2,40}$')
);

create index ai_usage_created_idx on public.ai_usage (created_at desc);

alter table public.ai_jobs enable row level security;
alter table public.ai_evaluations enable row level security;
alter table public.ai_usage enable row level security;

-- Reads only. The student sees their own; their batch mentors see a mentee's.
create policy "ai_jobs_own_read" on public.ai_jobs for select using (student_id = auth.uid());
create policy "ai_jobs_mentor_read" on public.ai_jobs for select using (public.is_my_mentee(student_id));
create policy "ai_evaluations_own_read" on public.ai_evaluations for select using (student_id = auth.uid());
create policy "ai_evaluations_mentor_read" on public.ai_evaluations for select using (public.is_my_mentee(student_id));
create policy "ai_usage_super_read" on public.ai_usage for select using (public.is_super_admin());

revoke insert, update, delete on public.ai_jobs, public.ai_evaluations, public.ai_usage from authenticated, anon;
grant select on public.ai_jobs, public.ai_evaluations, public.ai_usage to authenticated;

-- ---------------------------------------------------------------------------
-- Queue functions (internal: not callable through the API)
-- ---------------------------------------------------------------------------

-- Enqueue an evaluation. Idempotent per (subject, rubric version).
create function public.enqueue_ai_evaluation(
  p_subject_type text, p_subject_id uuid, p_student_id uuid,
  p_rubric_id text, p_rubric_version integer, p_input jsonb
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  job uuid;
begin
  insert into public.ai_jobs (subject_type, subject_id, student_id, rubric_id, rubric_version, input)
  values (p_subject_type, p_subject_id, p_student_id, p_rubric_id, p_rubric_version, p_input)
  on conflict (subject_type, subject_id, rubric_id, rubric_version) do nothing
  returning id into job;
  if job is null then
    select id into job from public.ai_jobs
    where subject_type = p_subject_type and subject_id = p_subject_id
      and rubric_id = p_rubric_id and rubric_version = p_rubric_version;
  end if;
  return job;
end;
$$;

-- Claim up to p_limit due jobs. A job left 'running' for 10 minutes (a worker
-- that crashed) is claimable again; its attempt still counts.
create function public.ai_claim_jobs(p_worker text, p_limit integer)
returns setof public.ai_jobs
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  update public.ai_jobs j
  set status = 'running', locked_at = now(), locked_by = p_worker,
      attempts = j.attempts + 1, updated_at = now()
  where j.id in (
    select id from public.ai_jobs
    where (status = 'queued' and run_after <= now())
       or (status = 'running' and locked_at < now() - interval '10 minutes')
    order by run_after
    limit greatest(1, least(p_limit, 20))
    for update skip locked
  )
  returning j.*;
end;
$$;

-- Success: store the evaluation and close the job, atomically.
create function public.ai_complete_job(
  p_job uuid, p_worker text, p_model text, p_dimensions jsonb, p_feedback jsonb, p_confidence public.ai_confidence
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  j public.ai_jobs%rowtype;
begin
  select * into j from public.ai_jobs where id = p_job for update;
  if not found or j.status <> 'running' or j.locked_by is distinct from p_worker then
    raise exception 'job % is not held by this worker', p_job using errcode = '55000';
  end if;
  insert into public.ai_evaluations (job_id, subject_type, subject_id, student_id, rubric_id, rubric_version, model, dimensions, feedback, overall_confidence)
  values (j.id, j.subject_type, j.subject_id, j.student_id, j.rubric_id, j.rubric_version, p_model, p_dimensions, p_feedback, p_confidence);
  update public.ai_jobs
  set status = 'succeeded', locked_at = null, locked_by = null, last_error_code = null, updated_at = now()
  where id = p_job;
end;
$$;

-- Failure: retry later with exponential backoff, or give up ('dead') when the
-- error can't be fixed by retrying or attempts are used up.
create function public.ai_fail_job(p_job uuid, p_worker text, p_error_code text, p_retryable boolean)
returns public.ai_job_status
language plpgsql
security definer set search_path = public
as $$
declare
  j public.ai_jobs%rowtype;
  next_status public.ai_job_status;
begin
  select * into j from public.ai_jobs where id = p_job for update;
  if not found or j.status <> 'running' or j.locked_by is distinct from p_worker then
    raise exception 'job % is not held by this worker', p_job using errcode = '55000';
  end if;
  next_status := case when p_retryable and j.attempts < j.max_attempts then 'queued' else 'dead' end;
  update public.ai_jobs
  set status = next_status,
      run_after = case when next_status = 'queued' then now() + make_interval(secs => 30 * power(2, j.attempts - 1)) else run_after end,
      locked_at = null, locked_by = null, last_error_code = left(p_error_code, 60), updated_at = now()
  where id = p_job;
  return next_status;
end;
$$;

create function public.ai_log_usage(
  p_job uuid, p_model text, p_input integer, p_output integer, p_cache_read integer, p_cache_write integer,
  p_cost_micro_usd bigint, p_latency_ms integer, p_outcome text
)
returns void
language sql
security definer set search_path = public
as $$
  insert into public.ai_usage (job_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_micro_usd, latency_ms, outcome)
  values (p_job, p_model, p_input, p_output, p_cache_read, p_cache_write, p_cost_micro_usd, p_latency_ms, p_outcome);
$$;

revoke execute on function public.enqueue_ai_evaluation(text, uuid, uuid, text, integer, jsonb) from public, anon, authenticated;
revoke execute on function public.ai_claim_jobs(text, integer) from public, anon, authenticated;
revoke execute on function public.ai_complete_job(uuid, text, text, jsonb, jsonb, public.ai_confidence) from public, anon, authenticated;
revoke execute on function public.ai_fail_job(uuid, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.ai_log_usage(uuid, text, integer, integer, integer, integer, bigint, integer, text) from public, anon, authenticated;
