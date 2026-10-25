-- SSB Academy — index content_requests.academy_id.
--
-- content_requests.academy_id references academies(id) (0009) but was never
-- indexed, so an academy's request list and the academy delete/set-null
-- cascade scanned the whole table. Part 2 of 2 (see 0028).

create index if not exists content_requests_academy_idx
  on public.content_requests (academy_id, created_at desc);
