create table if not exists public.cache_entries (
  key text primary key,
  value jsonb not null,
  expires_at timestamptz not null
);

create index if not exists cache_entries_expires_at_idx
  on public.cache_entries (expires_at);

alter table public.cache_entries enable row level security;

create table if not exists public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  queue text not null,
  dedupe_key text not null,
  payload jsonb not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  run_after timestamptz not null default now(),
  locked_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists background_jobs_live_dedupe_idx
  on public.background_jobs (queue, dedupe_key)
  where status in ('queued', 'running');

create index if not exists background_jobs_queue_status_run_after_idx
  on public.background_jobs (queue, status, run_after);

alter table public.background_jobs enable row level security;

grant all on table public.cache_entries to service_role;
grant all on table public.background_jobs to service_role;

create or replace function public.enqueue_background_job(
  p_queue text,
  p_dedupe_key text,
  p_payload jsonb,
  p_max_attempts integer default 3
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted boolean;
begin
  insert into public.background_jobs (
    queue,
    dedupe_key,
    payload,
    max_attempts
  )
  values (
    p_queue,
    p_dedupe_key,
    p_payload,
    p_max_attempts
  )
  on conflict (queue, dedupe_key) where status in ('queued', 'running')
  do nothing
  returning true into v_inserted;

  return coalesce(v_inserted, false);
end;
$$;

create or replace function public.claim_background_job(
  p_queue text,
  p_lock_seconds integer
)
returns setof public.background_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidate as (
    select id
    from public.background_jobs
    where queue = p_queue
      and (
        (status = 'queued' and run_after <= now())
        or (status = 'running' and locked_until < now())
      )
    order by run_after, created_at
    for update skip locked
    limit 1
  )
  update public.background_jobs jobs
  set
    status = 'running',
    attempts = jobs.attempts + 1,
    locked_until = now() + make_interval(secs => p_lock_seconds),
    completed_at = null
  from candidate
  where jobs.id = candidate.id
  returning jobs.*;
end;
$$;

create or replace function public.complete_background_job(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.background_jobs
  set
    status = 'completed',
    locked_until = null,
    last_error = null,
    completed_at = now()
  where id = p_id;
end;
$$;

create or replace function public.fail_background_job(
  p_id uuid,
  p_error text,
  p_backoff_seconds integer default 30
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.background_jobs
  set
    status = case
      when attempts < max_attempts then 'queued'
      else 'failed'
    end,
    run_after = case
      when attempts < max_attempts then
        now() + make_interval(
          secs => (
            greatest(p_backoff_seconds, 0)
            * power(2::numeric, greatest(attempts - 1, 0))
          )::integer
        )
      else run_after
    end,
    locked_until = null,
    last_error = p_error,
    completed_at = case
      when attempts < max_attempts then null
      else now()
    end
  where id = p_id;
end;
$$;

create or replace function public.purge_expired_cache_entries()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.cache_entries
  where expires_at < now();

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

create or replace function public.purge_finished_background_jobs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.background_jobs
  where status in ('completed', 'failed')
    and completed_at < now() - interval '24 hours';

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.enqueue_background_job(text, text, jsonb, integer) from public;
revoke all on function public.claim_background_job(text, integer) from public;
revoke all on function public.complete_background_job(uuid) from public;
revoke all on function public.fail_background_job(uuid, text, integer) from public;
revoke all on function public.purge_expired_cache_entries() from public;
revoke all on function public.purge_finished_background_jobs() from public;
revoke all on function public.enqueue_background_job(text, text, jsonb, integer) from anon, authenticated;
revoke all on function public.claim_background_job(text, integer) from anon, authenticated;
revoke all on function public.complete_background_job(uuid) from anon, authenticated;
revoke all on function public.fail_background_job(uuid, text, integer) from anon, authenticated;
revoke all on function public.purge_expired_cache_entries() from anon, authenticated;
revoke all on function public.purge_finished_background_jobs() from anon, authenticated;

grant execute on function public.enqueue_background_job(text, text, jsonb, integer) to service_role;
grant execute on function public.claim_background_job(text, integer) to service_role;
grant execute on function public.complete_background_job(uuid) to service_role;
grant execute on function public.fail_background_job(uuid, text, integer) to service_role;
grant execute on function public.purge_expired_cache_entries() to service_role;
grant execute on function public.purge_finished_background_jobs() to service_role;

-- Supabase Cron is optional. When pg_cron has been enabled before this
-- migration, install/update the purge jobs. Otherwise the service-role RPCs
-- remain available to an external scheduler.
do $replace_redis_cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
    and to_regnamespace('cron') is not null then
    perform cron.schedule(
      'cache-entry-purge',
      '*/15 * * * *',
      'select public.purge_expired_cache_entries()'
    );
    perform cron.schedule(
      'postgres-background-job-purge',
      '0 * * * *',
      'select public.purge_finished_background_jobs()'
    );
  else
    raise notice 'pg_cron is not enabled; schedule cache/job purges with a service-role scheduler';
  end if;
end
$replace_redis_cron$;
