-- Add the plus plan to public.users.plan.
-- Idempotent: drops only the named plan check, then adds the ladder that
-- includes plus. Safe to re-run. Does not touch other users constraints.
--
-- Rollback: restore the check without plus only when no row uses plus.
--   select count(*) from public.users where plan = 'plus';
--   -- stop here if that count is not 0
--   alter table public.users drop constraint if exists users_plan_check;
--   alter table public.users add constraint users_plan_check
--     check (plan in ('free','starter','growth','pro','agency'));

alter table public.users drop constraint if exists users_plan_check;

alter table public.users
  add constraint users_plan_check
  check (plan in ('free', 'starter', 'plus', 'growth', 'pro', 'agency'));
