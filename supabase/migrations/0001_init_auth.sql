-- SSB Academy — initial auth schema (T013/T014).
-- Run this once in Supabase's SQL Editor. Extends auth.users (Supabase-
-- managed) rather than duplicating credential storage.

create type public.user_role as enum ('student', 'mentor', 'academy_admin');

create table public.academies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  full_name text not null,
  academy_id uuid references public.academies(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.academies enable row level security;
alter table public.profiles enable row level security;

-- A user may read/update their own profile.
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- An academy is visible to its owner (the admin) and to any member linked
-- via profiles.academy_id (students/mentors need to display the name).
create policy "academies_select_member" on public.academies
  for select using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.academy_id = academies.id
    )
  );

-- Automatically creates a profile (and, for academy admins, an academy row)
-- whenever a new auth.users row is inserted — covers both self-signup
-- (lib/api/auth.ts) and admin-invited mentors (lib/actions/mentor-invite.ts),
-- which pass role/full_name/academy_id via user metadata either way.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_academy_id uuid;
  signup_role public.user_role;
  meta_academy_id text;
begin
  signup_role := coalesce(new.raw_user_meta_data->>'role', 'student')::public.user_role;
  meta_academy_id := new.raw_user_meta_data->>'academy_id';

  if signup_role = 'academy_admin' then
    insert into public.academies (name, owner_id)
    values (coalesce(new.raw_user_meta_data->>'academy_name', 'My Academy'), new.id)
    returning id into new_academy_id;
  elsif meta_academy_id is not null then
    new_academy_id := meta_academy_id::uuid;
  end if;

  insert into public.profiles (id, role, full_name, academy_id)
  values (
    new.id,
    signup_role,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new_academy_id
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
