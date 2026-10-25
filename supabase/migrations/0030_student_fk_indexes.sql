-- SSB Academy — index student-side foreign keys that had no index.
--
-- Part 1 of 3 (see 0031, 0032). Deleting a practice item/bank or interview
-- topic, and looking up a student's rows by them, scanned the whole table.

create index if not exists practice_answers_item_idx
  on public.practice_answers (item_id);

create index if not exists practice_attempts_bank_idx
  on public.practice_attempts (bank_slug);

create index if not exists interview_sessions_topic_idx
  on public.interview_sessions (topic_slug);
