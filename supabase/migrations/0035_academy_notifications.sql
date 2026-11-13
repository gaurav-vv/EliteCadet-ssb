-- SSB Academy — notifications for academy admins (2026-11-14).
-- Run once AFTER 0034. Forward-only and additive: no existing table, column, policy or function is changed.
--
-- Why
--  * Until now an academy admin was only ever notified when a session was cancelled (0013). Nothing told
--    them that a mentor or student they invited had actually joined, or that a mentor had scheduled a
--    session in their academy, so they had to keep checking the Mentors / Students / Sessions pages.
--  * Notifications are rows in public.notifications, written only through public.notify() by triggers
--    (0013). This adds two such triggers. The bell, the unread badge and /academy/notifications already
--    read these rows, so no screen changes besides the new kind being recognised.
--
-- New notifications for every ACTIVE admin of the academy concerned (never another academy's admin)
--  1. invite_accepted   - a mentor or student of the academy signs in for the first time (that is what
--                         accepting an invitation does). Fires once per person.
--  2. session_scheduled - a mentor schedules a session in one of the academy's batches (the existing kind,
--                         so the existing UI handles it; the students' own notification is unchanged).
--
-- Rollback (nothing depends on these objects; existing notification rows stay valid)
--    drop trigger profiles_notify_invite_accepted on public.profiles;
--    drop trigger sessions_notify_academy_admins on public.sessions;
--    drop function public.notify_academy_invite_accepted();
--    drop function public.notify_academy_session_scheduled();
--    -- optionally: delete from public.notifications where kind = 'invite_accepted';
--    -- (a Postgres enum value cannot be dropped; the unused 'invite_accepted' value is harmless)

alter type public.notification_kind add value if not exists 'invite_accepted';

-- ---------------------------------------------------------------------------
-- 1. An invited mentor or student signed in for the first time
-- ---------------------------------------------------------------------------

create function public.notify_academy_invite_accepted()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  who text := coalesce(nullif(btrim(new.full_name), ''), nullif(new.email, ''), 'A new member');
begin
  for r in
    select p.id from public.profiles p
    where p.role = 'academy_admin' and p.status = 'active' and p.academy_id = new.academy_id
  loop
    perform public.notify(
      r.id,
      'invite_accepted',
      who || ' joined your academy',
      case new.role when 'mentor' then 'The mentor accepted the invitation and signed in for the first time.'
                    else 'The student accepted the invitation and signed in for the first time.' end,
      case new.role when 'mentor' then '/academy/mentors' else '/academy/students' end,
      new.id
    );
  end loop;
  return new;
end;
$$;

-- profiles.last_login_at mirrors auth.users.last_sign_in_at (0005). null -> a value is a first sign-in.
-- Only people who belong to an academy; an academy admin's own first login is not news to themselves.
create trigger profiles_notify_invite_accepted after update of last_login_at on public.profiles
  for each row
  when (old.last_login_at is null and new.last_login_at is not null
        and new.academy_id is not null and new.role in ('mentor', 'student'))
  execute function public.notify_academy_invite_accepted();

-- ---------------------------------------------------------------------------
-- 2. A mentor scheduled a session in the academy
-- ---------------------------------------------------------------------------

create function public.notify_academy_session_scheduled()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  mentor_name text := coalesce(nullif((select full_name from public.profiles where id = new.mentor_id), ''), 'A mentor');
begin
  for r in
    select p.id from public.profiles p
    where p.role = 'academy_admin' and p.status = 'active' and p.academy_id = new.academy_id
  loop
    -- An admin who scheduled it themselves does not need telling.
    if r.id is distinct from new.created_by then
      perform public.notify(
        r.id,
        'session_scheduled',
        'Session scheduled by ' || mentor_name,
        new.title || ' · ' || public.ist_label(new.starts_at),
        '/academy/sessions',
        new.id
      );
    end if;
  end loop;
  return new;
end;
$$;

create trigger sessions_notify_academy_admins after insert on public.sessions
  for each row
  when (new.status = 'scheduled' and new.starts_at > now())
  execute function public.notify_academy_session_scheduled();
