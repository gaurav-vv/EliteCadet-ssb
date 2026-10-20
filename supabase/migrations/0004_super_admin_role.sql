-- SSB Academy — Phase 1 (T080), step 1 of 2: the super_admin role.
-- Run this file ON ITS OWN in the Supabase SQL Editor, then run
-- 0005_users_rbac.sql. Postgres can't use a newly added enum value in the
-- same transaction that adds it, and the SQL Editor runs a script as one
-- transaction.

alter type public.user_role add value if not exists 'super_admin';
