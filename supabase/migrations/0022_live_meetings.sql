-- SSB Academy — T094: live meeting rooms (LiveKit / WebRTC) on sessions.
-- Run once in the Supabase SQL Editor, AFTER 0021. Forward-only and additive:
-- existing sessions (pasted link / offline) are unchanged.
--
-- Design notes (specs.md §8a.4h)
--  * A live meeting IS a session (0010) with meeting_kind set. No second
--    meetings table: the batch, mentor, audience, visibility (can_see_session)
--    and overlap rules all stay in one place.
--      one_to_one  one mentor + exactly one student of a batch they mentor
--      batch       one mentor + every student of the batch (≤ 100 enrolled)
--  * Daily allowance: a mentor may have at most 120 minutes of live meetings
--    per IST calendar day. Scheduled, live and completed meetings count their
--    full SCHEDULED length (ending early never frees time); cancelled ones
--    don't. A meeting that crosses midnight counts on both days. Enforced in a
--    trigger under a per-mentor advisory lock, so two concurrent bookings
--    can't both squeeze in.
--  * Timezone: academies have no timezone setting yet, so every meeting is
--    scheduled and counted in IST (Asia/Kolkata, no DST). The column records
--    it; the check keeps it honest until academies get their own setting.
--  * Server clock only: actual start/end, cancellation time and attendance are
--    written by the functions below with now(); a direct UPDATE from a client
--    cannot set or change them.
--  * Attendance comes from LiveKit's signed webhooks (participant joined /
--    left), written with the service role. Nothing is recorded: no audio or
--    video is ever stored.

create type public.meeting_kind as enum ('one_to_one', 'batch');

alter table public.sessions
  add column meeting_kind public.meeting_kind,
  add column timezone text not null default 'Asia/Kolkata',
  add column actual_started_at timestamptz,
  add column actual_ended_at timestamptz,
  add column ended_early boolean generated always as (actual_ended_at is not null and actual_ended_at < ends_at) stored,
  add column cancelled_at timestamptz,
  add column cancelled_by uuid references public.profiles(id) on delete set null;

-- A live room replaces the pasted link: online, no URL, no location.
alter table public.sessions drop constraint sessions_mode_details;
alter table public.sessions add constraint sessions_mode_details check (
  (meeting_kind is not null and mode = 'online' and meeting_url is null and location is null)
  or (meeting_kind is null and mode = 'online' and meeting_url ~ '^https://')
  or (meeting_kind is null and mode = 'offline' and coalesce(btrim(location), '') <> '')
);

alter table public.sessions
  add constraint sessions_meeting_audience check (
    meeting_kind is null
    or (meeting_kind = 'batch' and for_whole_batch)
    or (meeting_kind = 'one_to_one' and not for_whole_batch)
  ),
  add constraint sessions_meeting_duration check (
    meeting_kind is null or (ends_at - starts_at between interval '15 minutes' and interval '120 minutes')
  ),
  add constraint sessions_meeting_timezone check (timezone = 'Asia/Kolkata'),
  add constraint sessions_actual_order check (
    actual_ended_at is null or (actual_started_at is not null and actual_ended_at >= actual_started_at)
  );

create index sessions_mentor_live_idx on public.sessions (mentor_id, starts_at) where meeting_kind is not null and status <> 'cancelled';

-- ---------------------------------------------------------------------------
-- 1. Guard: server-owned columns, reschedule rules, daily allowance, batch size
-- ---------------------------------------------------------------------------

create function public.guard_live_meeting()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  trusted boolean := coalesce(current_setting('app.live_meeting_rpc', true), '') = 'on';
  tz constant text := 'Asia/Kolkata';
  limit_seconds constant integer := 120 * 60;
  day_key date;
  day_start timestamptz;
  used_seconds numeric;
  new_seconds numeric;
  enrolled integer;
  timing_changed boolean;
begin
  if tg_op = 'INSERT' then
    new.actual_started_at := null;
    new.actual_ended_at := null;
    new.cancelled_at := null;
    new.cancelled_by := null;
    timing_changed := true;
  else
    if not trusted then
      if new.actual_started_at is distinct from old.actual_started_at or new.actual_ended_at is distinct from old.actual_ended_at then
        raise exception 'actual meeting times are set by the server' using errcode = '42501';
      end if;
      if new.meeting_kind is not null and new.status = 'completed' and old.status <> 'completed' then
        raise exception 'end a live meeting from its room controls' using errcode = 'MT006';
      end if;
    end if;
    if old.actual_started_at is not null
       and (new.starts_at, new.ends_at, new.batch_id, new.mentor_id, new.meeting_kind, new.for_whole_batch)
           is distinct from (old.starts_at, old.ends_at, old.batch_id, old.mentor_id, old.meeting_kind, old.for_whole_batch) then
      raise exception 'a meeting that has started can''t be rescheduled' using errcode = 'MT006';
    end if;
    if new.status = 'cancelled' and old.status <> 'cancelled' then
      if old.actual_started_at is not null then
        raise exception 'a meeting that has started can''t be cancelled; end it instead' using errcode = 'MT006';
      end if;
      new.cancelled_at := now();
      new.cancelled_by := auth.uid();
    else
      new.cancelled_at := old.cancelled_at;
      new.cancelled_by := old.cancelled_by;
    end if;
    timing_changed := (new.starts_at, new.ends_at, new.mentor_id, new.meeting_kind, new.status)
      is distinct from (old.starts_at, old.ends_at, old.mentor_id, old.meeting_kind, old.status);
  end if;

  if new.meeting_kind is null or new.status <> 'scheduled' or not timing_changed then
    return new;
  end if;

  -- One booking at a time per mentor, held until commit: a concurrent request
  -- waits here and then sees this one's row.
  perform pg_advisory_xact_lock(hashtextextended('live-meeting-allowance:' || new.mentor_id::text, 0));

  if tg_op = 'INSERT' or (new.starts_at, new.ends_at) is distinct from (old.starts_at, old.ends_at) then
    if new.starts_at <= now() then
      raise exception 'choose a start time in the future' using errcode = 'MT004';
    end if;
    if new.starts_at > now() + interval '90 days' then
      raise exception 'meetings can be scheduled up to 90 days ahead' using errcode = 'MT004';
    end if;
  end if;

  if new.meeting_kind = 'batch' then
    select count(*) into enrolled from public.batch_students where batch_id = new.batch_id;
    if enrolled > 100 then
      raise exception 'batch meetings allow at most 100 enrolled students; this batch has %', enrolled
        using errcode = 'MT002', detail = format('enrolled=%s', enrolled);
    end if;
  end if;

  for day_key in
    select d::date from generate_series(
      (new.starts_at at time zone tz)::date,
      ((new.ends_at - interval '1 microsecond') at time zone tz)::date,
      interval '1 day'
    ) as d
  loop
    day_start := day_key::timestamp at time zone tz;
    select coalesce(sum(extract(epoch from least(s.ends_at, day_start + interval '1 day') - greatest(s.starts_at, day_start))), 0)
      into used_seconds
      from public.sessions s
      where s.mentor_id = new.mentor_id
        and s.id <> new.id
        and s.meeting_kind is not null
        and s.status <> 'cancelled'
        and s.starts_at < day_start + interval '1 day'
        and s.ends_at > day_start;
    new_seconds := extract(epoch from least(new.ends_at, day_start + interval '1 day') - greatest(new.starts_at, day_start));
    if used_seconds + new_seconds > limit_seconds then
      raise exception 'daily meeting limit reached for %', day_key
        using errcode = 'MT001', detail = format('day=%s;used=%s;limit=%s', day_key, round(used_seconds / 60), limit_seconds / 60);
    end if;
  end loop;

  return new;
end;
$$;

-- Fires before sessions_prepare (alphabetical), which only fills academy_id.
create trigger sessions_live_guard before insert or update on public.sessions
  for each row execute function public.guard_live_meeting();

-- Audience rules for live meetings: batch meetings have no participant list;
-- one-to-one has exactly one; nothing changes once the meeting has started.
create function public.guard_live_meeting_participant()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  s public.sessions%rowtype;
begin
  select * into s from public.sessions where id = coalesce(new.session_id, old.session_id);
  if s.meeting_kind is null then
    return coalesce(new, old);
  end if;
  if s.actual_started_at is not null then
    raise exception 'participants can''t change once the meeting has started' using errcode = 'MT006';
  end if;
  if tg_op <> 'DELETE' then
    if s.meeting_kind = 'batch' then
      raise exception 'a batch meeting includes the whole batch' using errcode = 'MT003';
    end if;
    if exists (select 1 from public.session_participants sp where sp.session_id = s.id and sp.student_id <> new.student_id) then
      raise exception 'a one-to-one meeting has exactly one student' using errcode = 'MT003';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger session_participants_live_guard before insert or update or delete on public.session_participants
  for each row execute function public.guard_live_meeting_participant();

-- ---------------------------------------------------------------------------
-- 2. Attendance (from LiveKit webhooks) and removals
-- ---------------------------------------------------------------------------

create table public.live_meeting_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  participant_sid text not null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  constraint live_meeting_attendance_sid unique (session_id, participant_sid),
  constraint live_meeting_attendance_order check (left_at is null or left_at >= joined_at)
);

create index live_meeting_attendance_session_idx on public.live_meeting_attendance (session_id, user_id);
create index live_meeting_attendance_user_idx on public.live_meeting_attendance (user_id);

create table public.live_meeting_removals (
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  removed_by uuid references public.profiles(id) on delete set null,
  removed_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

alter table public.live_meeting_attendance enable row level security;
alter table public.live_meeting_removals enable row level security;

-- Read: your own rows, or staff who can see the session. No client writes —
-- rows come from record_live_meeting_event() (service role) only.
create policy "live_attendance_read" on public.live_meeting_attendance
  for select using (user_id = auth.uid() or (public.can_see_session(session_id) and public.current_user_role() <> 'student'));

create policy "live_removals_read" on public.live_meeting_removals
  for select using (user_id = auth.uid() or (public.can_see_session(session_id) and public.current_user_role() <> 'student'));
create policy "live_removals_mentor_insert" on public.live_meeting_removals
  for insert with check (
    removed_by = auth.uid() and user_id <> auth.uid()
    and exists (select 1 from public.sessions s where s.id = session_id and s.mentor_id = auth.uid() and s.meeting_kind is not null)
  );
create policy "live_removals_mentor_delete" on public.live_meeting_removals
  for delete using (exists (select 1 from public.sessions s where s.id = session_id and s.mentor_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 3. Functions
-- ---------------------------------------------------------------------------

-- Create or edit a live meeting in one transaction (session + its one student).
-- SECURITY INVOKER: the mentor's own RLS and every trigger above still apply.
create function public.save_live_meeting(
  p_session uuid,
  p_kind public.meeting_kind,
  p_batch uuid,
  p_student uuid,
  p_title text,
  p_description text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns uuid
language plpgsql
security invoker set search_path = public
as $$
declare
  v_batch uuid;
  v_id uuid;
  v_count integer;
begin
  if public.current_user_role() is distinct from 'mentor' then
    raise exception 'only a mentor can schedule meetings' using errcode = '42501';
  end if;
  if p_kind = 'one_to_one' then
    select batch_id into v_batch from public.batch_students where student_id = p_student;
  else
    v_batch := p_batch;
  end if;
  if v_batch is null or not public.is_batch_mentor(v_batch) then
    raise exception 'that batch or student isn''t one you mentor' using errcode = 'MT003';
  end if;

  -- No RETURNING: the select policy (can_see_session) can't see a row the
  -- same statement inserts, so the id is chosen here and row counts checked.
  if p_session is null then
    v_id := gen_random_uuid();
    insert into public.sessions (id, batch_id, mentor_id, created_by, title, description, starts_at, ends_at, mode, meeting_kind, for_whole_batch, timezone)
    values (v_id, v_batch, auth.uid(), auth.uid(), p_title, p_description, p_starts_at, p_ends_at, 'online', p_kind, p_kind = 'batch', 'Asia/Kolkata');
  else
    delete from public.session_participants where session_id = p_session
      and exists (select 1 from public.sessions s where s.id = p_session and s.mentor_id = auth.uid() and s.status = 'scheduled' and s.actual_started_at is null);
    update public.sessions
      set batch_id = v_batch, title = p_title, description = p_description, starts_at = p_starts_at, ends_at = p_ends_at,
          mode = 'online', meeting_url = null, location = null, meeting_kind = p_kind, for_whole_batch = p_kind = 'batch'
      where id = p_session and mentor_id = auth.uid() and status = 'scheduled' and actual_started_at is null;
    get diagnostics v_count = row_count;
    v_id := p_session;
    if v_count = 0 then
      raise exception 'meeting not found or no longer editable' using errcode = 'P0002';
    end if;
  end if;

  if p_kind = 'one_to_one' then
    insert into public.session_participants (session_id, student_id) values (v_id, p_student);
  end if;
  return v_id;
end;
$$;

-- The mentor opens the room: from 15 minutes before the start until the end.
create function public.start_live_meeting(p_session uuid)
returns timestamptz
language plpgsql
security definer set search_path = public
as $$
declare
  s public.sessions%rowtype;
begin
  select * into s from public.sessions where id = p_session for update;
  if not found or s.mentor_id is distinct from auth.uid() or not public.is_batch_mentor(s.batch_id) then
    raise exception 'meeting not found' using errcode = 'P0002';
  end if;
  if s.meeting_kind is null then
    raise exception 'this session has no live room' using errcode = 'MT005';
  end if;
  if s.status <> 'scheduled' then
    raise exception 'this meeting is %', s.status using errcode = 'MT006';
  end if;
  if now() < s.starts_at - interval '15 minutes' then
    raise exception 'the room opens 15 minutes before the start' using errcode = 'MT007';
  end if;
  if now() >= s.ends_at then
    raise exception 'the scheduled time has passed' using errcode = 'MT008';
  end if;
  if s.actual_started_at is null then
    perform set_config('app.live_meeting_rpc', 'on', true);
    update public.sessions set actual_started_at = now() where id = p_session returning actual_started_at into s.actual_started_at;
    perform set_config('app.live_meeting_rpc', '', true);
  end if;
  return s.actual_started_at;
end;
$$;

-- End a started meeting: the mentor at any time, or anyone who can see it once
-- the scheduled end has passed (the end is then clamped to the schedule, so
-- it's the same result whoever triggers it). Closes open attendance and marks
-- students who joined as present, without overwriting the mentor's marks.
-- Returns false when there was nothing to end (never started / already done).
create function public.end_live_meeting(p_session uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  s public.sessions%rowtype;
  v_end timestamptz;
begin
  select * into s from public.sessions where id = p_session for update;
  if not found or not (s.mentor_id = auth.uid() or (public.can_see_session(p_session) and now() >= s.ends_at)) then
    raise exception 'meeting not found' using errcode = 'P0002';
  end if;
  if s.meeting_kind is null or s.status <> 'scheduled' or s.actual_started_at is null then
    return false;
  end if;
  v_end := greatest(least(now(), s.ends_at), s.actual_started_at);

  perform set_config('app.live_meeting_rpc', 'on', true);
  update public.sessions set status = 'completed', actual_ended_at = v_end where id = p_session;
  perform set_config('app.live_meeting_rpc', '', true);

  update public.live_meeting_attendance
    set left_at = greatest(v_end, joined_at)
    where session_id = p_session and left_at is null;

  if now() >= s.starts_at then
    insert into public.session_attendance (session_id, student_id, status, marked_by)
    select distinct a.session_id, a.user_id, 'present'::public.attendance_status, null::uuid
      from public.live_meeting_attendance a
      join public.profiles p on p.id = a.user_id and p.role = 'student'
      where a.session_id = p_session
    on conflict (session_id, student_id) do nothing;
  end if;
  return true;
end;
$$;

-- LiveKit webhook events (signature verified by the app), service role only.
-- Only the meeting's mentor and its audience are recorded; anything else is
-- ignored. A student who joins after the start is marked present at once
-- (never overwriting a mark the mentor made).
create function public.record_live_meeting_event(p_session uuid, p_user uuid, p_participant_sid text, p_event text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  s public.sessions%rowtype;
  is_student boolean;
begin
  select * into s from public.sessions where id = p_session;
  if not found or s.meeting_kind is null then
    return;
  end if;
  is_student := exists (
    select 1 from public.profiles p where p.id = p_user and p.role = 'student'
      and (
        (s.for_whole_batch and exists (select 1 from public.batch_students bs where bs.batch_id = s.batch_id and bs.student_id = p_user))
        or (not s.for_whole_batch and exists (select 1 from public.session_participants sp where sp.session_id = s.id and sp.student_id = p_user))
      )
  );
  if p_user <> s.mentor_id and not is_student then
    return;
  end if;

  if p_event = 'participant_joined' then
    insert into public.live_meeting_attendance (session_id, user_id, participant_sid)
    values (p_session, p_user, p_participant_sid)
    on conflict (session_id, participant_sid) do nothing;
    if is_student and now() >= s.starts_at and s.status <> 'cancelled' then
      insert into public.session_attendance (session_id, student_id, status, marked_by)
      values (p_session, p_user, 'present', null)
      on conflict (session_id, student_id) do nothing;
    end if;
  elsif p_event = 'participant_left' then
    update public.live_meeting_attendance
      set left_at = now()
      where session_id = p_session and participant_sid = p_participant_sid and left_at is null;
  end if;
end;
$$;

revoke execute on function public.save_live_meeting(uuid, public.meeting_kind, uuid, uuid, text, text, timestamptz, timestamptz) from public, anon;
revoke execute on function public.start_live_meeting(uuid) from public, anon;
revoke execute on function public.end_live_meeting(uuid) from public, anon;
revoke execute on function public.record_live_meeting_event(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.save_live_meeting(uuid, public.meeting_kind, uuid, uuid, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.start_live_meeting(uuid) to authenticated;
grant execute on function public.end_live_meeting(uuid) to authenticated;
grant execute on function public.record_live_meeting_event(uuid, uuid, text, text) to service_role;

notify pgrst, 'reload schema';
