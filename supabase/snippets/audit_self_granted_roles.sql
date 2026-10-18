-- READ-ONLY audit (T090). Run in the Supabase SQL Editor AFTER the 0005–0015
-- catch-up. Before 0005, the 0001 signup trigger and profiles_update_own
-- policy trusted a browser-sent role, so any account could have made itself a
-- mentor or super admin. 0005 closes that for new signups but does not
-- rewrite existing rows. This lists the accounts whose staff role has no
-- trusted source: not invited (invited_at is null) and no server-set
-- app_metadata.role. Academy admin is excluded — self-serve academy signup is
-- allowed by design.
--
-- Review each row. To demote one you do not recognise (changes data — only
-- after checking):
--   update public.profiles set role = 'student', academy_id = null where id = '<id>';
select p.id, p.email, p.role, p.academy_id, u.created_at, u.last_sign_in_at
from public.profiles p
join auth.users u on u.id = p.id
where p.role in ('mentor', 'super_admin')
  and u.invited_at is null
  and coalesce(u.raw_app_meta_data->>'role', '') = ''
order by u.created_at;
