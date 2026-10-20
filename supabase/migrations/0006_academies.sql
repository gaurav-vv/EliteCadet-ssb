-- SSB Academy — Phase 2 (T081): academies as a managed domain.
-- Run once in the Supabase SQL Editor, AFTER 0004 and 0005.
--
-- Design notes
--  * academies gains profile fields (description, logo URL, contact) and a
--    status. Membership stays in ONE place: profiles.academy_id.
--  * Only a super admin can create academies, change an academy's status or
--    owner. Academy admins can edit their own academy's name, description and
--    contact details (enforced by RLS + a column guard trigger).
--  * academy_member_counts is a security-invoker view: each caller sees counts
--    only over the profiles their own RLS lets them read.

create type public.academy_status as enum ('active', 'suspended');

alter table public.academies
  add column description text,
  add column logo_url text,
  add column contact_email text,
  add column contact_phone text,
  add column status public.academy_status not null default 'active',
  add column updated_at timestamptz not null default now();

-- NOT VALID: enforced for new/updated rows without failing on legacy names.
alter table public.academies
  add constraint academies_name_length check (char_length(btrim(name)) between 2 and 80) not valid;

create index academies_status_idx on public.academies (status);
create index academies_created_idx on public.academies (created_at desc);

-- The academy the signed-in academy admin belongs to (defined in 0003) is the
-- scope for admin edits, whether or not they are the original owner.
create policy "academies_update_academy_admin" on public.academies
  for update
  using (id = public.current_admin_academy_id())
  with check (id = public.current_admin_academy_id());

create policy "academies_insert_super_admin" on public.academies
  for insert with check (public.is_super_admin());

create policy "academies_update_super_admin" on public.academies
  for update using (public.is_super_admin()) with check (public.is_super_admin());

create function public.guard_academy_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_super_admin()
     and (new.status is distinct from old.status
          or new.owner_id is distinct from old.owner_id
          or new.id is distinct from old.id) then
    raise exception 'only a super admin can change an academy''s status or owner'
      using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger academies_guard_update
  before update on public.academies
  for each row execute function public.guard_academy_update();

create view public.academy_member_counts
with (security_invoker = true) as
  select
    academy_id,
    count(*) filter (where role = 'academy_admin') as admins,
    count(*) filter (where role = 'mentor') as mentors,
    count(*) filter (where role = 'student') as students
  from public.profiles
  where academy_id is not null
  group by academy_id;

grant select on public.academy_member_counts to authenticated;
