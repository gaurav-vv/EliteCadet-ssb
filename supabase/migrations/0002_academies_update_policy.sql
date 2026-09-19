-- Lets an academy admin actually edit their own academy's name from
-- Settings. The initial migration only granted SELECT on academies; without
-- this, Row Level Security silently blocks every update attempt.
create policy "academies_update_owner" on public.academies
  for update using (auth.uid() = owner_id);
