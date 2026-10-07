-- SSB Academy — Phase 1 (T080), step 2 of 2: central users + RBAC.
-- Run once in the Supabase SQL Editor, AFTER 0004_super_admin_role.sql.
--
-- Design notes
--  * Supabase Auth (auth.users) stays the ONLY authentication system.
--    public.profiles is the central users table: one row per account with
--    role, academy membership, contact details, account status and last login.
--  * Role-specific data lives in student_profiles / mentor_profiles /
--    academy_admin_profiles / super_admin_profiles (1:1 with profiles).
--  * Privileged columns (role, academy_id, status, email, last_login_at) can't
--    be changed by the account holder. Before this migration,
--    "profiles_update_own" let any user rewrite their own role. A trigger now
--    rejects that for everyone except an active super admin and trusted
--    server contexts (service role / SQL Editor / auth triggers).
--  * Signup no longer trusts a role sent by the browser: self-signup can only
--    create a student or an academy admin. A mentor account (with an academy)
--    only comes from a real invite (auth.users.invited_at is set by
--    inviteUserByEmail). Any role at all only comes from app_metadata, which
--    only the service role can write. super_admin is never self-assigned.
--  * The first super admin is bootstrapped by hand, once:
--
--      update public.profiles set role = 'super_admin'
--      where email = 'you@example.com';
--
--  * Sensitive super-admin actions are written to public.audit_log.

-- ---------------------------------------------------------------------------
-- 1. Central users table: profiles gains identity/status columns
-- ---------------------------------------------------------------------------

create type public.user_status as enum ('active', 'suspended');

alter table public.profiles
  add column email text,
  add column phone text,
  add column status public.user_status not null default 'active',
  add column last_login_at timestamptz,
  add column updated_at timestamptz not null default now();

update public.profiles p
set email = u.email, last_login_at = u.last_sign_in_at
from auth.users u
where u.id = p.id;

create unique index profiles_email_unique on public.profiles (lower(email)) where email is not null;
create index profiles_role_idx on public.profiles (role);
create index profiles_status_idx on public.profiles (status);
create index profiles_academy_idx on public.profiles (academy_id);

-- ---------------------------------------------------------------------------
-- 2. Role helpers (SECURITY DEFINER: usable inside RLS without recursion)
-- ---------------------------------------------------------------------------

create function public.is_super_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin' and status = 'active'
  )
$$;

create function public.current_user_role()
returns public.user_role
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- 3. Role-specific profile tables (1:1 with profiles)
-- ---------------------------------------------------------------------------

create table public.student_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  target_exam text,
  preparation_stage text,
  goals text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mentor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bio text,
  expertise text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academy_admin_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  job_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.super_admin_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_profiles enable row level security;
alter table public.mentor_profiles enable row level security;
alter table public.academy_admin_profiles enable row level security;
alter table public.super_admin_profiles enable row level security;

create policy "student_profiles_own" on public.student_profiles
  for select using (user_id = auth.uid() or public.is_super_admin());
create policy "student_profiles_update_own" on public.student_profiles
  for update using (user_id = auth.uid());
create policy "mentor_profiles_own" on public.mentor_profiles
  for select using (user_id = auth.uid() or public.is_super_admin());
create policy "mentor_profiles_update_own" on public.mentor_profiles
  for update using (user_id = auth.uid());
create policy "academy_admin_profiles_own" on public.academy_admin_profiles
  for select using (user_id = auth.uid() or public.is_super_admin());
create policy "academy_admin_profiles_update_own" on public.academy_admin_profiles
  for update using (user_id = auth.uid());
create policy "super_admin_profiles_own" on public.super_admin_profiles
  for select using (user_id = auth.uid() or public.is_super_admin());
create policy "super_admin_profiles_update_own" on public.super_admin_profiles
  for update using (user_id = auth.uid());

-- Creates the role-profile row for a user's current role (idempotent).
create function public.ensure_role_profile(p_user uuid, p_role public.user_role)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  case p_role
    when 'student' then insert into public.student_profiles (user_id) values (p_user) on conflict do nothing;
    when 'mentor' then insert into public.mentor_profiles (user_id) values (p_user) on conflict do nothing;
    when 'academy_admin' then insert into public.academy_admin_profiles (user_id) values (p_user) on conflict do nothing;
    when 'super_admin' then insert into public.super_admin_profiles (user_id) values (p_user) on conflict do nothing;
  end case;
end;
$$;

revoke execute on function public.ensure_role_profile(uuid, public.user_role) from public, anon, authenticated;

select public.ensure_role_profile(id, role) from public.profiles;

-- ---------------------------------------------------------------------------
-- 4. Hardened signup trigger (replaces the 0001 version)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  app_role text := new.raw_app_meta_data->>'role';        -- service-role only
  meta_role text := new.raw_user_meta_data->>'role';      -- browser-controlled
  signup_role public.user_role;
  new_academy_id uuid;
  trusted_academy text;
begin
  if app_role in ('student', 'mentor', 'academy_admin', 'super_admin') then
    signup_role := app_role::public.user_role;
    trusted_academy := new.raw_app_meta_data->>'academy_id';
  elsif meta_role = 'mentor' and new.invited_at is not null then
    -- inviteUserByEmail (server-side, service role) is the only way to get here.
    signup_role := 'mentor';
    trusted_academy := new.raw_user_meta_data->>'academy_id';
  elsif meta_role = 'academy_admin' then
    signup_role := 'academy_admin';
  else
    signup_role := 'student';
  end if;

  if signup_role = 'academy_admin' then
    insert into public.academies (name, owner_id)
    values (coalesce(nullif(btrim(new.raw_user_meta_data->>'academy_name'), ''), 'My Academy'), new.id)
    returning id into new_academy_id;
  elsif trusted_academy is not null then
    new_academy_id := trusted_academy::uuid;
  end if;

  insert into public.profiles (id, role, full_name, academy_id, email, last_login_at)
  values (
    new.id,
    signup_role,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new_academy_id,
    new.email,
    new.last_sign_in_at
  );

  perform public.ensure_role_profile(new.id, signup_role);
  return new;
end;
$$;

-- Keep profiles.email / last_login_at in step with Supabase Auth (the source).
create function public.sync_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set email = new.email, last_login_at = new.last_sign_in_at
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of email, last_sign_in_at on auth.users
  for each row execute function public.sync_auth_user();

-- ---------------------------------------------------------------------------
-- 5. Privileged-column guard + super-admin access
-- ---------------------------------------------------------------------------

create function public.guard_profile_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  privileged_changed boolean :=
    new.role is distinct from old.role
    or new.academy_id is distinct from old.academy_id
    or new.status is distinct from old.status
    or new.email is distinct from old.email
    or new.last_login_at is distinct from old.last_login_at
    or new.id is distinct from old.id;
begin
  -- auth.uid() is null for trusted contexts: service role, SQL Editor, and the
  -- auth-schema triggers above. Only API callers are checked.
  if auth.uid() is not null and privileged_changed then
    if not public.is_super_admin() then
      raise exception 'only a super admin can change role, academy, status or email'
        using errcode = '42501';
    end if;
    if old.id = auth.uid() and (new.role is distinct from old.role or new.status is distinct from old.status) then
      raise exception 'you cannot change your own role or status'
        using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  if new.role is distinct from old.role then
    perform public.ensure_role_profile(new.id, new.role);
  end if;
  return new;
end;
$$;

create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

create policy "profiles_select_super_admin" on public.profiles
  for select using (public.is_super_admin());

create policy "profiles_update_super_admin" on public.profiles
  for update using (public.is_super_admin()) with check (public.is_super_admin());

create policy "academies_select_super_admin" on public.academies
  for select using (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- 6. Audit log for sensitive administrative actions (AGENTS.md §16)
-- ---------------------------------------------------------------------------

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_target_idx on public.audit_log (target_type, target_id, created_at desc);
create index audit_log_created_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

-- Append-only: super admins insert entries as themselves and read them all.
-- No update/delete policy exists, so entries can't be edited or removed.
create policy "audit_log_insert_super_admin" on public.audit_log
  for insert with check (public.is_super_admin() and actor_id = auth.uid());

create policy "audit_log_select_super_admin" on public.audit_log
  for select using (public.is_super_admin());
