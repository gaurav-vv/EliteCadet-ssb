-- SSB Academy — Add Mentor: manual profile + invite by email (2026-10-25).
-- Run AFTER 0026. Forward-only; changes no existing rows. (Written as 0026 and
-- renumbered to 0027 on 2026-10-25: 0026 is the renumbered sessions_read fix.)
-- Safe to re-run: the column is added only if missing, and the check and the
-- policy are recreated with identical definitions in the same transaction, so
-- the end state is the same and there is no moment without either.
--
-- What
--  * mentor_profiles.qualifications (the manual form's "Qualifications").
--    "Specialization" uses the existing mentor_profiles.expertise text[] and
--    the phone number uses the existing profiles.phone, so no other columns.
--  * Academy admins may READ the mentor_profiles rows of mentors in their own
--    academy (until now only the mentor could). Writes stay server-side: the
--    app writes these rows with the service role, after checking the caller
--    is an active admin of that academy.
--
-- Not here (on purpose)
--  * No separate invitation table. Invitations are Supabase Auth invites
--    (single-use, expiring links). Their state comes from auth.users
--    (invited_at / confirmation_sent_at / email_confirmed_at / last_sign_in_at),
--    revocation deletes the never-activated account (which kills the link),
--    and every add / invite / revoke is written to audit_log.
--  * No new user_status value: a manually added mentor has no password, so
--    they cannot log in until they accept an invite (or prove the email with
--    a reset link) and choose their own password.

alter table public.mentor_profiles add column if not exists qualifications text;
alter table public.mentor_profiles drop constraint if exists mentor_profiles_qualifications_length;
alter table public.mentor_profiles
  add constraint mentor_profiles_qualifications_length check (qualifications is null or char_length(qualifications) <= 500);

drop policy if exists "mentor_profiles_academy_admin_read" on public.mentor_profiles;
create policy "mentor_profiles_academy_admin_read" on public.mentor_profiles
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = mentor_profiles.user_id
        and p.role = 'mentor'
        and p.academy_id is not null
        and p.academy_id = public.current_active_admin_academy_id()
    )
  );
