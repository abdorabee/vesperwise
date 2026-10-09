-- Living brief: the model-composed score report spec.
-- complete_score_run already stores it inside score_runs.result; this copies it
-- onto the score row so stored reports render the model's brief, not the fallback.

alter table public.scores add column if not exists brief jsonb;

create or replace function public.sync_score_brief()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed'
    and new.score_id is not null
    and new.result ? 'brief' then
    update public.scores
    set brief = new.result -> 'brief'
    where id = new.score_id;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_score_brief() from public, anon, authenticated;

drop trigger if exists score_runs_sync_score_brief on public.score_runs;
create trigger score_runs_sync_score_brief
  after update of status, result, score_id on public.score_runs
  for each row execute function public.sync_score_brief();
