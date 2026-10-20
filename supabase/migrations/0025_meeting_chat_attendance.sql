-- SSB Academy — T094: meeting chat, connected-time attendance (75% rule),
-- and server-side completion of overdue meetings.
-- Run once in the Supabase SQL Editor, AFTER 0024. Forward-only.
--
-- Design notes (specs.md §8a.4h)
--  * Who may take part in a live meeting is ONE rule, can_join_live_meeting():
--    its host mentor, an active admin of its academy, or a student of its
--    audience (the whole batch as enrolled NOW, or the one-to-one student),
--    minus anyone removed. Chat, reactions and joining all use it.
--  * Chat is stored (history for late joiners and after reconnects) and is
--    only ever written through post_live_meeting_message(): the caller must be
--    in the meeting, the meeting must be live, and there is a light rate
--    limit. No client INSERT policy exists. The app then broadcasts the
--    stored row through LiveKit; clients cannot publish data themselves.
--  * Attendance = connected time, from LiveKit's signed webhooks only:
--      - join/leave rows are keyed by LiveKit's participant sid, written with
--        the PROVIDER's timestamps, so duplicates and out-of-order events
--        give the same result; room_finished closes anything left open.
--      - eligible time = the UNION of a student's intervals (no double
--        counting of two tabs / reconnects) clipped to the scheduled window
--        [starts_at, ends_at] and to the actual end.
--      - Present when eligible time >= 75% of the SCHEDULED duration;
--        otherwise Absent — decided only once the meeting has ended.
--    The result goes into the existing session_attendance (marked_by NULL =
--    computed), with the seconds kept for audit. A mentor's own mark is never
--    overwritten (its seconds are still recorded). Re-running is idempotent.
--  * Earlier, a student was marked present the moment they joined (0022/0023).
--    That rule is replaced here.

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------

alter table public.sessions
  add column attendance_finalized_at timestamptz;

alter table public.session_attendance
  add column connected_seconds integer check (connected_seconds is null or connected_seconds >= 0),
  add column required_seconds integer check (required_seconds is null or required_seconds >= 0),
  add column computed_at timestamptz;

-- The guard (0022) also protects the new server-owned column.
create or replace function public.guard_live_meeting_finalized()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if coalesce(current_setting('app.live_meeting_rpc', true), '') <> 'on'
     and new.attendance_finalized_at is distinct from old.attendance_finalized_at then
    raise exception 'attendance is finalized by the server' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger sessions_live_finalized_guard before update on public.sessions
  for each row execute function public.guard_live_meeting_finalized();

-- ---------------------------------------------------------------------------
-- 2. Who may take part
-- ---------------------------------------------------------------------------

-- Asking about someone else is limited to server contexts (no auth.uid())
-- and staff who can see the session, so students can't probe membership.
create function public.can_join_live_meeting(p_session uuid, p_user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select (p_user = auth.uid() or auth.uid() is null or (public.can_see_session(p_session) and public.current_user_role() <> 'student'))
  and exists (
    select 1 from public.sessions s
    where s.id = p_session and s.meeting_kind is not null
      and not exists (select 1 from public.live_meeting_removals r where r.session_id = s.id and r.user_id = p_user)
      and (
        (s.mentor_id = p_user and exists (select 1 from public.batch_mentors bm where bm.batch_id = s.batch_id and bm.mentor_id = p_user))
        or exists (select 1 from public.profiles p where p.id = p_user and p.role = 'academy_admin' and p.status = 'active' and p.academy_id = s.academy_id)
        or exists (
          select 1 from public.profiles p where p.id = p_user and p.role = 'student' and p.status = 'active'
            and (
              (s.for_whole_batch and exists (select 1 from public.batch_students bs where bs.batch_id = s.batch_id and bs.student_id = p_user))
              or (not s.for_whole_batch and exists (select 1 from public.session_participants sp where sp.session_id = s.id and sp.student_id = p_user))
            )
        )
      )
  )
$$;

-- How many students the meeting is for (for "8 / 12 joined"); only for
-- someone who can see the session.
create function public.live_meeting_audience_count(p_session uuid)
returns integer
language sql stable security definer set search_path = public
as $$
  select case when not public.can_see_session(p_session) then null else (
    select case when s.for_whole_batch
      then (select count(*)::int from public.batch_students bs where bs.batch_id = s.batch_id)
      else (select count(*)::int from public.session_participants sp where sp.session_id = s.id) end
    from public.sessions s where s.id = p_session
  ) end
$$;

-- Host (mentor) names for sessions the caller can see. Students can't read a
-- mentor's profile row (profiles RLS), so lists and meeting pages showed no
-- host. Returns ONLY the name, only for visible sessions; no RLS is widened.
create function public.session_host_names(p_sessions uuid[])
returns table (session_id uuid, host_name text)
language sql stable security definer set search_path = public
as $$
  select s.id, p.full_name
  from public.sessions s
  join public.profiles p on p.id = s.mentor_id
  where s.id = any(p_sessions) and public.can_see_session(s.id)
$$;

-- ---------------------------------------------------------------------------
-- 3. Chat
-- ---------------------------------------------------------------------------

create table public.live_meeting_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index live_meeting_messages_session_idx on public.live_meeting_messages (session_id, created_at);

alter table public.live_meeting_messages enable row level security;

-- Read: people who may take part in that meeting, and staff who can see it.
create policy "live_messages_read" on public.live_meeting_messages
  for select using (
    public.can_join_live_meeting(session_id, auth.uid())
    or (public.can_see_session(session_id) and public.current_user_role() <> 'student')
  );
-- No insert/update/delete policies: post_live_meeting_message() only.

create function public.post_live_meeting_message(p_session uuid, p_body text)
returns table (id uuid, sender_id uuid, sender_name text, body text, created_at timestamptz)
language plpgsql
security definer set search_path = public
as $$
declare
  s public.sessions%rowtype;
  clean text := btrim(coalesce(p_body, ''));
  v_id uuid;
begin
  if auth.uid() is null or not public.can_join_live_meeting(p_session, auth.uid()) then
    raise exception 'meeting not found' using errcode = 'P0002';
  end if;
  select * into s from public.sessions where sessions.id = p_session;
  if s.status <> 'scheduled' or s.actual_started_at is null or s.actual_ended_at is not null or now() >= s.ends_at then
    raise exception 'this meeting is not live' using errcode = 'MT008';
  end if;
  if char_length(clean) not between 1 and 1000 then
    raise exception 'messages are 1–1000 characters' using errcode = '22023';
  end if;
  if (select count(*) from public.live_meeting_messages m
      where m.session_id = p_session and m.sender_id = auth.uid() and m.created_at > now() - interval '30 seconds') >= 20 then
    raise exception 'slow down a little' using errcode = 'MT010';
  end if;
  insert into public.live_meeting_messages (session_id, sender_id, body) values (p_session, auth.uid(), clean)
    returning live_meeting_messages.id into v_id;
  return query
    select m.id, m.sender_id, coalesce(nullif(p.full_name, ''), 'Participant'), m.body, m.created_at
    from public.live_meeting_messages m join public.profiles p on p.id = m.sender_id
    where m.id = v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Attendance: events, connected time, finalization
-- ---------------------------------------------------------------------------

-- Replaces 0022/0023's 4-argument version: provider timestamps, any order.
drop function public.record_live_meeting_event(uuid, uuid, text, text);

create function public.record_live_meeting_event(
  p_session uuid,
  p_user uuid,
  p_participant_sid text,
  p_event text,
  p_joined_at timestamptz,
  p_event_at timestamptz
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  s public.sessions%rowtype;
  v_join timestamptz;
  v_at timestamptz := coalesce(p_event_at, now());
begin
  select * into s from public.sessions where id = p_session;
  if not found or s.meeting_kind is null then
    return;
  end if;

  if p_event = 'room_finished' then
    update public.live_meeting_attendance
      set left_at = greatest(v_at, joined_at)
      where session_id = p_session and left_at is null;
  elsif p_event in ('participant_joined', 'participant_left') then
    -- Removed people, and anyone with an interval already open (e.g. who left
    -- the batch mid-meeting), still get their interval recorded and closed.
    if p_user is null or not (
      public.can_join_live_meeting(p_session, p_user)
      or exists (select 1 from public.live_meeting_removals r where r.session_id = p_session and r.user_id = p_user)
      or exists (select 1 from public.live_meeting_attendance a where a.session_id = p_session and a.user_id = p_user)
    ) then
      return;
    end if;
    v_join := least(coalesce(p_joined_at, v_at), v_at);
    if p_event = 'participant_joined' then
      insert into public.live_meeting_attendance (session_id, user_id, participant_sid, joined_at)
      values (p_session, p_user, p_participant_sid, v_join)
      on conflict (session_id, participant_sid)
        do update set joined_at = least(live_meeting_attendance.joined_at, excluded.joined_at);
    else
      insert into public.live_meeting_attendance (session_id, user_id, participant_sid, joined_at, left_at)
      values (p_session, p_user, p_participant_sid, v_join, greatest(v_at, v_join))
      on conflict (session_id, participant_sid)
        do update set
          joined_at = least(live_meeting_attendance.joined_at, excluded.joined_at),
          left_at = greatest(coalesce(live_meeting_attendance.left_at, excluded.left_at), excluded.left_at, least(live_meeting_attendance.joined_at, excluded.joined_at));
    end if;
  else
    return;
  end if;

  -- A late event after the meeting was finalized: recompute (idempotent).
  if s.attendance_finalized_at is not null then
    perform public.finalize_live_attendance(p_session);
  end if;
end;
$$;

-- Eligible connected seconds per person: the union of their intervals,
-- clipped to the scheduled window and to the end (actual end, or now while
-- live). Open intervals of an ended meeting stop at its end.
create function public.live_meeting_connected_seconds(p_session uuid)
returns table (user_id uuid, connected_seconds integer, joins integer, first_joined_at timestamptz, last_left_at timestamptz, still_connected boolean)
language sql stable security definer set search_path = public
as $$
  with s as (
    select id, starts_at, ends_at, least(ends_at, coalesce(actual_ended_at, now())) as cap
    from public.sessions where id = p_session
  ),
  iv as (
    select a.user_id, a.joined_at, a.left_at,
           greatest(a.joined_at, s.starts_at) as lo,
           least(coalesce(a.left_at, s.cap), s.cap) as hi
    from public.live_meeting_attendance a, s
    where a.session_id = s.id
  ),
  clipped as (
    select user_id, lo, hi from iv where hi > lo
  ),
  ordered as (
    select user_id, lo, hi,
           max(hi) over (partition by user_id order by lo, hi rows between unbounded preceding and 1 preceding) as prev_hi
    from clipped
  ),
  grouped as (
    select user_id, lo, hi,
           sum(case when prev_hi is null or lo > prev_hi then 1 else 0 end) over (partition by user_id order by lo, hi rows unbounded preceding) as g
    from ordered
  ),
  merged as (
    select user_id, min(lo) as lo, max(hi) as hi from grouped group by user_id, g
  ),
  totals as (
    select user_id, floor(sum(extract(epoch from hi - lo)))::int as secs from merged group by user_id
  )
  select iv.user_id,
         coalesce(max(t.secs), 0)::int,
         count(*)::int,
         min(iv.joined_at),
         max(iv.left_at),
         bool_or(iv.left_at is null)
  from iv left join totals t on t.user_id = iv.user_id
  group by iv.user_id
$$;

-- Present/Absent for every student of the audience, once the meeting ended.
-- Server-side only (called by end_live_meeting, the webhook and the sweep).
create function public.finalize_live_attendance(p_session uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  s public.sessions%rowtype;
  v_required integer;
begin
  select * into s from public.sessions where id = p_session for update;
  if not found or s.meeting_kind is null or s.status <> 'completed' or s.actual_started_at is null then
    return false;
  end if;
  -- session_attendance can only be written once the scheduled start passed.
  if now() < s.starts_at then
    return false;
  end if;
  v_required := ceil(extract(epoch from s.ends_at - s.starts_at) * 0.75)::int;

  with audience as (
    select bs.student_id from public.batch_students bs where s.for_whole_batch and bs.batch_id = s.batch_id
    union
    select sp.student_id from public.session_participants sp where not s.for_whole_batch and sp.session_id = s.id
  ),
  secs as (
    select a.student_id, coalesce(c.connected_seconds, 0) as connected
    from audience a left join public.live_meeting_connected_seconds(p_session) c on c.user_id = a.student_id
  )
  insert into public.session_attendance (session_id, student_id, status, marked_by, connected_seconds, required_seconds, computed_at)
  select p_session, secs.student_id,
         (case when secs.connected >= v_required then 'present' else 'absent' end)::public.attendance_status,
         null, secs.connected, v_required, now()
  from secs
  on conflict (session_id, student_id) do update set
    status = case when session_attendance.marked_by is null then excluded.status else session_attendance.status end,
    connected_seconds = excluded.connected_seconds,
    required_seconds = excluded.required_seconds,
    computed_at = excluded.computed_at;

  perform set_config('app.live_meeting_rpc', 'on', true);
  update public.sessions set attendance_finalized_at = coalesce(attendance_finalized_at, now()) where id = p_session;
  perform set_config('app.live_meeting_rpc', '', true);
  return true;
end;
$$;

-- End a started meeting (host mentor, academy admin, or anyone who can see it
-- once the scheduled end passed). Safe to repeat: an already-completed meeting
-- just re-runs finalization. Replaces 0023's version.
create or replace function public.end_live_meeting(p_session uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  s public.sessions%rowtype;
  v_end timestamptz;
begin
  select * into s from public.sessions where id = p_session for update;
  if not found or not coalesce(
    s.mentor_id = auth.uid()
    or s.academy_id = public.current_active_admin_academy_id()
    or (public.can_see_session(p_session) and now() >= s.ends_at),
    false
  ) then
    raise exception 'meeting not found' using errcode = 'P0002';
  end if;
  if s.meeting_kind is null or s.actual_started_at is null or s.status = 'cancelled' then
    return false;
  end if;
  if s.status = 'completed' then
    perform public.finalize_live_attendance(p_session);
    return true;
  end if;
  v_end := greatest(least(now(), s.ends_at), s.actual_started_at);

  perform set_config('app.live_meeting_rpc', 'on', true);
  update public.sessions set status = 'completed', actual_ended_at = v_end where id = p_session;
  perform set_config('app.live_meeting_rpc', '', true);

  update public.live_meeting_attendance
    set left_at = greatest(v_end, joined_at)
    where session_id = p_session and left_at is null;

  perform public.finalize_live_attendance(p_session);
  return true;
end;
$$;

-- Server-side enforcement of the scheduled end, and catch-up finalization:
-- completes every started meeting whose end has passed (end = ends_at) and
-- finalizes completed ones not yet finalized. Returns the sessions it ended,
-- so the caller can close their LiveKit rooms. Service role / worker only.
create function public.finish_overdue_live_meetings()
returns setof uuid
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
begin
  for r in
    select id, ends_at, actual_started_at from public.sessions
    where meeting_kind is not null and status = 'scheduled' and actual_started_at is not null and ends_at <= now()
    for update skip locked
  loop
    perform set_config('app.live_meeting_rpc', 'on', true);
    update public.sessions set status = 'completed', actual_ended_at = greatest(r.ends_at, r.actual_started_at) where id = r.id;
    perform set_config('app.live_meeting_rpc', '', true);
    update public.live_meeting_attendance set left_at = greatest(r.ends_at, joined_at) where session_id = r.id and left_at is null;
    perform public.finalize_live_attendance(r.id);
    return next r.id;
  end loop;
  for r in
    select id from public.sessions
    where meeting_kind is not null and status = 'completed' and actual_started_at is not null
      and attendance_finalized_at is null and starts_at <= now()
  loop
    perform public.finalize_live_attendance(r.id);
  end loop;
  return;
end;
$$;

-- Per-person summary for the host/admin "Who joined" table and reports.
create function public.live_meeting_attendance_summary(p_session uuid)
returns table (user_id uuid, connected_seconds integer, required_seconds integer, joins integer, first_joined_at timestamptz, last_left_at timestamptz, still_connected boolean, status public.attendance_status, marked_by_mentor boolean)
language sql stable security definer set search_path = public
as $$
  select c.user_id, c.connected_seconds,
         ceil(extract(epoch from s.ends_at - s.starts_at) * 0.75)::int,
         c.joins, c.first_joined_at, c.last_left_at, c.still_connected,
         sa.status, sa.marked_by is not null
  from public.sessions s
  cross join lateral public.live_meeting_connected_seconds(s.id) c
  left join public.session_attendance sa on sa.session_id = s.id and sa.student_id = c.user_id
  where s.id = p_session
    and public.can_see_session(p_session)
    and public.current_user_role() in ('mentor', 'academy_admin', 'super_admin')
$$;

-- ---------------------------------------------------------------------------
-- 5. Grants
-- ---------------------------------------------------------------------------

revoke execute on function public.guard_live_meeting_finalized() from public, anon, authenticated;
revoke execute on function public.can_join_live_meeting(uuid, uuid) from public, anon;
revoke execute on function public.live_meeting_audience_count(uuid) from public, anon;
revoke execute on function public.session_host_names(uuid[]) from public, anon;
revoke execute on function public.post_live_meeting_message(uuid, text) from public, anon;
revoke execute on function public.record_live_meeting_event(uuid, uuid, text, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.live_meeting_connected_seconds(uuid) from public, anon, authenticated;
revoke execute on function public.finalize_live_attendance(uuid) from public, anon, authenticated;
revoke execute on function public.finish_overdue_live_meetings() from public, anon, authenticated;
revoke execute on function public.live_meeting_attendance_summary(uuid) from public, anon;
grant execute on function public.can_join_live_meeting(uuid, uuid) to authenticated;
grant execute on function public.live_meeting_audience_count(uuid) to authenticated;
grant execute on function public.session_host_names(uuid[]) to authenticated;
grant execute on function public.post_live_meeting_message(uuid, text) to authenticated;
grant execute on function public.live_meeting_attendance_summary(uuid) to authenticated;
grant execute on function public.record_live_meeting_event(uuid, uuid, text, text, timestamptz, timestamptz) to service_role;
grant execute on function public.finish_overdue_live_meetings() to service_role;

notify pgrst, 'reload schema';
