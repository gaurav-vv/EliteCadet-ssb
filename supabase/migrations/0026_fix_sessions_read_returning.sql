-- Renumbered 0022 -> 0026 (2026-10-25): it shared version 0022 with
-- 0022_live_meetings.sql, so `supabase start` failed on schema_migrations_pkey.
-- It is independent of 0022–0025 (none of them touch sessions_read or
-- can_see_session_row), so running it last is equivalent.
--
-- Safe to re-run: a database that already ran this fix (as 0022, or by hand
-- in the SQL Editor) ends in the same state — the function is replaced with
-- the identical definition and the policy is recreated with the identical
-- check. Nothing is weakened at any point: both statements run in the
-- migration's transaction, so no moment exists without a sessions_read policy.
--
-- Fix: mentors could not schedule a session.
--
-- `scheduleSession` does `insert(...).select("id")` (INSERT ... RETURNING).
-- PostgreSQL evaluates the table's SELECT RLS policy against the new row for
-- the RETURNING clause. The old `sessions_read` policy called
-- `can_see_session(id)` (0010), which RE-QUERIES public.sessions by id — but
-- the row being inserted is not yet visible to that function's snapshot, so it
-- returned false and the whole INSERT was rejected with a 42501 ("new row
-- violates row-level security policy"). The app surfaced this to the mentor as
-- "You don't have permission to do that." on /mentor/sessions/new.
--
-- Replace the self-referential read check with one that evaluates on the row's
-- OWN column values (available during RETURNING). A SECURITY DEFINER helper
-- keeps the participant lookup from recursing into session_participants' own
-- RLS (which itself reads sessions).

create or replace function public.can_see_session_row(
  p_id uuid,
  p_mentor uuid,
  p_academy uuid,
  p_batch uuid,
  p_whole boolean
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    p_mentor = auth.uid()
    or p_academy = public.current_admin_academy_id()
    or public.is_super_admin()
    or (p_whole and exists (
      select 1 from public.batch_students bs
      where bs.batch_id = p_batch and bs.student_id = auth.uid()
    ))
    or (not p_whole and exists (
      select 1 from public.session_participants sp
      where sp.session_id = p_id and sp.student_id = auth.uid()
    ))
$$;

drop policy if exists "sessions_read" on public.sessions;
create policy "sessions_read" on public.sessions
  for select using (
    public.can_see_session_row(id, mentor_id, academy_id, batch_id, for_whole_batch)
  );
