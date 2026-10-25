-- SSB Academy — index assessments.academy_id.
--
-- assessments.academy_id references academies(id) on delete cascade (0011) but
-- was never indexed, so deleting an academy and every "assessments of my
-- academy" RLS/lookup scanned the whole table. Part 1 of 2 (see 0029).

create index if not exists assessments_academy_idx
  on public.assessments (academy_id, created_at desc);
