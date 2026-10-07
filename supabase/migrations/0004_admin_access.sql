-- SSB Academy — admin access grants (T080).
-- Run once in Supabase's SQL Editor, after 0001–0003.
--
-- Design notes
--  * Content-admin access is ORTHOGONAL to profiles.role. A person is let into
--    /admin by a row in admin_grants, not by being a student/mentor/academy
--    admin, so no change to the user_role enum (or to existing role guards).
--  * One grant per (user, area). 'super' can manage every area and manage the
--    grants themselves; the other three areas are the per-panel editor rights.
--  * Every table/function here is enforced in Postgres (RLS + SECURITY DEFINER
--    checks). The UI hiding a link is UX only (AGENTS.md §10).
--  * Only a super admin can create or remove grants. Nobody can grant
--    themselves access: the insert policy requires an existing 'super' grant.
--  * The FIRST super admin cannot be created through the app (that would be
--    privilege escalation). Bootstrap it once, by hand, in the SQL Editor:
--
--      insert into public.admin_grants (user_id, area)
--      select id, 'super' from auth.users where email = 'you@example.com';
--
--  * A super admin cannot revoke their own 'super' grant, so the platform
--    cannot be locked out by a misclick. (Two super admins removing each other
--    at the same moment could still leave none; recover by re-running the
--    bootstrap insert above. Rare enough not to need a serialising lock.)
--  * Emails are looked up inside Postgres (admin_find_user_by_email), so the
--    service-role key is not needed.

create type public.admin_area as enum ('super', 'student_content', 'mentor_content', 'academy_content');

create table public.admin_grants (
  user_id uuid not null references auth.users(id) on delete cascade,
  area public.admin_area not null,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, area)
);

alter table public.admin_grants enable row level security;

-- SECURITY DEFINER so the policies below can ask "is the caller a super admin"
-- without recursing into admin_grants' own RLS.
create function public.is_super_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.admin_grants
    where user_id = auth.uid() and area = 'super'
  )
$$;

-- True when the caller is a super admin or holds a grant for p_area.
create function public.has_admin_area(p_area public.admin_area)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.is_super_admin() or exists (
    select 1 from public.admin_grants
    where user_id = auth.uid() and area = p_area
  )
$$;

-- A user can see their own grants (the middleware reads these); a super admin
-- can see everyone's.
create policy "admin_grants_select" on public.admin_grants
  for select using (user_id = auth.uid() or public.is_super_admin());

create policy "admin_grants_insert_super" on public.admin_grants
  for insert with check (public.is_super_admin() and granted_by = auth.uid());

-- No update policy: a grant is created or removed, never edited.
create policy "admin_grants_delete_super" on public.admin_grants
  for delete using (
    public.is_super_admin()
    and not (user_id = auth.uid() and area = 'super')
  );

-- Super-admin-only: resolve an email to an account so a grant can be issued.
create function public.admin_find_user_by_email(p_email text)
returns table (id uuid, full_name text)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
    select u.id, coalesce(p.full_name, '')::text
    from auth.users u
    left join public.profiles p on p.id = u.id
    where lower(u.email) = lower(btrim(p_email));
end;
$$;

-- Super-admin-only: every grant with the holder's name and email, for the
-- Access page. (auth.users is not readable through the anon key.)
create function public.admin_list_grants()
returns table (user_id uuid, email text, full_name text, area public.admin_area, created_at timestamptz)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
    select g.user_id, u.email::text, coalesce(p.full_name, '')::text, g.area, g.created_at
    from public.admin_grants g
    join auth.users u on u.id = g.user_id
    left join public.profiles p on p.id = g.user_id
    order by u.email, g.area;
end;
$$;

revoke execute on function public.admin_find_user_by_email(text) from public, anon;
revoke execute on function public.admin_list_grants() from public, anon;
grant execute on function public.admin_find_user_by_email(text) to authenticated;
grant execute on function public.admin_list_grants() to authenticated;
