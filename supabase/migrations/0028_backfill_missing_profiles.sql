-- Repair: give every sign-in (auth.users) account a profile row.
--
-- The app treats "signed in but no public.profiles row" as a broken account:
-- login ends with "Your account isn't fully set up" and the proxy signs the user
-- back out. The on_auth_user_created trigger (handle_new_user) normally creates
-- that row, but an account made before the trigger existed, or whose profile row
-- was removed by hand, is left without one.
--
-- This applies the SAME role rules as handle_new_user (0007) to those accounts
-- only. It never touches an existing profile, never changes a password or any
-- auth data, and is safe to run more than once.
do $$
declare
  u record;
  app_role text;
  meta_role text;
  signup_role public.user_role;
  trusted_academy uuid;
  new_academy_id uuid;
begin
  for u in
    select a.* from auth.users a
    where not exists (select 1 from public.profiles p where p.id = a.id)
  loop
    app_role := u.raw_app_meta_data->>'role';
    meta_role := u.raw_user_meta_data->>'role';
    trusted_academy := null;
    new_academy_id := null;

    if app_role in ('student', 'mentor', 'academy_admin', 'super_admin') then
      signup_role := app_role::public.user_role;
      trusted_academy := nullif(u.raw_app_meta_data->>'academy_id', '')::uuid;
    elsif meta_role in ('mentor', 'student') and u.invited_at is not null then
      signup_role := meta_role::public.user_role;
      trusted_academy := nullif(u.raw_user_meta_data->>'academy_id', '')::uuid;
    elsif meta_role = 'academy_admin' then
      signup_role := 'academy_admin';
    else
      signup_role := 'student';
    end if;

    -- Never point a profile at an academy that no longer exists.
    if trusted_academy is not null
       and not exists (select 1 from public.academies where id = trusted_academy) then
      trusted_academy := null;
    end if;

    if signup_role = 'academy_admin' and trusted_academy is null then
      -- Reuse the academy this account already owns before creating another.
      select id into new_academy_id from public.academies where owner_id = u.id order by created_at limit 1;
      if new_academy_id is null then
        insert into public.academies (name, owner_id)
        values (coalesce(nullif(btrim(u.raw_user_meta_data->>'academy_name'), ''), 'My Academy'), u.id)
        returning id into new_academy_id;
      end if;
    else
      new_academy_id := trusted_academy;
    end if;

    insert into public.profiles (id, role, full_name, academy_id, email, last_login_at)
    values (u.id, signup_role, coalesce(u.raw_user_meta_data->>'full_name', ''), new_academy_id, u.email, u.last_sign_in_at)
    on conflict do nothing;

    if exists (select 1 from public.profiles where id = u.id) then
      perform public.ensure_role_profile(u.id, signup_role);
    end if;
  end loop;
end;
$$;
