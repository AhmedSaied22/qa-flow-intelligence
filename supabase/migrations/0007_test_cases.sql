create extension if not exists pgcrypto;

grant usage on schema public to anon, authenticated;

alter table public.ai_generations
add column if not exists project_id uuid references public.projects(id) on delete cascade,
add column if not exists requirement_id uuid references public.requirements(id) on delete cascade;

create table if not exists public.test_cases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  ai_generation_id uuid references public.ai_generations(id) on delete set null,
  title text not null,
  description text,
  preconditions text,
  steps jsonb not null default '[]'::jsonb,
  expected_result text,
  platform text not null,
  risk_level text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists test_cases_requirement_platform_title_key
on public.test_cases(requirement_id, platform, lower(title))
where status = 'active';

create index if not exists test_cases_project_id_idx on public.test_cases(project_id);
create index if not exists test_cases_requirement_id_idx on public.test_cases(requirement_id);
create index if not exists test_cases_ai_generation_id_idx on public.test_cases(ai_generation_id);

grant select, insert, update, delete
on table public.test_cases
to authenticated;

create table if not exists public.test_case_versions (
  id uuid primary key default gen_random_uuid(),
  test_case_id uuid not null references public.test_cases(id) on delete cascade,
  version_number integer not null,
  title text not null,
  description text,
  preconditions text,
  steps jsonb not null default '[]'::jsonb,
  expected_result text,
  platform text not null,
  risk_level text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists test_case_versions_test_case_id_version_number_key
on public.test_case_versions(test_case_id, version_number);

grant select, insert, update, delete
on table public.test_case_versions
to authenticated;

alter table public.test_cases enable row level security;
alter table public.test_case_versions enable row level security;

drop trigger if exists test_cases_touch_updated_at on public.test_cases;
create trigger test_cases_touch_updated_at
before update on public.test_cases
for each row execute function public.touch_updated_at();

drop policy if exists "test_cases_select_own" on public.test_cases;
drop policy if exists "test_cases_insert_own" on public.test_cases;
drop policy if exists "test_cases_update_own" on public.test_cases;
drop policy if exists "test_cases_delete_own" on public.test_cases;

create policy "test_cases_select_own"
on public.test_cases
for select
using (auth.uid() = (select owner_id from public.projects where projects.id = test_cases.project_id));

create policy "test_cases_insert_own"
on public.test_cases
for insert
with check (auth.uid() = (select owner_id from public.projects where projects.id = test_cases.project_id));

create policy "test_cases_update_own"
on public.test_cases
for update
using (auth.uid() = (select owner_id from public.projects where projects.id = test_cases.project_id))
with check (auth.uid() = (select owner_id from public.projects where projects.id = test_cases.project_id));

create policy "test_cases_delete_own"
on public.test_cases
for delete
using (auth.uid() = (select owner_id from public.projects where projects.id = test_cases.project_id));

drop policy if exists "test_case_versions_select_own" on public.test_case_versions;
drop policy if exists "test_case_versions_insert_own" on public.test_case_versions;

create policy "test_case_versions_select_own"
on public.test_case_versions
for select
using (
  exists (
    select 1
    from public.test_cases
    where test_cases.id = test_case_versions.test_case_id
      and auth.uid() = (select owner_id from public.projects where projects.id = test_cases.project_id)
  )
);

create policy "test_case_versions_insert_own"
on public.test_case_versions
for insert
with check (
  exists (
    select 1
    from public.test_cases
    where test_cases.id = test_case_versions.test_case_id
      and auth.uid() = (select owner_id from public.projects where projects.id = test_cases.project_id)
  )
);
