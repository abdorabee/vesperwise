-- "My Watchlist" becomes a system list: its members are derived live from the active
-- watchlist rows (never copied into list_members), it cannot be deleted, and a user
-- can have at most one. Safe to re-run.

alter table public.lists
  add column if not exists is_system boolean not null default false;

-- Flag each user's original auto-created default list (oldest match by name + origin text).
update public.lists l
set is_system = true
where l.is_system = false
  and l.name = 'My Watchlist'
  and l.list_type = 'manual'
  and l.icon_initials = 'MW'
  and l.description = 'Accounts from your watchlist'
  and l.id = (
    select l2.id
    from public.lists l2
    where l2.user_id = l.user_id
      and l2.name = 'My Watchlist'
      and l2.list_type = 'manual'
      and l2.icon_initials = 'MW'
      and l2.description = 'Accounts from your watchlist'
      and not exists (
        select 1 from public.lists s where s.user_id = l.user_id and s.is_system
      )
    order by l2.created_at asc, l2.id asc
    limit 1
  );

-- At most one system list per user (also makes concurrent ensureDefaultList calls safe).
create unique index if not exists lists_one_system_per_user_idx
  on public.lists (user_id)
  where is_system;

-- Copied membership of system lists is now stale; members come from the watchlist.
delete from public.list_members
where list_id in (select id from public.lists where is_system);
