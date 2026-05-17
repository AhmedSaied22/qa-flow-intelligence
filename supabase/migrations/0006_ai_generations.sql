create extension if not exists pgcrypto;

grant usage on schema public to anon, authenticated;

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model text not null,
  prompt_version text not null,
  generation_type text not null,
  input_hash text not null,
  output_json jsonb,
  cache_status text not null default 'miss',
  status text not null default 'success',
  response_time_ms integer,
  token_input integer,
  token_output integer,
  estimated_cost numeric,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_generations_owner_id_idx on public.ai_generations(owner_id);
create index if not exists ai_generations_input_hash_idx on public.ai_generations(input_hash);
create index if not exists ai_generations_prompt_version_idx on public.ai_generations(prompt_version);

grant select, insert, update, delete
on table public.ai_generations
to authenticated;

alter table public.ai_generations enable row level security;

drop trigger if exists ai_generations_touch_updated_at on public.ai_generations;
create trigger ai_generations_touch_updated_at
before update on public.ai_generations
for each row execute function public.touch_updated_at();

drop policy if exists "ai_generations_select_own" on public.ai_generations;
drop policy if exists "ai_generations_insert_own" on public.ai_generations;
drop policy if exists "ai_generations_update_own" on public.ai_generations;
drop policy if exists "ai_generations_delete_own" on public.ai_generations;

create policy "ai_generations_select_own"
on public.ai_generations
for select
using (auth.uid() = owner_id);

create policy "ai_generations_insert_own"
on public.ai_generations
for insert
with check (auth.uid() = owner_id);

create policy "ai_generations_update_own"
on public.ai_generations
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "ai_generations_delete_own"
on public.ai_generations
for delete
using (auth.uid() = owner_id);
