-- Keep purchased top-up credits across plan renewals and changes.
--
-- credits_remaining stays the single spendable balance. topup_credits tracks how
-- much of that balance came from one-time top-ups, so the billing webhook can
-- grant plan credits as PLAN_CREDITS[plan] + topup_credits instead of wiping
-- top-ups. subscription_period_start records the billing period credits were
-- last granted for, so renewals are detected without double-granting.

alter table public.users
  add column if not exists topup_credits integer not null default 0,
  add column if not exists subscription_period_start timestamptz;

alter table public.users
  drop constraint if exists users_topup_credits_nonnegative;
alter table public.users
  add constraint users_topup_credits_nonnegative check (topup_credits >= 0);

-- Plan credits are spent before top-ups. Rather than editing every deduction
-- RPC, clamp topup_credits whenever the balance drops below it.
create or replace function public.clamp_topup_credits()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.credits_remaining < old.credits_remaining then
    new.topup_credits := greatest(0, least(new.topup_credits, new.credits_remaining));
  end if;
  return new;
end;
$$;

drop trigger if exists users_clamp_topup_credits on public.users;
create trigger users_clamp_topup_credits
  before update of credits_remaining on public.users
  for each row
  execute function public.clamp_topup_credits();

-- Atomically add a top-up purchase to both the spendable balance and the
-- top-up portion.
create or replace function public.increment_topup_credits(
  p_user_id text,
  p_amount  integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount <= 0 then
    raise exception 'p_amount must be positive';
  end if;

  update public.users
  set credits_remaining = credits_remaining + p_amount,
      topup_credits = topup_credits + p_amount
  where id = p_user_id;
end;
$$;

revoke all on function public.increment_topup_credits(text, integer) from public;
revoke all on function public.increment_topup_credits(text, integer) from anon, authenticated;
grant execute on function public.increment_topup_credits(text, integer) to service_role;
