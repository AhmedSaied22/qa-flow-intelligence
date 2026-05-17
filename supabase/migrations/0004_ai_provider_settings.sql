create extension if not exists pgcrypto;

grant usage on schema public to anon, authenticated;

create table if not exists public.ai_provider_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'gemini',
  use_byok boolean not null default false,
  gemini_model text not null default 'gemini-flash-latest',
  gemini_api_key text,
  gemini_free_quota_limit integer not null default 0,
  gemini_free_quota_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_provider_settings_owner_id_key
on public.ai_provider_settings(owner_id);

alter table public.ai_provider_settings enable row level security;

grant select, insert, update, delete
on table public.ai_provider_settings
to authenticated;

drop trigger if exists ai_provider_settings_touch_updated_at on public.ai_provider_settings;

create trigger ai_provider_settings_touch_updated_at
before update on public.ai_provider_settings
for each row execute function public.touch_updated_at();

drop policy if exists "ai_provider_settings_select_own" on public.ai_provider_settings;
drop policy if exists "ai_provider_settings_insert_own" on public.ai_provider_settings;
drop policy if exists "ai_provider_settings_update_own" on public.ai_provider_settings;
drop policy if exists "ai_provider_settings_delete_own" on public.ai_provider_settings;

create policy "ai_provider_settings_select_own"
on public.ai_provider_settings
for select
using (auth.uid() = owner_id);

create policy "ai_provider_settings_insert_own"
on public.ai_provider_settings
for insert
with check (auth.uid() = owner_id);

create policy "ai_provider_settings_update_own"
on public.ai_provider_settings
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "ai_provider_settings_delete_own"
on public.ai_provider_settings
for delete
using (auth.uid() = owner_id);
