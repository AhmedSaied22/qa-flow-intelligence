create extension if not exists pgcrypto;

create table if not exists public.requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists requirements_project_id_idx on public.requirements(project_id);
create index if not exists requirements_owner_id_idx on public.requirements(owner_id);

create table if not exists public.requirement_versions (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  version_number integer not null,
  title text not null,
  description text,
  status text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists requirement_versions_requirement_id_version_number_key
on public.requirement_versions(requirement_id, version_number);

alter table public.requirements enable row level security;
alter table public.requirement_versions enable row level security;

drop trigger if exists requirements_touch_updated_at on public.requirements;

create trigger requirements_touch_updated_at
before update on public.requirements
for each row execute function public.touch_updated_at();

drop policy if exists "requirements_select_own" on public.requirements;
drop policy if exists "requirements_insert_own" on public.requirements;
drop policy if exists "requirements_update_own" on public.requirements;
drop policy if exists "requirements_delete_own" on public.requirements;

create policy "requirements_select_own"
on public.requirements
for select
using (
  auth.uid() = owner_id
  and exists (
    select 1
    from public.projects
    where projects.id = requirements.project_id
      and projects.owner_id = auth.uid()
  )
);

create policy "requirements_insert_own"
on public.requirements
for insert
with check (
  auth.uid() = owner_id
  and exists (
    select 1
    from public.projects
    where projects.id = requirements.project_id
      and projects.owner_id = auth.uid()
  )
);

create policy "requirements_update_own"
on public.requirements
for update
using (
  auth.uid() = owner_id
  and exists (
    select 1
    from public.projects
    where projects.id = requirements.project_id
      and projects.owner_id = auth.uid()
  )
)
with check (
  auth.uid() = owner_id
  and exists (
    select 1
    from public.projects
    where projects.id = requirements.project_id
      and projects.owner_id = auth.uid()
  )
);

create policy "requirements_delete_own"
on public.requirements
for delete
using (
  auth.uid() = owner_id
  and exists (
    select 1
    from public.projects
    where projects.id = requirements.project_id
      and projects.owner_id = auth.uid()
  )
);

drop policy if exists "requirement_versions_select_own" on public.requirement_versions;
drop policy if exists "requirement_versions_insert_own" on public.requirement_versions;

create policy "requirement_versions_select_own"
on public.requirement_versions
for select
using (
  exists (
    select 1
    from public.requirements
    where requirements.id = requirement_versions.requirement_id
      and requirements.owner_id = auth.uid()
  )
);

create policy "requirement_versions_insert_own"
on public.requirement_versions
for insert
with check (
  exists (
    select 1
    from public.requirements
    where requirements.id = requirement_versions.requirement_id
      and requirements.owner_id = auth.uid()
  )
);
