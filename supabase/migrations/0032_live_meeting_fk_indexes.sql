-- SSB Academy — index live-meeting foreign keys used by students and mentors.
--
-- Part 3 of 3 (see 0030, 0031). Removed-participant checks and chat history by
-- sender, and removing a profile, scanned the whole table.

create index if not exists live_meeting_removals_user_idx
  on public.live_meeting_removals (user_id);

create index if not exists live_meeting_messages_sender_idx
  on public.live_meeting_messages (sender_id);
