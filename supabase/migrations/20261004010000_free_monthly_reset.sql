-- Monthly free-plan credit refill ("Free: 20 account scores / month").
--
-- credits_reset_at records when a free user's allowance was last refilled.
-- Existing rows are backfilled from created_at so long-standing free users get
-- the refill they were promised on the first run.

alter table public.users
  add column if not exists credits_reset_at timestamptz not null default now();

update public.users set credits_reset_at = created_at where created_at is not null;

create index if not exists users_free_credits_reset_idx
  on public.users (credits_reset_at)
  where plan = 'free';

-- Refill every free user whose last refill is at least a month old. The
-- allowance is 20 plus any purchased top-ups, and a balance is never lowered.
-- Returns the number of users refilled.
create or replace function public.reset_free_credits(p_allowance integer default 20)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.users
  set credits_remaining = greatest(credits_remaining, p_allowance + topup_credits),
      credits_reset_at = now()
  where plan = 'free'
    and credits_reset_at <= now() - interval '1 month';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.reset_free_credits(integer) from public;
revoke all on function public.reset_free_credits(integer) from anon, authenticated;
grant execute on function public.reset_free_credits(integer) to service_role;
