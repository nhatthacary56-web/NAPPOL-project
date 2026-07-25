-- Run once in Supabase Dashboard → SQL Editor → New query → Run
-- Project: lykfepwuqyuywpljacwr

create table if not exists public.app_state (
  id text primary key default 'main',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Backend uses secret key (bypasses RLS). No public policies needed.
comment on table public.app_state is 'Great App marketplace JSON snapshot';

-- Durable image uploads: bucket is auto-created by the API as "app-uploads" (public).
-- If createBucket is blocked, create it once in Dashboard → Storage → New bucket:
--   name: app-uploads
--   public: true
--   file size limit: 5MB

