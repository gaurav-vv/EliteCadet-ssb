-- SSB Academy — index mentor-side foreign keys that had no index.
--
-- Part 2 of 3 (see 0030, 0032). "Feedback I wrote", "content I own" and
-- "sessions I created" lookups, and removing a mentor's profile, scanned the
-- whole table. contents already had (owner_type, owner_id), which cannot
-- serve a lookup on owner_id alone.

create index if not exists feedback_mentor_idx
  on public.feedback (mentor_id);

create index if not exists contents_owner_id_idx
  on public.contents (owner_id);

create index if not exists sessions_created_by_idx
  on public.sessions (created_by);
