-- SSB Academy — T094: academy admins schedule and run live meetings.
-- Run once in the Supabase SQL Editor, AFTER 0022. Forward-only, additive.
--
-- Design notes (specs.md §8a.4h)
--  * An academy admin schedules a meeting ON BEHALF OF a host mentor who
--    teaches that batch. sessions.mentor_id stays the host; created_by records
--    the admin. The 120-minute daily cap (0022) is the HOST MENTOR's, whoever
--    books: an admin's booking uses the mentor's allowance under the same
--    per-mentor lock. Admins have no allowance of their own; joining a meeting
--    as a co-host doesn't count against anything.
--  * Admin writes go ONLY through the SECURITY DEFINER functions below, each
--    checking "caller is an ACTIVE academy admin of this session's academy".
--    No new direct write policy on sessions: an admin can't PATCH a session
--    row through the API. Every 0022 trigger (duration, cap, batch ≤ 100,
--    server-owned columns) and the overlap constraint still apply.
--  * Every "may this caller act" test is wrapped in coalesce(…, false): for
--    a non-admin current_active_admin_academy_id() is NULL, and `not (x or
--    NULL)` is NULL, which IF treats as "don't raise" (found by the checks in
--    supabase/tests/workflow-check.sql).
--  * Admins of the academy may start, end, cancel and join (as co-host) any
--    live meeting in it, remove a participant, and read attendance (already
--    allowed by can_see_session in 0010/0022). Mentors keep everything they had.

-- The academy the caller administers, only while their account is active.
create function public.current_active_admin_academy_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select academy_id from public.profiles
  where id = auth.uid() and role = 'academy_admin' and status = 'active'
$$;

-- ---------------------------------------------------------------------------
-- 1. Scheduling on behalf of a mentor
-- ---------------------------------------------------------------------------

create function public.admin_schedule_live_meeting(
  p_kind public.meeting_kind,
  p_batch uuid,
  p_student uuid,
  p_mentor uuid,
  p_title text,
  p_description text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_academy uuid := public.current_active_admin_academy_id();
  v_batch uuid;
  v_id uuid := gen_random_uuid();
begin
  if v_academy is null then
    raise exception 'only an academy admin can schedule meetings here' using errcode = '42501';
  end if;
  if p_kind = 'one_to_one' then
    select batch_id into v_batch from public.batch_students where student_id = p_student;
  else
    v_batch := p_batch;
  end if;
  if v_batch is null or public.batch_academy(v_batch) is distinct from v_academy then
    raise exception 'that batch or student isn''t in your academy' using errcode = 'MT003';
  end if;
  if not exists (
    select 1 from public.batch_mentors bm
    join public.profiles p on p.id = bm.mentor_id
    where bm.batch_id = v_batch and bm.mentor_id = p_mentor and p.role = 'mentor' and p.status = 'active'
  ) then
    raise exception 'the host must be an active mentor of this batch' using errcode = 'MT009';
  end if;

  insert into public.sessions (id, batch_id, mentor_id, created_by, title, description, starts_at, ends_at, mode, meeting_kind, for_whole_batch, timezone)
  values (v_id, v_batch, p_mentor, auth.uid(), p_title, p_description, p_starts_at, p_ends_at, 'online', p_kind, p_kind = 'batch', 'Asia/Kolkata');
  if p_kind = 'one_to_one' then
    insert into public.session_participants (session_id, student_id) values (v_id, p_student);
  end if;
  return v_id;
end;
$$;

-- Cancel a live meeting that hasn't started: its host mentor or an admin of
-- its academy. (Mentors can still cancel through their own update policy.)
create function public.cancel_live_meeting(p_session uuid, p_reason text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  s public.sessions%rowtype;
  why text := btrim(coalesce(p_reason, ''));
begin
  select * into s from public.sessions where id = p_session for update;
  if not found or not coalesce(s.mentor_id = auth.uid() or s.academy_id = public.current_active_admin_academy_id(), false) then
    raise exception 'meeting not found' using errcode = 'P0002';
  end if;
  if s.meeting_kind is null then
    raise exception 'this session has no live room' using errcode = 'MT005';
  end if;
  if s.status <> 'scheduled' then
    raise exception 'this meeting is %', s.status using errcode = 'MT006';
  end if;
  if char_length(why) not between 3 and 300 then
    raise exception 'give a reason of 3–300 characters' using errcode = '22023';
  end if;
  -- guard_live_meeting refuses this once the meeting has started.
  update public.sessions set status = 'cancelled', cancel_reason = why where id = p_session;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Start / end / webhook: admins of the academy alongside the host mentor
-- ---------------------------------------------------------------------------

create or replace function public.start_live_meeting(p_session uuid)
returns timestamptz
language plpgsql
security definer set search_path = public
as $$
declare
  s public.sessions%rowtype;
begin
  select * into s from public.sessions where id = p_session for update;
  if not found or not coalesce(
    (s.mentor_id = auth.uid() and public.is_batch_mentor(s.batch_id))
    or s.academy_id = public.current_active_admin_academy_id(),
    false
  ) then
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

-- Now also records the academy's admins (co-hosts). Only students are ever
-- marked present; staff joins are kept for the "who joined" list.
create or replace function public.record_live_meeting_event(p_session uuid, p_user uuid, p_participant_sid text, p_event text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  s public.sessions%rowtype;
  is_student boolean;
  is_staff boolean;
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
  is_staff := p_user = s.mentor_id
    or exists (select 1 from public.profiles p where p.id = p_user and p.role = 'academy_admin' and p.academy_id = s.academy_id);
  if not is_staff and not is_student then
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

-- ---------------------------------------------------------------------------
-- 3. Removals by the academy's admins
-- ---------------------------------------------------------------------------

create policy "live_removals_admin_insert" on public.live_meeting_removals
  for insert with check (
    removed_by = auth.uid() and user_id <> auth.uid()
    and exists (
      select 1 from public.sessions s
      where s.id = session_id and s.meeting_kind is not null and s.academy_id = public.current_active_admin_academy_id()
    )
  );
create policy "live_removals_admin_delete" on public.live_meeting_removals
  for delete using (exists (select 1 from public.sessions s where s.id = session_id and s.academy_id = public.current_active_admin_academy_id()));

-- ---------------------------------------------------------------------------
-- 4. Grants
-- ---------------------------------------------------------------------------

revoke execute on function public.current_active_admin_academy_id() from public, anon;
revoke execute on function public.admin_schedule_live_meeting(public.meeting_kind, uuid, uuid, uuid, text, text, timestamptz, timestamptz) from public, anon;
revoke execute on function public.cancel_live_meeting(uuid, text) from public, anon;
revoke execute on function public.record_live_meeting_event(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.current_active_admin_academy_id() to authenticated;
grant execute on function public.admin_schedule_live_meeting(public.meeting_kind, uuid, uuid, uuid, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.cancel_live_meeting(uuid, text) to authenticated;
grant execute on function public.record_live_meeting_event(uuid, uuid, text, text) to service_role;

notify pgrst, 'reload schema';
