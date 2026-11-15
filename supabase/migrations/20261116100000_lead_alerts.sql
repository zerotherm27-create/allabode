-- Lead alerts: live in-app notifications + web push subscriptions.

-- 1) Realtime for the notification bell (RLS still limits each user to their own rows).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- 2) One row per browser/device a signed-in user has enabled alerts on.
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "own push subscriptions select" on public.push_subscriptions;
create policy "own push subscriptions select" on public.push_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists "own push subscriptions insert" on public.push_subscriptions;
create policy "own push subscriptions insert" on public.push_subscriptions
  for insert with check (user_id = auth.uid());

drop policy if exists "own push subscriptions delete" on public.push_subscriptions;
create policy "own push subscriptions delete" on public.push_subscriptions
  for delete using (user_id = auth.uid());
