alter table public.test_cases
add column if not exists priority text not null default 'medium',
add column if not exists case_type text not null default 'functional',
add column if not exists test_data jsonb not null default '[]'::jsonb,
add column if not exists automation_candidate text;

alter table public.test_case_versions
add column if not exists priority text not null default 'medium',
add column if not exists case_type text not null default 'functional',
add column if not exists test_data jsonb not null default '[]'::jsonb,
add column if not exists automation_candidate text,
add column if not exists change_reason text;

create index if not exists test_cases_status_idx on public.test_cases(status);
create index if not exists test_cases_platform_idx on public.test_cases(platform);
create index if not exists test_cases_risk_level_idx on public.test_cases(risk_level);

update public.test_cases
set priority = case
  when risk_level = 'high' then 'critical'
  when risk_level = 'medium' then 'high'
  else 'low'
end
where priority is null
   or priority = ''
   or priority = 'low';

update public.test_case_versions
set priority = case
  when risk_level = 'high' then 'critical'
  when risk_level = 'medium' then 'high'
  else 'low'
end
where priority is null
   or priority = ''
   or priority = 'low';

grant select, insert, update, delete
on table public.test_cases
to authenticated;

grant select, insert, update, delete
on table public.test_case_versions
to authenticated;

notify pgrst, 'reload schema';
