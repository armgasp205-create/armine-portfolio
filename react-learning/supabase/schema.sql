-- Run once in your Supabase project's SQL Editor.
create table if not exists public.planner_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 1048576),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);
alter table public.planner_snapshots enable row level security;
revoke all on public.planner_snapshots from anon, authenticated;
grant select, insert, update on public.planner_snapshots to authenticated;
drop policy if exists "Read own planner" on public.planner_snapshots;
drop policy if exists "Insert own planner" on public.planner_snapshots;
drop policy if exists "Update own planner" on public.planner_snapshots;
create policy "Read own planner" on public.planner_snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own planner" on public.planner_snapshots for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own planner" on public.planner_snapshots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Atomic optimistic locking: an old device cannot silently overwrite a newer save.
create or replace function public.save_planner_snapshot(snapshot jsonb, expected_version integer)
returns integer language plpgsql security invoker set search_path = '' as $$
declare next_version integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if jsonb_typeof(snapshot) is distinct from 'object'
     or jsonb_typeof(snapshot->'tasks') is distinct from 'array'
     or jsonb_typeof(snapshot->'expenses') is distinct from 'array'
     or jsonb_typeof(snapshot->'budgets') is distinct from 'object'
     or expected_version is null or expected_version < 0 then
    raise exception 'invalid_snapshot';
  end if;
  if expected_version = 0 then
    insert into public.planner_snapshots(user_id,payload) values(auth.uid(),snapshot)
      on conflict (user_id) do nothing returning version into next_version;
  else
    update public.planner_snapshots set payload = snapshot, version = version + 1, updated_at = now()
      where user_id = auth.uid() and version = expected_version returning version into next_version;
  end if;
  if next_version is null then raise exception 'snapshot_conflict'; end if;
  return next_version;
end;
$$;
revoke all on function public.save_planner_snapshot(jsonb,integer) from public, anon;
grant execute on function public.save_planner_snapshot(jsonb,integer) to authenticated;
