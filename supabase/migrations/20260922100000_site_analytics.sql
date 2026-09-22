-- First-party site analytics: anonymous session + pageview tracking for the
-- admin dashboard. No third-party service, no cookies beyond one httpOnly
-- session id. Never stores raw IPs — only the country/region/city already
-- resolved by Vercel's edge (x-vercel-ip-* request headers).
--
-- Written only by /api/site/visit + /api/site/heartbeat via the service-role
-- client (public routes, no user session to scope RLS to), so RLS here just
-- gates reads to staff — there is no insert/update policy for anon at all.

create table site_sessions (
  id                uuid primary key,
  created_at        timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  duration_seconds  int not null default 0,
  landing_path      text not null,
  page_count        int not null default 1,
  device_type       text not null default 'unknown'
                       check (device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  os                text,
  browser           text,
  country           text,
  region            text,
  city              text,
  referrer          text,
  utm_source        text
);

create index site_sessions_created_at_idx on site_sessions (created_at);

create table site_pageviews (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references site_sessions(id) on delete cascade,
  path         text not null,
  occurred_at  timestamptz not null default now()
);

create index site_pageviews_session_id_idx on site_pageviews (session_id);
create index site_pageviews_occurred_at_idx on site_pageviews (occurred_at);

alter table site_sessions enable row level security;
alter table site_pageviews enable row level security;

create policy "staff full site_sessions"  on site_sessions  for all using (is_staff());
create policy "staff full site_pageviews" on site_pageviews for all using (is_staff());
