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

  if next_count is null then
    return -1;
  end if;
  return daily_limit - next_count;
end;
$$;

revoke all on function public.consume_ai_quota(integer) from public, anon;
grant execute on function public.consume_ai_quota(integer) to authenticated;
