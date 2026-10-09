-- SSB Academy — Phase 5 (T084): mentor content, starter templates and
-- content requests. Run once in the Supabase SQL Editor, AFTER 0004–0008.
--
-- Design notes
--  * Mentor content lives in the same `contents` table (owner_type = 'mentor',
--    owner_id = the mentor). A trigger pins it to visibility 'assigned' and
--    audience 'student', so it only ever reaches batches it's assigned to.
--  * Mentors assign their content only to batches they teach (is_batch_mentor).
--  * Templates: platform content with is_template = true; any mentor can read
--    published templates (to copy them). Copies remember template_source_id.
--  * content_requests: a paid "create it for me" service. Mentors only create
--    requests and respond to quotes, through SECURITY DEFINER functions that
--    enforce the lifecycle. The fee is recorded, never charged: settlement
--    happens outside the app and is marked by a super admin.

-- ---------------------------------------------------------------------------
-- 1. Templates + mentor ownership on contents
-- ---------------------------------------------------------------------------

alter table public.contents
  add column is_template boolean not null default false,
  add column template_source_id uuid references public.contents(id) on delete set null;

alter table public.contents
  add constraint contents_template_platform_only check (not is_template or owner_type = 'platform'),
  add constraint contents_mentor_has_owner check (owner_type = 'platform' or owner_id is not null);

create index contents_template_idx on public.contents (is_template) where is_template;

create function public.pin_mentor_content()
returns trigger
language plpgsql
as $$
begin
  if new.owner_type = 'mentor' then
    new.visibility := 'assigned';
    new.target_role := 'student';
    new.is_template := false;
  end if;
  return new;
end;
$$;

create trigger contents_pin_mentor before insert or update on public.contents
  for each row execute function public.pin_mentor_content();

-- Mentors: full control of their OWN content only (no delete: archive instead).
create policy "contents_mentor_own_read" on public.contents
  for select using (owner_type = 'mentor' and owner_id = auth.uid());

create policy "contents_mentor_own_insert" on public.contents
  for insert with check (
    owner_type = 'mentor' and owner_id = auth.uid() and created_by = auth.uid()
    and public.current_user_role() = 'mentor'
  );

create policy "contents_mentor_own_update" on public.contents
  for update
  using (owner_type = 'mentor' and owner_id = auth.uid())
  with check (owner_type = 'mentor' and owner_id = auth.uid());

-- Mentors read published templates (to copy them), whatever their audience.
create policy "contents_mentor_templates_read" on public.contents
  for select using (
    is_template and status = 'published' and owner_type = 'platform'
    and public.current_user_role() = 'mentor'
  );

-- Mentors assign their own content to batches they teach; they can always
-- remove assignments from their own content.
create function public.owns_content(p_content uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.contents where id = p_content and owner_type = 'mentor' and owner_id = auth.uid())
$$;

create policy "content_assignments_mentor_read" on public.content_assignments
  for select using (public.owns_content(content_id));

create policy "content_assignments_mentor_insert" on public.content_assignments
  for insert with check (
    public.owns_content(content_id) and academy_id is null and batch_id is not null
    and public.is_batch_mentor(batch_id) and created_by = auth.uid()
  );

create policy "content_assignments_mentor_delete" on public.content_assignments
  for delete using (public.owns_content(content_id));

-- ---------------------------------------------------------------------------
-- 2. Content requests (paid service, settled outside the app)
-- ---------------------------------------------------------------------------

create type public.content_request_status as enum ('requested', 'quoted', 'accepted', 'declined', 'in_progress', 'delivered', 'cancelled');
create type public.settlement_status as enum ('not_due', 'owed', 'settled');

create table public.content_requests (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  academy_id uuid references public.academies(id) on delete set null,
  title text not null,
  details text not null,
  category public.content_category not null,
  type public.content_type not null,
  needed_by date,
  status public.content_request_status not null default 'requested',
  quoted_fee_inr numeric(10, 2),
  quote_note text,
  quoted_at timestamptz,
  responded_at timestamptz,
  delivered_content_id uuid references public.contents(id) on delete set null,
  delivered_at timestamptz,
  settlement public.settlement_status not null default 'not_due',
  settled_at timestamptz,
  settled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_requests_title_length check (char_length(btrim(title)) between 3 and 140),
  constraint content_requests_details_length check (char_length(btrim(details)) between 10 and 4000),
  constraint content_requests_fee_positive check (quoted_fee_inr is null or (quoted_fee_inr > 0 and quoted_fee_inr <= 10000000))
);

create index content_requests_mentor_idx on public.content_requests (mentor_id, created_at desc);
create index content_requests_status_idx on public.content_requests (status, created_at desc);

alter table public.content_requests enable row level security;

create function public.touch_content_request()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger content_requests_touch before update on public.content_requests
  for each row execute function public.touch_content_request();

-- Mentors read and create their own requests; super admins read all and do
-- every staff-side transition (quote, progress, deliver, settle) — the
-- service enforces the lifecycle; mentors' own transitions go through the
-- functions below, never a direct update.
create policy "content_requests_mentor_read" on public.content_requests
  for select using (mentor_id = auth.uid());
create policy "content_requests_mentor_insert" on public.content_requests
  for insert with check (
    mentor_id = auth.uid() and status = 'requested' and quoted_fee_inr is null
    and settlement = 'not_due' and public.current_user_role() = 'mentor'
  );
create policy "content_requests_super_read" on public.content_requests
  for select using (public.is_super_admin());
create policy "content_requests_super_update" on public.content_requests
  for update using (public.is_super_admin()) with check (public.is_super_admin());

-- Mentor: accept or decline a quote (only their own, only while quoted).
create function public.respond_to_content_quote(p_request uuid, p_accept boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.content_requests
  set status = case when p_accept then 'accepted'::public.content_request_status else 'declined'::public.content_request_status end,
      settlement = case when p_accept then 'owed'::public.settlement_status else 'not_due'::public.settlement_status end,
      responded_at = now()
  where id = p_request and mentor_id = auth.uid() and status = 'quoted';
  if not found then
    raise exception 'this request is not waiting for your answer' using errcode = 'P0002';
  end if;
end;
$$;

-- Mentor: cancel before accepting.
create function public.cancel_content_request(p_request uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.content_requests
  set status = 'cancelled'
  where id = p_request and mentor_id = auth.uid() and status in ('requested', 'quoted');
  if not found then
    raise exception 'this request can no longer be cancelled' using errcode = 'P0002';
  end if;
end;
$$;

-- Super admin: deliver = copy a platform content item into the mentor's own
-- content (as a draft) and close the request, in one transaction.
create function public.deliver_content_request(p_request uuid, p_content uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  req public.content_requests%rowtype;
  src public.contents%rowtype;
  new_id uuid;
begin
  if not public.is_super_admin() then
    raise exception 'only a super admin can deliver requests' using errcode = '42501';
  end if;
  select * into req from public.content_requests where id = p_request for update;
  if not found or req.status not in ('accepted', 'in_progress') then
    raise exception 'only an accepted request can be delivered' using errcode = 'P0002';
  end if;
  select * into src from public.contents where id = p_content and owner_type = 'platform';
  if not found then
    raise exception 'choose platform content to deliver' using errcode = 'P0002';
  end if;

  insert into public.contents (title, description, category, type, difficulty, target_role, visibility, status, body, external_url, owner_type, owner_id, template_source_id, created_by, updated_by)
  values (src.title, src.description, src.category, src.type, src.difficulty, 'student', 'assigned', 'draft', src.body, src.external_url, 'mentor', req.mentor_id, src.id, auth.uid(), auth.uid())
  returning id into new_id;

  update public.content_requests
  set status = 'delivered', delivered_content_id = new_id, delivered_at = now()
  where id = p_request;

  insert into public.audit_log (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'content_request.delivered', 'content_request', p_request, jsonb_build_object('summary', 'Delivered to the mentor''s My Content', 'contentId', new_id));
  return new_id;
end;
$$;

revoke execute on function public.respond_to_content_quote(uuid, boolean) from public, anon;
revoke execute on function public.cancel_content_request(uuid) from public, anon;
revoke execute on function public.deliver_content_request(uuid, uuid) from public, anon;
grant execute on function public.respond_to_content_quote(uuid, boolean) to authenticated;
grant execute on function public.cancel_content_request(uuid) to authenticated;
grant execute on function public.deliver_content_request(uuid, uuid) to authenticated;
