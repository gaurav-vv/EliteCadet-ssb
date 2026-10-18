-- SSB Academy — T090: apply server-granted roles that Supabase Auth writes
-- AFTER the auth.users INSERT. Run once in the Supabase SQL Editor, AFTER 0014.
--
-- Why
--  * handle_new_user (0005/0007) runs AFTER INSERT on auth.users. Verified on
--    a local stack (GoTrue v2): auth.admin.createUser() inserts the row first
--    and writes app_metadata.role in a later UPDATE, and inviteUserByEmail()
--    sets invited_at in a later UPDATE. The insert trigger saw neither, so
--    every invited mentor/student and every admin-created account became a
--    student with no academy.
--
-- What
--  * One AFTER UPDATE trigger that applies the trusted role at exactly two
--    transitions, both of which only Supabase Auth / the service role can cause:
--      1. raw_app_meta_data->>'role' changes (app_metadata is service-role-only)
--      2. invited_at goes from null to set (only inviteUserByEmail does this);
--         the role/academy then come from the invite's metadata, read at that
--         moment only — later user_metadata edits by the user change nothing.
--  * Browser signups are unaffected: user_metadata alone never grants a role.

create function public.apply_trusted_role()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  app_role text := new.raw_app_meta_data->>'role';
  meta_role text := new.raw_user_meta_data->>'role';
  target_role public.user_role;
  target_academy uuid;
  current_academy uuid;
begin
  if app_role in ('student', 'mentor', 'academy_admin', 'super_admin')
     and app_role is distinct from old.raw_app_meta_data->>'role' then
    target_role := app_role::public.user_role;
    target_academy := nullif(new.raw_app_meta_data->>'academy_id', '')::uuid;
  elsif meta_role in ('mentor', 'student') and old.invited_at is null and new.invited_at is not null then
    target_role := meta_role::public.user_role;
    target_academy := nullif(new.raw_user_meta_data->>'academy_id', '')::uuid;
  else
    return new;
  end if;

  select academy_id into current_academy from public.profiles where id = new.id;
  if not found then
    return new;
  end if;

  target_academy := coalesce(target_academy, current_academy);
  if target_role = 'academy_admin' and target_academy is null then
    insert into public.academies (name, owner_id)
    values (coalesce(nullif(btrim(new.raw_user_meta_data->>'academy_name'), ''), 'My Academy'), new.id)
    returning id into target_academy;
  end if;

  -- auth.uid() is null in Supabase Auth's own session, so the 0005/0007
  -- profile guard treats this as a trusted change; it also creates the
  -- role-specific profile row when the role changes.
  update public.profiles
  set role = target_role, academy_id = target_academy
  where id = new.id;

  return new;
end;
$$;

revoke execute on function public.apply_trusted_role() from public, anon, authenticated;

create trigger on_auth_user_trusted_role
  after update of raw_app_meta_data, invited_at on auth.users
  for each row execute function public.apply_trusted_role();
