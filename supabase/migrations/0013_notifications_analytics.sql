-- SSB Academy — Phase 10 (T089): in-app notifications + platform analytics.
-- Run once in the Supabase SQL Editor, AFTER 0004–0012.
--
-- Design notes
--  * Notifications are written by database triggers on the events themselves
--    (session scheduled/cancelled, assessment opened, submission, review,
--    batch membership, content requests). No app code path can forget one,
--    and no client can create one: there is no insert policy.
--  * A recipient can read their own rows and set only `read_at`.
--  * Platform analytics is one SECURITY DEFINER function that refuses anyone
--    but a super admin, so aggregates are computed in SQL without widening
--    any table's RLS.

create type public.notification_kind as enum (
  'session_scheduled',
  'session_cancelled',
  'assessment_published',
  'submission_received',
  'feedback_reviewed',
  'batch_assigned',
  'content_request_new',
  'content_request_update'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text,
  href text,
  -- The row the event is about (session, assessment, attempt …), for de-duplication.
  ref_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_href_internal check (href is null or href ~ '^/[a-z]')
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx on public.notifications (recipient_id) where read_at is null;

alter table public.notifications enable row level security;

create policy "notifications_read_own" on public.notifications
  for select using (recipient_id = auth.uid());
create policy "notifications_mark_own" on public.notifications
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- Only `read_at` is writable by the recipient.
revoke insert, update, delete on public.notifications from authenticated, anon;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Internal writer. Not callable through the API.
create function public.notify(p_recipient uuid, p_kind public.notification_kind, p_title text, p_body text, p_href text, p_ref uuid, p_dedupe boolean default true)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_recipient is null then
    return;
  end if;
  if p_dedupe and p_ref is not null and exists (
    select 1 from public.notifications n where n.recipient_id = p_recipient and n.kind = p_kind and n.ref_id = p_ref
  ) then
    return;
  end if;
  insert into public.notifications (recipient_id, kind, title, body, href, ref_id)
  values (p_recipient, p_kind, p_title, p_body, p_href, p_ref);
end;
$$;

revoke execute on function public.notify(uuid, public.notification_kind, text, text, text, uuid, boolean) from public, authenticated, anon;

create function public.ist_label(p_at timestamptz)
returns text
language sql immutable
as $$ select to_char(p_at at time zone 'Asia/Kolkata', 'Dy DD Mon, HH12:MI AM') || ' IST' $$;

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------

create function public.notify_session_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
begin
  if new.for_whole_batch and new.status = 'scheduled' then
    for r in select student_id from public.batch_students where batch_id = new.batch_id loop
      perform public.notify(r.student_id, 'session_scheduled', 'New session scheduled', new.title || ' · ' || public.ist_label(new.starts_at), '/student/sessions', new.id);
    end loop;
  end if;
  return new;
end;
$$;

create trigger sessions_notify_insert after insert on public.sessions
  for each row execute function public.notify_session_insert();

-- Selected-student sessions: each participant once (edits that rewrite the list don't repeat it).
create function public.notify_session_participant()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  s public.sessions%rowtype;
begin
  select * into s from public.sessions where id = new.session_id;
  if s.status = 'scheduled' and s.starts_at > now() then
    perform public.notify(new.student_id, 'session_scheduled', 'New session scheduled', s.title || ' · ' || public.ist_label(s.starts_at), '/student/sessions', s.id);
  end if;
  return new;
end;
$$;

create trigger session_participants_notify after insert on public.session_participants
  for each row execute function public.notify_session_participant();

create function public.notify_session_cancelled()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  msg text := new.title || ' · ' || public.ist_label(new.starts_at);
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    for r in
      select bs.student_id as id from public.batch_students bs where new.for_whole_batch and bs.batch_id = new.batch_id
      union
      select sp.student_id from public.session_participants sp where not new.for_whole_batch and sp.session_id = new.id
    loop
      perform public.notify(r.id, 'session_cancelled', 'Session cancelled', msg, '/student/sessions', new.id);
    end loop;
    for r in select p.id from public.profiles p where p.role = 'academy_admin' and p.academy_id = new.academy_id loop
      perform public.notify(r.id, 'session_cancelled', 'Session cancelled', msg, '/academy/sessions', new.id);
    end loop;
  end if;
  return new;
end;
$$;

create trigger sessions_notify_cancelled after update of status on public.sessions
  for each row execute function public.notify_session_cancelled();

-- ---------------------------------------------------------------------------
-- Assessments, submissions, reviews
-- ---------------------------------------------------------------------------

create function public.notify_assessment_published()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    for r in select student_id from public.batch_students where batch_id = new.batch_id loop
      perform public.notify(r.student_id, 'assessment_published', 'New assessment open', new.title, '/student/assessments/' || new.id, new.id);
    end loop;
  end if;
  return new;
end;
$$;

create trigger assessments_notify_published after insert or update of status on public.assessments
  for each row execute function public.notify_assessment_published();

create function public.notify_submission()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  a public.assessments%rowtype;
  who text;
begin
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status <> 'submitted') then
    select * into a from public.assessments where id = new.assessment_id;
    select coalesce(nullif(full_name, ''), 'A student') into who from public.profiles where id = new.student_id;
    perform public.notify(a.mentor_id, 'submission_received', 'Submission to review', who || ' · ' || a.title, '/mentor/evaluations/' || new.id, new.id);
  end if;
  return new;
end;
$$;

create trigger attempts_notify_submitted after insert or update of status on public.assessment_attempts
  for each row execute function public.notify_submission();

create function public.notify_feedback_reviewed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  t public.assessment_attempts%rowtype;
  title text;
begin
  if new.status = 'reviewed' and (tg_op = 'INSERT' or old.status <> 'reviewed') then
    select * into t from public.assessment_attempts where id = new.attempt_id;
    select a.title into title from public.assessments a where a.id = t.assessment_id;
    perform public.notify(t.student_id, 'feedback_reviewed', 'Feedback is ready', title, '/student/assessments/' || t.assessment_id, new.id);
  end if;
  return new;
end;
$$;

create trigger feedback_notify_reviewed after insert or update of status on public.feedback
  for each row execute function public.notify_feedback_reviewed();

-- ---------------------------------------------------------------------------
-- Batch membership
-- ---------------------------------------------------------------------------

create function public.notify_batch_member()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  b text;
begin
  select name into b from public.batches where id = new.batch_id;
  if tg_table_name = 'batch_students' then
    perform public.notify(new.student_id, 'batch_assigned', 'You''ve been added to a batch', b, '/student', new.batch_id);
  else
    perform public.notify(new.mentor_id, 'batch_assigned', 'You''re mentoring a batch', b, '/mentor/mentees', new.batch_id);
  end if;
  return new;
end;
$$;

create trigger batch_students_notify after insert on public.batch_students
  for each row execute function public.notify_batch_member();
create trigger batch_mentors_notify after insert on public.batch_mentors
  for each row execute function public.notify_batch_member();

-- ---------------------------------------------------------------------------
-- Content requests (Phase 5)
-- ---------------------------------------------------------------------------

create function public.notify_content_request()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
begin
  if tg_op = 'INSERT' then
    for r in select id from public.profiles where role = 'super_admin' loop
      perform public.notify(r.id, 'content_request_new', 'New content request', new.title, '/admin/content-requests', new.id);
    end loop;
  elsif new.status <> old.status then
    -- One per status change, so no de-duplication here.
    perform public.notify(new.mentor_id, 'content_request_update', 'Content request ' || replace(new.status::text, '_', ' '), new.title, '/mentor/content/requests', new.id, false);
  end if;
  return new;
end;
$$;

create trigger content_requests_notify after insert or update of status on public.content_requests
  for each row execute function public.notify_content_request();

-- ---------------------------------------------------------------------------
-- Platform analytics (Super Admin only)
-- ---------------------------------------------------------------------------

create function public.platform_analytics(p_since timestamptz)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  with
  scores as (
    select t.student_id, a.academy_id, f.reviewed_at, (f.score / a.max_score) * 100 as pct
    from public.feedback f
    join public.assessment_attempts t on t.id = f.attempt_id
    join public.assessments a on a.id = t.assessment_id
    where f.status = 'reviewed' and f.score is not null
  ),
  att as (
    select s.academy_id, sa.status, sa.marked_at
    from public.session_attendance sa
    join public.sessions s on s.id = sa.session_id
  ),
  per_academy as (
    select
      ac.id, ac.name, ac.status,
      (select count(*) from public.profiles p where p.academy_id = ac.id and p.role = 'student') as students,
      (select count(*) from public.profiles p where p.academy_id = ac.id and p.role = 'mentor') as mentors,
      (select count(*) from public.batches b where b.academy_id = ac.id and b.status = 'active') as batches,
      (select count(*) from public.sessions s where s.academy_id = ac.id and s.status <> 'cancelled' and s.ends_at between p_since and now()) as sessions_held,
      (select count(*) from public.assessment_attempts t join public.assessments a on a.id = t.assessment_id
         where a.academy_id = ac.id and t.status = 'submitted' and t.submitted_at >= p_since) as submissions,
      (select count(*) from scores sc where sc.academy_id = ac.id and sc.reviewed_at >= p_since) as reviews,
      (select round(avg(sc.pct), 1) from scores sc where sc.academy_id = ac.id and sc.reviewed_at >= p_since) as avg_score_pct,
      (select round(100.0 * count(*) filter (where x.status = 'present') / nullif(count(*) filter (where x.status in ('present', 'absent')), 0), 1)
         from att x where x.academy_id = ac.id and x.marked_at >= p_since) as attendance_pct
    from public.academies ac
  ),
  months as (
    select generate_series(date_trunc('month', now() at time zone 'Asia/Kolkata') - interval '5 months', date_trunc('month', now() at time zone 'Asia/Kolkata'), interval '1 month') as m
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'academies', (select count(*) from public.academies),
      'academiesActive', (select count(*) from public.academies where status = 'active'),
      'students', (select count(*) from public.profiles where role = 'student'),
      'mentors', (select count(*) from public.profiles where role = 'mentor'),
      'academyAdmins', (select count(*) from public.profiles where role = 'academy_admin'),
      'batchesActive', (select count(*) from public.batches where status = 'active'),
      'newUsers', (select count(*) from public.profiles where created_at >= p_since)
    ),
    'activity', jsonb_build_object(
      'sessionsHeld', (select coalesce(sum(sessions_held), 0) from per_academy),
      'submissions', (select coalesce(sum(submissions), 0) from per_academy),
      'reviews', (select count(*) from scores where reviewed_at >= p_since),
      'avgScorePct', (select round(avg(pct), 1) from scores where reviewed_at >= p_since),
      'attendancePct', (select round(100.0 * count(*) filter (where status = 'present') / nullif(count(*) filter (where status in ('present', 'absent')), 0), 1) from att where marked_at >= p_since),
      'libraryCompletions', (select count(*) from public.content_progress where completed_at >= p_since)
    ),
    'academies', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'status', status, 'students', students, 'mentors', mentors, 'batches', batches,
        'sessionsHeld', sessions_held, 'submissions', submissions, 'reviews', reviews,
        'avgScorePct', avg_score_pct, 'attendancePct', attendance_pct) order by name) from per_academy), '[]'::jsonb),
    'monthly', (select jsonb_agg(jsonb_build_object(
        'month', to_char(m, 'YYYY-MM'),
        'newUsers', (select count(*) from public.profiles p where date_trunc('month', p.created_at at time zone 'Asia/Kolkata') = m),
        'submissions', (select count(*) from public.assessment_attempts t where t.status = 'submitted' and date_trunc('month', t.submitted_at at time zone 'Asia/Kolkata') = m),
        'reviews', (select count(*) from scores sc where date_trunc('month', sc.reviewed_at at time zone 'Asia/Kolkata') = m)
      ) order by m) from months),
    'content', coalesce((select jsonb_agg(jsonb_build_object('category', category, 'published', n) order by category)
        from (select category, count(*) as n from public.contents where status = 'published' group by category) c), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke execute on function public.platform_analytics(timestamptz) from public, anon;
grant execute on function public.platform_analytics(timestamptz) to authenticated;
