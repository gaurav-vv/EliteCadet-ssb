-- SSB Academy — Phase 4 (T083): global learning content.
-- Run once in the Supabase SQL Editor, AFTER 0004–0007.
--
-- Design notes
--  * contents holds platform content now. owner_type/owner_id already leave
--    room for mentor-owned content (Phase 5) without a second table, but
--    Phase 4 only ever writes owner_type = 'platform'.
--  * Content is never deleted: status moves draft → published → archived.
--  * Readers see ONLY published content for their role, either visible to
--    everyone or assigned to their academy / their batch. That rule lives in
--    can_read_content() and is enforced by RLS, not by the UI.

create type public.content_category as enum ('psychology', 'gto', 'interview', 'communication', 'current_affairs', 'general');
create type public.content_type as enum ('study_material', 'video', 'document', 'article', 'practice_exercise', 'assessment', 'session_template', 'mock_activity');
create type public.content_difficulty as enum ('easy', 'medium', 'hard');
create type public.content_audience as enum ('student', 'mentor', 'both');
create type public.content_visibility as enum ('everyone', 'assigned');
create type public.content_status as enum ('draft', 'published', 'archived');
create type public.content_owner as enum ('platform', 'mentor');

create table public.contents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category public.content_category not null,
  type public.content_type not null,
  difficulty public.content_difficulty not null default 'medium',
  target_role public.content_audience not null default 'student',
  visibility public.content_visibility not null default 'everyone',
  status public.content_status not null default 'draft',
  body text,
  external_url text,
  owner_type public.content_owner not null default 'platform',
  owner_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint contents_title_length check (char_length(btrim(title)) between 3 and 140),
  constraint contents_url_https check (external_url is null or external_url ~ '^https://'),
  constraint contents_has_substance check (coalesce(btrim(body), '') <> '' or external_url is not null)
);

create index contents_status_idx on public.contents (status);
create index contents_category_idx on public.contents (category);
create index contents_owner_idx on public.contents (owner_type, owner_id);
create index contents_updated_idx on public.contents (updated_at desc);

create table public.content_assignments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents(id) on delete cascade,
  academy_id uuid references public.academies(id) on delete cascade,
  batch_id uuid references public.batches(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint content_assignments_one_target check ((academy_id is null) <> (batch_id is null))
);

create unique index content_assignments_academy_unique on public.content_assignments (content_id, academy_id) where academy_id is not null;
create unique index content_assignments_batch_unique on public.content_assignments (content_id, batch_id) where batch_id is not null;
create index content_assignments_academy_idx on public.content_assignments (academy_id);
create index content_assignments_batch_idx on public.content_assignments (batch_id);

alter table public.contents enable row level security;
alter table public.content_assignments enable row level security;

-- Keep updated_at / published_at honest regardless of what the client sends.
create function public.touch_content()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger contents_touch before insert or update on public.contents
  for each row execute function public.touch_content();

-- The reading rule (SECURITY DEFINER: reads batches/memberships without RLS
-- recursion). Super admins are handled by their own policy.
create function public.can_read_content(p_content uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.contents c
    join public.profiles me on me.id = auth.uid() and me.status = 'active'
    where c.id = p_content
      and c.status = 'published'
      and (
        c.target_role = 'both'
        or (c.target_role = 'student' and me.role in ('student', 'academy_admin'))
        or (c.target_role = 'mentor' and me.role in ('mentor', 'academy_admin'))
      )
      and (
        c.visibility = 'everyone'
        or exists (
          select 1 from public.content_assignments a
          where a.content_id = c.id
            and (
              (a.academy_id is not null and a.academy_id = me.academy_id)
              or (a.batch_id is not null and (
                exists (select 1 from public.batch_students s where s.batch_id = a.batch_id and s.student_id = me.id)
                or exists (select 1 from public.batch_mentors m where m.batch_id = a.batch_id and m.mentor_id = me.id)
                or public.batch_academy(a.batch_id) = public.current_admin_academy_id()
              ))
            )
        )
      )
  )
$$;

create policy "contents_super_admin_read" on public.contents for select using (public.is_super_admin());
create policy "contents_super_admin_insert" on public.contents
  for insert with check (public.is_super_admin() and owner_type = 'platform' and created_by = auth.uid());
create policy "contents_super_admin_update" on public.contents
  for update using (public.is_super_admin() and owner_type = 'platform') with check (public.is_super_admin() and owner_type = 'platform');
create policy "contents_reader_read" on public.contents for select using (public.can_read_content(id));

create policy "content_assignments_super_admin" on public.content_assignments
  for all using (public.is_super_admin()) with check (public.is_super_admin());
