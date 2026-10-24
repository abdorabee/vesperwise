-- Add the plus plan to public.users.plan.
-- Idempotent: drops whatever check currently constrains plan, then adds the
-- ladder that includes plus. Safe to re-run.
--
-- Rollback: restore the check without plus only when no row uses plus.
--   select count(*) from public.users where plan = 'plus';
--   -- stop here if that count is not 0
--   alter table public.users drop constraint if exists users_plan_check;
--   alter table public.users add constraint users_plan_check
--     check (plan in ('free','starter','growth','pro','agency'));

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'users'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%plan%'
  loop
    execute format('alter table public.users drop constraint %I', constraint_name);
  end loop;

  alter table public.users
    add constraint users_plan_check
    check (plan in ('free', 'starter', 'plus', 'growth', 'pro', 'agency'));
end $$;
