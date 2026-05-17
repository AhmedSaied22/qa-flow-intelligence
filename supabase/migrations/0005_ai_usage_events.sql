create extension if not exists pgcrypto;

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  ai_generation_id uuid,
  provider text not null,
  model text not null,
  source text not null default 'free_default',
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  response_time_ms integer,
  cache_hit boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_owner_id_idx on public.ai_usage_events(owner_id);

alter table public.ai_usage_events enable row level security;

drop policy if exists "ai_usage_events_select_own" on public.ai_usage_events;
drop policy if exists "ai_usage_events_insert_own" on public.ai_usage_events;

create policy "ai_usage_events_select_own"
on public.ai_usage_events
for select
using (auth.uid() = owner_id);

create policy "ai_usage_events_insert_own"
on public.ai_usage_events
for insert
with check (auth.uid() = owner_id);
