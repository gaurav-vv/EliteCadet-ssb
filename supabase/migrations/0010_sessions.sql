-- SSB Academy — Phase 6 (T085): mentor availability and sessions.
-- Run once in the Supabase SQL Editor, AFTER 0004–0009.
--
-- Design notes
--  * A session belongs to ONE batch and ONE mentor who teaches that batch.
--    Audience: the whole batch, or only the students listed in
--    session_participants (who must be in that batch).
--  * No double-booking: an exclusion constraint stops two overlapping
--    *scheduled* sessions for the same mentor (needs btree_gist).
--  * Visibility lives in can_see_session() and RLS: the mentor, the batch's
--    students (or the selected ones), the academy's admins, super admins.
--  * Times are timestamptz (UTC); the app shows them in IST.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- 1. Availability (weekly slots)
-- ---------------------------------------------------------------------------

create table public.mentor_availability (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint mentor_availability_order check (end_time > start_time)
);

create index mentor_availability_mentor_idx on public.mentor_availability (mentor_id, weekday, start_time);

alter table public.mentor_availability enable row level security;

create policy "availability_mentor_own" on public.mentor_availability
  for all
  using (mentor_id = auth.uid())
  with check (mentor_id = auth.uid() and public.current_user_role() = 'mentor');

create policy "availability_academy_admin_read" on public.mentor_availability
  for select using (
    exists (select 1 from public.profiles p where p.id = mentor_id and p.academy_id = public.current_admin_academy_id())
  );

-- ---------------------------------------------------------------------------
-- 2. Sessions
-- ---------------------------------------------------------------------------

create type public.session_mode as enum ('online', 'offline');
create type public.session_status as enum ('scheduled', 'completed', 'cancelled');

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  mode public.session_mode not null,
  meeting_url text,
  location text,
  for_whole_batch boolean not null default true,
  status public.session_status not null default 'scheduled',
  cancel_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_title_length check (char_length(btrim(title)) between 3 and 140),
  constraint sessions_time_order check (ends_at > starts_at and ends_at - starts_at <= interval '8 hours'),
  constraint sessions_mode_details check (
    (mode = 'online' and meeting_url ~ '^https://')
    or (mode = 'offline' and coalesce(btrim(location), '') <> '')
  ),
  constraint sessions_cancel_reason check (status <> 'cancelled' or coalesce(btrim(cancel_reason), '') <> ''),
  constraint sessions_no_overlap exclude using gist (
    mentor_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'scheduled')
);

create index sessions_batch_idx on public.sessions (batch_id, starts_at);
create index sessions_mentor_idx on public.sessions (mentor_id, starts_at);
create index sessions_academy_idx on public.sessions (academy_id, starts_at);

create table public.session_participants (
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  primary key (session_id, student_id)
);

create index session_participants_student_idx on public.session_participants (student_id);

alter table public.sessions enable row level security;
alter table public.session_participants enable row level security;

-- Keep academy_id consistent with the batch, and updated_at honest.
create function public.prepare_session()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.academy_id := (select academy_id from public.batches where id = new.batch_id);
  new.updated_at := now();
  return new;
end;
$$;

create trigger sessions_prepare before insert or update on public.sessions
  for each row execute function public.prepare_session();

-- Selected participants must be students of the session's batch.
create function public.check_session_participant()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.sessions s
    join public.batch_students bs on bs.batch_id = s.batch_id and bs.student_id = new.student_id
    where s.id = new.session_id
  ) then
    raise exception 'participants must be students of the session''s batch' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger session_participants_check before insert or update on public.session_participants
  for each row execute function public.check_session_participant();

-- The visibility rule.
create function public.can_see_session(p_session uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.sessions s
    where s.id = p_session
      and (
        s.mentor_id = auth.uid()
        or s.academy_id = public.current_admin_academy_id()
        or public.is_super_admin()
        or (s.for_whole_batch and exists (select 1 from public.batch_students bs where bs.batch_id = s.batch_id and bs.student_id = auth.uid()))
        or (not s.for_whole_batch and exists (select 1 from public.session_participants sp where sp.session_id = s.id and sp.student_id = auth.uid()))
      )
  )
$$;

create policy "sessions_read" on public.sessions for select using (public.can_see_session(id));

-- Mentors write only their own sessions, only for batches they teach.
create policy "sessions_mentor_insert" on public.sessions
  for insert with check (mentor_id = auth.uid() and created_by = auth.uid() and public.is_batch_mentor(batch_id));
create policy "sessions_mentor_update" on public.sessions
  for update using (mentor_id = auth.uid()) with check (mentor_id = auth.uid() and public.is_batch_mentor(batch_id));

create policy "session_participants_read" on public.session_participants
  for select using (public.can_see_session(session_id));
create policy "session_participants_mentor_write" on public.session_participants
  for all
  using (exists (select 1 from public.sessions s where s.id = session_id and s.mentor_id = auth.uid()))
  with check (exists (select 1 from public.sessions s where s.id = session_id and s.mentor_id = auth.uid()));
