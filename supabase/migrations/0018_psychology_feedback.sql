-- SSB Academy — T102: AI feedback on psychology practice (TAT/WAT/SRT/SD).
-- Run once in the Supabase SQL Editor, AFTER 0017.
--
--  * Submitting a timed psychology test (practice_attempts, mode 'test', bank
--    tat/wat/srt/sdt) enqueues one AI evaluation in the same transaction, using
--    the rubric for that test (worker/src/rubrics/psychology.ts). The answers
--    are already stored, so the student loses nothing if the AI fails.
--  * When the evaluation is stored, the student is notified.
--  * Timers are configurable per bank (FR-PSY-01); the app falls back to its
--    standard timings when a bank has none.

alter type public.notification_kind add value if not exists 'ai_feedback_ready';

-- {"mode": "carousel", "stimulusSeconds"?: int, "responseSeconds": int} or
-- {"mode": "budget", "totalSeconds": int}
alter table public.practice_banks add column timing jsonb;
alter table public.practice_banks add constraint practice_banks_timing check (
  timing is null
  or (timing->>'mode' = 'carousel'
      and (timing->>'responseSeconds')::int between 5 and 900
      and coalesce((timing->>'stimulusSeconds')::int, 0) between 0 and 120)
  or (timing->>'mode' = 'budget' and (timing->>'totalSeconds')::int between 60 and 7200)
);

-- Super admins set timers (banks are otherwise not writable through the API).
create function public.set_practice_bank_timing(p_slug text, p_timing jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.practice_banks set timing = p_timing where slug = p_slug;
  if not found then
    raise exception 'no such bank' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.set_practice_bank_timing(text, jsonb) from public, anon;
grant execute on function public.set_practice_bank_timing(text, jsonb) to authenticated;

create function public.enqueue_psychology_feedback()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  items jsonb;
begin
  if new.mode <> 'test' or new.bank_slug not in ('tat', 'wat', 'srt', 'sdt') then
    return new;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('prompt', i.prompt, 'response', coalesce(a.value->>'response', '')) order by i.position), '[]'::jsonb)
  into items
  from jsonb_array_elements(new.answers) a
  join public.practice_items i on i.id::text = a.value->>'itemId';
  -- Nothing written means nothing to evaluate.
  if not exists (select 1 from jsonb_array_elements(items) x where btrim(x->>'response') <> '') then
    return new;
  end if;
  perform public.enqueue_ai_evaluation('practice_attempt', new.id, new.student_id, 'psychology-' || new.bank_slug, 1,
    jsonb_build_object('items', items, 'context', jsonb_build_object('test', new.bank_slug)));
  return new;
end;
$$;

create trigger practice_attempts_ai_feedback after insert on public.practice_attempts
  for each row execute function public.enqueue_psychology_feedback();

create function public.notify_ai_feedback()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.subject_type = 'practice_attempt' and new.rubric_id like 'psychology-%' then
    perform public.notify(new.student_id, 'ai_feedback_ready', 'Your practice feedback is ready',
      upper(replace(new.rubric_id, 'psychology-', '')) || ' practice', '/student/practice/psychology/results/' || new.subject_id, new.id);
  end if;
  return new;
end;
$$;

create trigger ai_evaluations_notify after insert on public.ai_evaluations
  for each row execute function public.notify_ai_feedback();
