-- Retry budget for bulk completion webhooks.
-- webhook_sent_at stays null until a send succeeds or a logged give-up.
-- Idempotent. Rollback:
--   drop function if exists public.give_up_bulk_webhook(uuid, integer);
--   drop function if exists public.release_bulk_webhook_attempt(uuid);
--   drop function if exists public.claim_bulk_webhook_attempt(uuid, integer, integer);
--   drop index if exists public.bulk_jobs_webhook_unsent_idx;
--   alter table public.bulk_jobs drop column if exists webhook_attempt_until;
--   alter table public.bulk_jobs drop column if exists webhook_attempts;

alter table public.bulk_jobs add column if not exists webhook_attempts integer not null default 0;
alter table public.bulk_jobs add column if not exists webhook_attempt_until timestamptz;

create index if not exists bulk_jobs_webhook_unsent_idx
  on public.bulk_jobs (created_at)
  where webhook_sent_at is null
    and webhook_url is not null
    and status in ('completed', 'failed');

create or replace function public.claim_bulk_webhook_attempt(
  p_job_id uuid,
  p_max_attempts integer,
  p_lease_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts integer;
begin
  update public.bulk_jobs
  set
    webhook_attempts = webhook_attempts + 1,
    webhook_attempt_until = now() + make_interval(secs => greatest(p_lease_seconds, 1))
  where id = p_job_id
    and webhook_sent_at is null
    and webhook_url is not null
    and status in ('completed', 'failed')
    and webhook_attempts < greatest(p_max_attempts, 1)
    and (webhook_attempt_until is null or webhook_attempt_until < now())
  returning webhook_attempts into v_attempts;
  return v_attempts;
end;
$$;

create or replace function public.release_bulk_webhook_attempt(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bulk_jobs
  set webhook_attempt_until = null
  where id = p_job_id
    and webhook_sent_at is null;
end;
$$;

create or replace function public.give_up_bulk_webhook(
  p_job_id uuid,
  p_max_attempts integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  update public.bulk_jobs
  set webhook_sent_at = now()
  where id = p_job_id
    and webhook_sent_at is null
    and webhook_url is not null
    and status in ('completed', 'failed')
    and webhook_attempts >= greatest(p_max_attempts, 1)
    and (webhook_attempt_until is null or webhook_attempt_until < now())
  returning id into v_id;
  return v_id is not null;
end;
$$;

revoke all on function public.claim_bulk_webhook_attempt(uuid, integer, integer) from public;
revoke all on function public.claim_bulk_webhook_attempt(uuid, integer, integer) from anon, authenticated;
grant execute on function public.claim_bulk_webhook_attempt(uuid, integer, integer) to service_role;

revoke all on function public.release_bulk_webhook_attempt(uuid) from public;
revoke all on function public.release_bulk_webhook_attempt(uuid) from anon, authenticated;
grant execute on function public.release_bulk_webhook_attempt(uuid) to service_role;

revoke all on function public.give_up_bulk_webhook(uuid, integer) from public;
revoke all on function public.give_up_bulk_webhook(uuid, integer) from anon, authenticated;
grant execute on function public.give_up_bulk_webhook(uuid, integer) to service_role;
