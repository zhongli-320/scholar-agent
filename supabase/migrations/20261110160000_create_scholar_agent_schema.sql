create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.saved_works (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  openalex_id text not null,
  work jsonb not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, openalex_id)
);

create table public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null check (char_length(trim(query)) between 1 and 500),
  mode text not null check (mode in ('basic', 'ai')),
  filters jsonb not null default '{}'::jsonb,
  ai_explanation jsonb,
  result_count integer not null check (result_count >= 0),
  created_at timestamptz not null default now()
);

create table public.ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  used_count integer not null default 0 check (used_count >= 0),
  primary key (user_id, usage_date)
);

create index projects_user_created_idx on public.projects (user_id, created_at desc);
create index saved_works_project_created_idx on public.saved_works (project_id, created_at desc);
create index search_history_user_created_idx on public.search_history (user_id, created_at desc);

alter table public.projects enable row level security;
alter table public.saved_works enable row level security;
alter table public.search_history enable row level security;
alter table public.ai_daily_usage enable row level security;

create policy "projects_select_own" on public.projects for select to authenticated using ((select auth.uid()) = user_id);
create policy "projects_insert_own" on public.projects for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "projects_update_own" on public.projects for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "projects_delete_own" on public.projects for delete to authenticated using ((select auth.uid()) = user_id);

create policy "saved_works_select_own" on public.saved_works for select to authenticated using ((select auth.uid()) = user_id);
create policy "saved_works_insert_own" on public.saved_works for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.projects where projects.id = project_id and projects.user_id = (select auth.uid())
  )
);
create policy "saved_works_update_own" on public.saved_works for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.projects where projects.id = project_id and projects.user_id = (select auth.uid())
  )
);
create policy "saved_works_delete_own" on public.saved_works for delete to authenticated using ((select auth.uid()) = user_id);

create policy "search_history_select_own" on public.search_history for select to authenticated using ((select auth.uid()) = user_id);
create policy "search_history_insert_own" on public.search_history for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "search_history_delete_own" on public.search_history for delete to authenticated using ((select auth.uid()) = user_id);

create policy "ai_daily_usage_select_own" on public.ai_daily_usage for select to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.saved_works to authenticated;
grant select, insert, delete on public.search_history to authenticated;
grant select on public.ai_daily_usage to authenticated;

create or replace function public.consume_ai_quota(daily_limit integer default 2)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  next_count integer;
begin
  if caller is null then
    raise exception 'authentication required';
  end if;
  if daily_limit <> 2 then
    raise exception 'invalid daily limit';
  end if;

  insert into public.ai_daily_usage (user_id, usage_date, used_count)
  values (caller, current_date, 1)
  on conflict (user_id, usage_date) do update
    set used_count = public.ai_daily_usage.used_count + 1
    where public.ai_daily_usage.used_count < daily_limit
  returning used_count into next_count;

  if next_count is null or next_count > daily_limit then
    return -1;
  end if;
  return daily_limit - next_count;
end;
$$;

revoke all on function public.consume_ai_quota(integer) from public, anon;
grant execute on function public.consume_ai_quota(integer) to authenticated;
