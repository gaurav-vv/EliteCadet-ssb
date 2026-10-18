-- Make an existing account a Super Admin. Run in the Supabase SQL Editor,
-- AFTER the 0005–0015 catch-up.
--
-- 1. The person signs up at /signup with their own email and a password only
--    they know (it starts as a student account).
-- 2. Put their email below and run this once.
-- 3. They sign out and back in; they land on /admin.
--
-- It sets app_metadata.role, which only the service role / SQL Editor can
-- write. The 0015 trigger (apply_trusted_role) then updates their profile —
-- the same trusted path Supabase Auth uses, so no guard is bypassed.
-- To undo: run it again with 'student' instead of 'super_admin'.

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'super_admin')
where lower(email) = lower('teammate@example.com');   -- ← their email

-- Check: should show one row with role = super_admin.
select p.email, p.role, p.status
from public.profiles p
where lower(p.email) = lower('teammate@example.com');   -- ← same email
