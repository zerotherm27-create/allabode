-- Rate-limit bookkeeping for the public AI chat endpoint (app/api/chat/route.ts) —
-- the first unauthenticated, AI-cost-bearing endpoint in this codebase. Keyed off
-- a hashed IP (or client-generated session id as a fallback), not tied to any
-- user account. Staff-only RLS; the app writes to this via the SSR client from
-- within the API route (same trust model as every other server-side table write).

create table chat_rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  count        int not null default 1
);

alter table chat_rate_limits enable row level security;

create policy "staff full chat_rate_limits" on chat_rate_limits for all using (is_staff()) with check (is_staff());

-- The API route uses a SECURITY DEFINER RPC to check+increment atomically
-- without needing service-role or staff-authenticated access.
create or replace function chat_rate_limit_check(p_key text, p_limit int, p_window_minutes int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_row chat_rate_limits;
  v_allowed boolean;
begin
  select * into v_row from chat_rate_limits where key = p_key for update;

  if v_row is null then
    insert into chat_rate_limits (key, window_start, count) values (p_key, now(), 1);
    return true;
  end if;

  if v_row.window_start < now() - (p_window_minutes || ' minutes')::interval then
    update chat_rate_limits set window_start = now(), count = 1 where key = p_key;
    return true;
  end if;

  v_allowed := v_row.count < p_limit;
  if v_allowed then
    update chat_rate_limits set count = count + 1 where key = p_key;
  end if;
  return v_allowed;
end;
$$;
