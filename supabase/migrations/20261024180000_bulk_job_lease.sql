-- Lease a bulk job so only one worker advances it, and record a single webhook send.
-- Idempotent. Rollback:
--   drop function if exists public.mark_bulk_webhook_sent(uuid);
--   drop function if exists public.claim_bulk_job(uuid, text, integer);
--   alter table public.bulk_jobs drop column if exists webhook_sent_at;
--   alter table public.bulk_jobs drop column if exists lease_until;
--   alter table public.bulk_jobs drop column if exists lease_token;

alter table public.bulk_jobs add column if not exists lease_token text;
alter table public.bulk_jobs add column if not exists lease_until timestamptz;
alter table public.bulk_jobs add column if not exists webhook_sent_at timestamptz;

create or replace function public.claim_bulk_job(
  p_job_id uuid,
  p_token text,
  p_lease_seconds integer
)
returns setof public.bulk_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(p_token), '') is null then
    raise exception 'lease token is required';
  end if;

  return query
  update public.bulk_jobs
  set
    lease_token = p_token,
    lease_until = now() + make_interval(secs => greatest(p_lease_seconds, 1))
  where id = p_job_id
    and status = 'processing'
    and (
      lease_until is null
      or lease_until < now()
      or lease_token = p_token
    )
  returning *;
end;
$$;

create or replace function public.mark_bulk_webhook_sent(p_job_id uuid)
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
  returning id into v_id;
  return v_id is not null;
end;
$$;

revoke all on function public.claim_bulk_job(uuid, text, integer) from public;
revoke all on function public.claim_bulk_job(uuid, text, integer) from anon, authenticated;
grant execute on function public.claim_bulk_job(uuid, text, integer) to service_role;

revoke all on function public.mark_bulk_webhook_sent(uuid) from public;
revoke all on function public.mark_bulk_webhook_sent(uuid) from anon, authenticated;
grant execute on function public.mark_bulk_webhook_sent(uuid) to service_role;
