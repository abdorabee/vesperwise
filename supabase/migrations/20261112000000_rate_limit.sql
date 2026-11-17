-- Fixed-window rate limiting shared by every serverless instance.
--
-- One row per (bucket_key, window_start). check_rate_limit() bumps the counter
-- for the current window in a single atomic upsert and reports whether the
-- caller is still within p_limit. Service role only; the app fails open if this
-- function is missing or errors.

create table if not exists public.rate_limit_counters (
  bucket_key   text        not null,
  window_start timestamptz not null,
  count        integer     not null default 0,
  primary key (bucket_key, window_start)
);

alter table public.rate_limit_counters enable row level security;

create or replace function public.check_rate_limit(
  p_key            text,
  p_limit          integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_seconds integer := greatest(p_window_seconds, 1);
  v_now            timestamptz := now();
  v_window_start   timestamptz;
  v_window_end     timestamptz;
  v_count          integer;
begin
  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / v_window_seconds) * v_window_seconds
  );
  v_window_end := v_window_start + make_interval(secs => v_window_seconds);

  insert into public.rate_limit_counters as c (bucket_key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (bucket_key, window_start) do update
    set count = c.count + 1
  returning c.count into v_count;

  -- Opportunistic cleanup of this key's expired windows.
  delete from public.rate_limit_counters
  where bucket_key = p_key
    and window_start < v_window_start;

  allowed := v_count <= p_limit;
  remaining := greatest(p_limit - v_count, 0);
  retry_after_seconds := greatest(ceil(extract(epoch from (v_window_end - v_now)))::integer, 1);
  return next;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
revoke all on function public.check_rate_limit(text, integer, integer) from anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
