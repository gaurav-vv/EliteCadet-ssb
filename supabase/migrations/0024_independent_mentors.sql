-- SSB Academy — independent mentors + academy-change cleanup.
-- Run once in the Supabase SQL Editor, AFTER 0023. Forward-only, additive.
--
-- Design notes (specs.md §8a.1, decided 2026-10-20)
--  * A mentor may belong to an academy (academy mentor) or to none
--    (independent mentor). profiles.academy_id was already nullable and the
--    signup trigger (0007) already creates an invited mentor with no academy
--    when the invite carries none — so no column changes are needed.
--    Super admins invite independent mentors from the server with the
--    service role; academy admins' invites always carry their own academy.
--  * Batch membership must follow academy membership. Before this migration
--    nothing removed someone's batch rows when a super admin moved them to
--    another academy or out of one: a mentor made independent (or moved) kept
--    batch_mentors rows, so is_batch_mentor() still opened the old academy's
--    rosters, sessions and student data; a moved student kept their old batch.
--    The trigger below drops every batch row that no longer matches the
--    person's academy, in the same transaction as the move.

create function public.drop_stale_batch_membership()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.batch_mentors bm
    using public.batches b
    where bm.mentor_id = new.id and b.id = bm.batch_id
      and b.academy_id is distinct from new.academy_id;
  delete from public.batch_students bs
    using public.batches b
    where bs.student_id = new.id and b.id = bs.batch_id
      and b.academy_id is distinct from new.academy_id;
  return new;
end;
$$;

create trigger profiles_academy_membership_cleanup
  after update of academy_id on public.profiles
  for each row
  when (new.academy_id is distinct from old.academy_id)
  execute function public.drop_stale_batch_membership();

revoke execute on function public.drop_stale_batch_membership() from public, anon, authenticated;

-- One-off repair of rows left behind by earlier moves (nothing to do on a
-- database where no one was ever moved).
delete from public.batch_mentors bm
  using public.batches b, public.profiles p
  where b.id = bm.batch_id and p.id = bm.mentor_id and b.academy_id is distinct from p.academy_id;
delete from public.batch_students bs
  using public.batches b, public.profiles p
  where b.id = bs.batch_id and p.id = bs.student_id and b.academy_id is distinct from p.academy_id;
