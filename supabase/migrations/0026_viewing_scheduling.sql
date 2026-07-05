-- In-house viewing scheduler: a single site-wide default weekly availability
-- schedule (listing_id nullable so a future per-listing override needs no
-- migration), real slot booking with a race-safe SECURITY DEFINER RPC, and a
-- PII-free slot-listing RPC for anonymous visitors. Mirrors the RLS/RPC
-- conventions established in 0023_tenancy_signing.sql: staff get full table
-- access via is_staff(); anon never touches the tables directly, only the
-- two narrow RPCs below (matching this project's default of granting EXECUTE
-- to PUBLIC on new functions, same as every other RPC in this codebase).

create type viewing_status as enum ('Requested', 'Confirmed', 'Cancelled', 'Completed', 'No-show');

create table viewing_availability (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid references listings(id) on delete cascade, -- null = site-wide default
  day_of_week  int not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time   time not null,
  end_time     time not null,
  slot_minutes int not null default 30 check (slot_minutes > 0),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger viewing_availability_updated_at before update on viewing_availability
  for each row execute function set_updated_at();

create table viewing_bookings (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid not null references listings(id) on delete cascade,
  name             text not null,
  email            text not null,
  phone            text,
  slot_start       timestamptz not null,
  slot_end         timestamptz not null,
  status           viewing_status not null default 'Requested',
  notes            text,
  reminder_sent_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index viewing_bookings_listing_idx on viewing_bookings(listing_id);
create index viewing_bookings_slot_idx    on viewing_bookings(slot_start);
create trigger viewing_bookings_updated_at before update on viewing_bookings
  for each row execute function set_updated_at();

alter table viewing_availability enable row level security;
alter table viewing_bookings     enable row level security;

create policy "staff full availability" on viewing_availability for all using (is_staff()) with check (is_staff());
create policy "staff full bookings"     on viewing_bookings     for all using (is_staff()) with check (is_staff());
-- Deliberately no anon policy on either table. The public flow only ever
-- goes through the two RPCs below.

-- Returns open slot windows for a listing between two dates — start/end
-- timestamps only, no booking rows, no PII. Safe for anonymous callers.
-- Treats the whole business as single-timezone (Asia/Manila); no
-- multi-timezone handling needed for a single-market brokerage.
create or replace function get_available_slots(p_listing_id uuid, p_from date, p_to date)
returns table(slot_start timestamptz, slot_end timestamptz)
language sql security definer set search_path = public as $$
  with days as (
    select generate_series(p_from, p_to, interval '1 day')::date as d
  ),
  slots as (
    select
      (gs.slot_local at time zone 'Asia/Manila') as slot_start,
      ((gs.slot_local + (va.slot_minutes || ' minutes')::interval) at time zone 'Asia/Manila') as slot_end
    from days
    join viewing_availability va
      on va.is_active
     and (va.listing_id = p_listing_id or va.listing_id is null)
     and va.day_of_week = extract(dow from days.d)::int
    cross join lateral generate_series(
      (days.d + va.start_time),
      (days.d + va.end_time) - (va.slot_minutes || ' minutes')::interval,
      (va.slot_minutes || ' minutes')::interval
    ) as gs(slot_local)
  )
  select distinct s.slot_start, s.slot_end
  from slots s
  where s.slot_start > now()
    and not exists (
      select 1 from viewing_bookings vb
      where vb.listing_id = p_listing_id
        and vb.status <> 'Cancelled'
        and vb.slot_start < s.slot_end
        and vb.slot_end > s.slot_start
    )
  order by s.slot_start;
$$;

-- Books a slot, re-validating availability inside the same transaction to
-- close the double-booking race a plain RLS insert policy can't prevent
-- atomically. Also notifies every staff user in-app (email confirmation to
-- the visitor is sent from the app layer, not from SQL).
create or replace function create_viewing_booking(
  p_listing_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_slot_start timestamptz,
  p_slot_end timestamptz
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_conflict boolean;
begin
  select exists (
    select 1 from viewing_bookings
    where listing_id = p_listing_id
      and status <> 'Cancelled'
      and slot_start < p_slot_end
      and slot_end > p_slot_start
  ) into v_conflict;

  if v_conflict then
    raise exception 'That slot is no longer available. Please choose another.';
  end if;

  insert into viewing_bookings (listing_id, name, email, phone, slot_start, slot_end)
  values (p_listing_id, p_name, p_email, p_phone, p_slot_start, p_slot_end)
  returning id into v_id;

  insert into notifications (recipient_user_id, type, title, body, link, entity_type, entity_id)
  select u.id, 'viewing_booking',
         'New viewing request',
         p_name || ' requested a viewing on ' ||
           to_char(p_slot_start at time zone 'Asia/Manila', 'Mon DD, YYYY at HH12:MI AM'),
         '/admin/viewings/' || v_id,
         'viewing_booking', v_id
  from users u;

  return v_id;
end;
$$;
