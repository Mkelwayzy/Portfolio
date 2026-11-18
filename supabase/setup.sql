create table if not exists public.portfolio_content (
  id smallint primary key check (id = 1),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.portfolio_content enable row level security;
alter table public.portfolio_admins enable row level security;

revoke all on public.portfolio_content from public, anon, authenticated;
revoke all on public.portfolio_admins from public, anon, authenticated;

grant select on public.portfolio_content to anon, authenticated;
grant insert, update, delete on public.portfolio_content to authenticated;
grant select on public.portfolio_admins to authenticated;

drop policy if exists "Public can read portfolio content" on public.portfolio_content;
create policy "Public can read portfolio content"
  on public.portfolio_content for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert portfolio content" on public.portfolio_content;
create policy "Admins can insert portfolio content"
  on public.portfolio_content for insert
  to authenticated
  with check (
    exists (
      select 1 from public.portfolio_admins
      where user_id = (select auth.uid())
    )
  );

drop policy if exists "Admins can update portfolio content" on public.portfolio_content;
create policy "Admins can update portfolio content"
  on public.portfolio_content for update
  to authenticated
  using (
    exists (
      select 1 from public.portfolio_admins
      where user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.portfolio_admins
      where user_id = (select auth.uid())
    )
  );

drop policy if exists "Admins can delete portfolio content" on public.portfolio_content;
create policy "Admins can delete portfolio content"
  on public.portfolio_content for delete
  to authenticated
  using (
    exists (
      select 1 from public.portfolio_admins
      where user_id = (select auth.uid())
    )
  );

drop policy if exists "Admins can read their own membership" on public.portfolio_admins;
create policy "Admins can read their own membership"
  on public.portfolio_admins for select
  to authenticated
  using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-assets',
  'portfolio-assets',
  true,
  104857600,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'application/pdf', 'video/mp4', 'video/webm']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read portfolio assets" on storage.objects;
create policy "Public can read portfolio assets"
  on storage.objects for select
  to public
  using (bucket_id = 'portfolio-assets');

drop policy if exists "Admins can upload portfolio assets" on storage.objects;
create policy "Admins can upload portfolio assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'portfolio-assets'
    and exists (
      select 1 from public.portfolio_admins
      where user_id = (select auth.uid())
    )
  );

drop policy if exists "Admins can update portfolio assets" on storage.objects;
create policy "Admins can update portfolio assets"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'portfolio-assets'
    and exists (
      select 1 from public.portfolio_admins
      where user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'portfolio-assets'
    and exists (
      select 1 from public.portfolio_admins
      where user_id = (select auth.uid())
    )
  );

drop policy if exists "Admins can delete portfolio assets" on storage.objects;
create policy "Admins can delete portfolio assets"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'portfolio-assets'
    and exists (
      select 1 from public.portfolio_admins
      where user_id = (select auth.uid())
    )
  );

-- Create the administrator in Supabase Auth first, then replace this email and run:
-- insert into public.portfolio_admins (user_id)
-- select id from auth.users where email = 'YOUR_ADMIN_EMAIL'
-- on conflict (user_id) do nothing;

create table if not exists public.portfolio_availability (
  id smallint primary key check (id = 1),
  status text not null default 'available' check (status in ('available', 'limited', 'unavailable')),
  message_en text not null default 'Available for selected projects and creative direction.',
  message_ar text not null default 'متاح للمشاريع المختارة والاستشارات الإبداعية.',
  expected_date date,
  inquiries_enabled boolean not null default true,
  preferred_contact text[] not null default array['WhatsApp','Email']::text[],
  updated_at timestamptz not null default now()
);

insert into public.portfolio_availability (id) values (1)
on conflict (id) do nothing;

alter table public.portfolio_availability enable row level security;
revoke all on public.portfolio_availability from public, anon, authenticated;
grant select on public.portfolio_availability to anon, authenticated;
grant insert, update on public.portfolio_availability to authenticated;

drop policy if exists "Public can read portfolio availability" on public.portfolio_availability;
create policy "Public can read portfolio availability"
  on public.portfolio_availability for select to anon, authenticated using (true);

drop policy if exists "Admins can update portfolio availability" on public.portfolio_availability;
create policy "Admins can update portfolio availability"
  on public.portfolio_availability for update to authenticated
  using (exists (select 1 from public.portfolio_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.portfolio_admins where user_id = (select auth.uid())));

create table if not exists public.portfolio_inquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contact','brief')),
  name text not null,
  company text,
  email text,
  country text,
  project_type text,
  budget text,
  description text,
  brief jsonb not null default '{}'::jsonb,
  attachment_names text[] not null default '{}'::text[],
  status text not null default 'new' check (status in ('new','reviewing','approved','closed','spam')),
  internal_notes text,
  spam_score smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portfolio_inquiries enable row level security;
revoke all on public.portfolio_inquiries from public, anon, authenticated;
grant insert on public.portfolio_inquiries to anon, authenticated;
grant select, update, delete on public.portfolio_inquiries to authenticated;

drop policy if exists "Anyone can submit portfolio inquiries" on public.portfolio_inquiries;
create policy "Anyone can submit portfolio inquiries"
  on public.portfolio_inquiries for insert to anon, authenticated
  with check (
    char_length(trim(name)) between 2 and 120
    and char_length(coalesce(description, brief::text, '')) between 1 and 10000
  );

drop policy if exists "Admins can manage portfolio inquiries" on public.portfolio_inquiries;
create policy "Admins can manage portfolio inquiries"
  on public.portfolio_inquiries for all to authenticated
  using (exists (select 1 from public.portfolio_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.portfolio_admins where user_id = (select auth.uid())));

create table if not exists public.portfolio_analytics_events (
  id bigint generated always as identity primary key,
  visitor_key text not null,
  session_key text not null,
  event_type text not null,
  project_id text,
  path text,
  country text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_analytics_events_created_idx
  on public.portfolio_analytics_events (created_at desc);
create index if not exists portfolio_analytics_events_type_idx
  on public.portfolio_analytics_events (event_type, created_at desc);

alter table public.portfolio_analytics_events enable row level security;
revoke all on public.portfolio_analytics_events from public, anon, authenticated;
grant insert on public.portfolio_analytics_events to anon, authenticated;
grant select on public.portfolio_analytics_events to authenticated;

drop policy if exists "Anyone can record portfolio analytics" on public.portfolio_analytics_events;
create policy "Anyone can record portfolio analytics"
  on public.portfolio_analytics_events for insert to anon, authenticated
  with check (
    char_length(visitor_key) between 8 and 80
    and char_length(session_key) between 8 and 80
    and char_length(event_type) between 2 and 50
  );

drop policy if exists "Admins can read portfolio analytics" on public.portfolio_analytics_events;
create policy "Admins can read portfolio analytics"
  on public.portfolio_analytics_events for select to authenticated
  using (exists (select 1 from public.portfolio_admins where user_id = (select auth.uid())));
