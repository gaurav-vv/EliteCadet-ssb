-- SSB Academy — demo requests from the public landing page.
-- Run once in the Supabase SQL Editor, AFTER 0015.
--
-- ADDITIVE: one new table, no change to any existing object.
--  * Anyone (signed in or not) may INSERT a request; nobody but a super admin
--    may read one. There is no update or delete path through the API.
--  * Shape and length limits are enforced here as well as in the app
--    (lib/server/demo-requests/validation.ts), so a direct API call can't
--    store anything the form couldn't.

create table public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  organisation text,
  interest text not null,
  message text,
  created_at timestamptz not null default now(),
  constraint demo_requests_full_name_length check (char_length(btrim(full_name)) between 2 and 80),
  constraint demo_requests_email_shape check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint demo_requests_phone_length check (phone is null or char_length(phone) between 7 and 20),
  constraint demo_requests_organisation_length check (organisation is null or char_length(organisation) <= 120),
  constraint demo_requests_interest check (interest in ('student', 'mentor', 'academy')),
  constraint demo_requests_message_length check (message is null or char_length(message) <= 1000)
);

create index demo_requests_created_idx on public.demo_requests (created_at desc);

alter table public.demo_requests enable row level security;

create policy "demo_requests_insert_anyone" on public.demo_requests
  for insert to anon, authenticated with check (true);
create policy "demo_requests_select_super_admin" on public.demo_requests
  for select using (public.is_super_admin());

revoke all on public.demo_requests from anon, authenticated;
grant insert (full_name, email, phone, organisation, interest, message) on public.demo_requests to anon, authenticated;
grant select on public.demo_requests to authenticated;

notify pgrst, 'reload schema';
