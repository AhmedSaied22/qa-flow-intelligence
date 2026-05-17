create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_id_idx on public.projects(owner_id);

alter table public.projects enable row level security;

drop trigger if exists projects_touch_updated_at on public.projects;

create trigger projects_touch_updated_at
before update on public.projects
for each row execute function public.touch_updated_at();

drop policy if exists "projects_select_own" on public.projects;
drop policy if exists "projects_insert_own" on public.projects;
drop policy if exists "projects_update_own" on public.projects;
drop policy if exists "projects_delete_own" on public.projects;

create policy "projects_select_own"
on public.projects
for select
using (auth.uid() = owner_id);

create policy "projects_insert_own"
on public.projects
for insert
with check (auth.uid() = owner_id);

create policy "projects_update_own"
on public.projects
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "projects_delete_own"
on public.projects
for delete
using (auth.uid() = owner_id);
