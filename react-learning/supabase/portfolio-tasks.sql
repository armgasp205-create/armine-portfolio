-- Run in project mmucgmsnlcfywypjokyw using Supabase SQL Editor.
-- Creates a separate table; existing planner snapshots are preserved.
begin;

create table if not exists public.portfolio_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 1 and 120),
  done boolean not null default false,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due date,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_tasks_user_created
  on public.portfolio_tasks (user_id, created_at desc);

alter table public.portfolio_tasks enable row level security;
revoke all on public.portfolio_tasks from public, anon, authenticated;
grant select, insert, update on public.portfolio_tasks to authenticated;

drop policy if exists "portfolio_tasks_read_own" on public.portfolio_tasks;
create policy "portfolio_tasks_read_own" on public.portfolio_tasks
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "portfolio_tasks_insert_own" on public.portfolio_tasks;
create policy "portfolio_tasks_insert_own" on public.portfolio_tasks
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "portfolio_tasks_update_own" on public.portfolio_tasks;
create policy "portfolio_tasks_update_own" on public.portfolio_tasks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No DELETE permission: the app will use deleted_at for trash and restoration.
commit;

select 'portfolio_tasks ready' as result;
