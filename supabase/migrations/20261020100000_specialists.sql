-- Property specialist accounts and specialist-owned listings (Phase 1).
--
-- A "specialist" is a property sales specialist accredited under the licensed
-- broker. Specialists are NEVER rows in `users`, so `is_staff()` can never be
-- true for them; they get their own table, helpers and RLS policies here.
--
--   * `specialists` — invite-only. Staff add each specialist by email (status
--     'approved', accredited under the broker, no auth link yet). The person
--     then signs up at /team/join with that same email; once it is confirmed,
--     `link_specialist_account()` links their auth user to the row. Nothing
--     else ever creates a row. Staff suspend/reinstate; a specialist may read
--     and edit their own profile but never their status, subdomain, email,
--     auth link or licence details (trigger `guard_specialist_update`).
--   * `listings.specialist_id` / `approval_status` / `rejection_note` — an
--     approved specialist manages their own listings; the public site only
--     shows listings that are live AND approved. Existing rows default to
--     'approved', so the public site is unchanged. Trigger
--     `guard_specialist_listing` stops a specialist from featuring, approving
--     or re-assigning a listing, whatever the client sends.
--   * `public_specialists` — the only public window onto specialists (no
--     email, phone or auth id).
--
-- Run in Supabase → SQL Editor. Idempotent where cheap; safe to re-run.
-- Storage policies for the `specialist-photos` bucket and specialist uploads
-- to `listing-images` live in supabase/setup-storage.sql (re-run it too).

-- ========================================================================
-- specialists
-- ========================================================================
create table if not exists specialists (
  id                   uuid primary key default gen_random_uuid(),
  auth_user_id         uuid unique references auth.users (id) on delete cascade,
  email                text not null,
  display_name         text not null,
  phone                text,
  status               text not null default 'pending'
                         check (status in ('pending', 'approved', 'rejected', 'suspended')),
  requested_subdomain  text,
  -- Same shape the app enforces (lib/team/subdomain.ts): 3–30 chars of
  -- a-z 0-9 '-', no leading/trailing hyphen. Reserved words are app-checked.
  subdomain            text unique
                         check (subdomain is null
                                or subdomain ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$'),
  tagline              text,
  bio                  text,
  areas                text[] not null default '{}',
  specialties          text[] not null default '{}',
  languages            text[] not null default '{}',
  years_experience     int check (years_experience is null or years_experience between 0 and 80),
  photo_path           text,
  license_mode         text not null default 'accredited'
                         check (license_mode in ('own', 'accredited')),
  license_no           text,
  license_expiry       date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists specialists_status_idx on specialists (status);
-- One row per email, case-insensitively: accounts are linked by email.
create unique index if not exists specialists_email_lower_key on specialists (lower(email));

-- The only portrait key the app writes is "{id}/portrait.jpg" (lib/team/profile.ts
-- portraitKey). Pinning it here stops a specialist pointing photo_path at
-- another specialist's portrait through the REST API.
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'specialists_photo_path_check'
                    and conrelid = 'public.specialists'::regclass) then
    alter table specialists add constraint specialists_photo_path_check
      check (photo_path is null or photo_path = id::text || '/portrait.jpg');
  end if;
end $$;

drop trigger if exists specialists_updated_at on specialists;
create trigger specialists_updated_at before update on specialists
  for each row execute function set_updated_at();

-- ---------- helpers ----------
-- The caller's specialist id — only while their account is APPROVED. Pending,
-- rejected and suspended specialists get null, which makes every
-- "specialist_id = current_specialist_id()" policy below evaluate false.
create or replace function current_specialist_id()
returns uuid language sql stable security definer set search_path = public, pg_temp as $$
  select id from specialists where auth_user_id = auth.uid() and status = 'approved';
$$;

create or replace function is_specialist()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from specialists where auth_user_id = auth.uid() and status = 'approved'
  );
$$;

-- ---------- guard: a specialist cannot grant themselves anything ----------
-- Staff (and server-side/definer contexts such as suspend_specialist(), which
-- run as the function owner rather than anon/authenticated) are exempt.
create or replace function guard_specialist_update()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if current_user not in ('anon', 'authenticated') or is_staff() then
    return new;
  end if;

  if new.id           is distinct from old.id
  or new.status       is distinct from old.status
  or new.subdomain    is distinct from old.subdomain
  or new.auth_user_id is distinct from old.auth_user_id
  or new.email        is distinct from old.email then
    raise exception 'Only staff can change a specialist''s status, subdomain, email or account link'
      using errcode = '42501';
  end if;

  -- The public licence line ("PRC License No." / "Accredited under …") is a
  -- compliance statement: once the application has left 'pending' (approved,
  -- rejected or suspended), only staff may change it — so staff never
  -- re-approve a licence line they did not review.
  if old.status <> 'pending'
     and (new.license_mode   is distinct from old.license_mode
       or new.license_no     is distinct from old.license_no
       or new.license_expiry is distinct from old.license_expiry) then
    raise exception 'Licence details can only be changed by All Abode.'
      using errcode = '42501';
  end if;

  new.created_at := old.created_at;
  return new;
end $$;

drop trigger if exists specialists_guard_update on specialists;
create trigger specialists_guard_update before update on specialists
  for each row execute function guard_specialist_update();

-- ---------- guard: staff and specialists are mutually exclusive ----------
-- A specialist must never become a `users` row (that would make is_staff()
-- true for them), and a staff account must never become a specialist. To
-- promote a specialist to staff, remove their specialists row first.
create or replace function guard_users_not_specialist()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists (select 1 from specialists where auth_user_id = new.id) then
    raise exception 'This account is a specialist and cannot be added as staff'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists users_guard_not_specialist on users;
create trigger users_guard_not_specialist before insert or update of id on users
  for each row execute function guard_users_not_specialist();

create or replace function guard_specialist_not_staff()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.auth_user_id is not null
     and exists (select 1 from users where id = new.auth_user_id) then
    raise exception 'This account is staff and cannot be a specialist'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists specialists_guard_not_staff on specialists;
create trigger specialists_guard_not_staff before insert or update of auth_user_id on specialists
  for each row execute function guard_specialist_not_staff();

-- ---------- link_specialist_account ----------
-- Called after sign-in. Links the CALLER's auth user to the specialist row
-- staff added for their email — only when that email is CONFIRMED, the row is
-- approved and not linked to anyone yet. Returns the row's status when it
-- links, otherwise null. Never creates a row, never re-links a linked row,
-- never links staff, and reads no user-editable sign-up metadata.
create or replace function link_specialist_account()
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid       uuid := auth.uid();
  v_email     text;
  v_confirmed timestamptz;
  v_status    text;
begin
  if v_uid is null then return null; end if;

  -- Staff accounts are never specialists.
  if exists (select 1 from users where id = v_uid) then return null; end if;

  select u.email, u.email_confirmed_at
    into v_email, v_confirmed
    from auth.users u where u.id = v_uid;
  if v_email is null or v_confirmed is null then return null; end if;

  -- Already linked to a row (this one or another): nothing to do.
  if exists (select 1 from specialists where auth_user_id = v_uid) then return null; end if;

  update specialists
     set auth_user_id = v_uid
   where lower(email) = lower(v_email)
     and auth_user_id is null
     and status = 'approved'
  returning status into v_status;

  return v_status;
end $$;

revoke execute on function link_specialist_account() from public, anon;
grant  execute on function link_specialist_account() to authenticated;

-- ========================================================================
-- listings: specialist ownership + approval
-- ========================================================================
alter table listings
  add column if not exists specialist_id uuid references specialists (id) on delete set null;
alter table listings
  add column if not exists approval_status text not null default 'approved'
    check (approval_status in ('draft', 'submitted', 'approved', 'rejected'));
alter table listings
  add column if not exists rejection_note text;

create index if not exists listings_specialist_idx      on listings (specialist_id);
create index if not exists listings_approval_status_idx on listings (approval_status);

-- For anyone who is not staff (i.e. a specialist via the session client):
--   insert → always the caller's own, unfeatured draft with a server-chosen
--            id (and never linked to a property-management unit);
--   update → ownership, featuring, staff's rejection note and the PM unit link
--            are kept as they were; approval may only go draft|rejected →
--            submitted (anything else raises).
-- Staff and definer contexts (suspend_specialist) are exempt.
create or replace function guard_specialist_listing()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  v_sid uuid;
begin
  if current_user not in ('anon', 'authenticated') or is_staff() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_sid := current_specialist_id();
    if v_sid is null then
      raise exception 'Only approved specialists can create listings'
        using errcode = '42501';
    end if;
    -- Never a caller-chosen id (it is also the listing-images storage folder).
    new.id              := gen_random_uuid();
    new.specialist_id   := v_sid;
    new.approval_status := 'draft';
    new.is_featured     := false;
    new.rejection_note  := null;
    new.unit_id         := null;
    return new;
  end if;

  -- UPDATE
  new.id             := old.id;
  new.specialist_id  := old.specialist_id;
  new.is_featured    := old.is_featured;
  new.rejection_note := old.rejection_note;
  new.unit_id        := old.unit_id;
  new.created_at     := old.created_at;

  if new.approval_status is distinct from old.approval_status
     and not (old.approval_status in ('draft', 'rejected')
              and new.approval_status = 'submitted') then
    raise exception 'A listing can only be submitted for approval from draft or rejected'
      using errcode = '42501';
  end if;

  return new;
end $$;

drop trigger if exists listings_guard_specialist on listings;
create trigger listings_guard_specialist before insert or update on listings
  for each row execute function guard_specialist_listing();

-- ---------- suspend_specialist ----------
-- Staff only. The specialist loses access (current_specialist_id() → null),
-- their profile drops out of public_specialists, and their listings become
-- house listings (specialist_id cleared). Approved ones stay live as they
-- are; unapproved ones (draft/submitted/rejected) become hidden house Drafts
-- marked 'approved', so staff can publish them through the normal admin form
-- instead of being stranded in a specialist approval state nobody owns.
-- The subdomain is kept so it cannot be re-claimed.
create or replace function suspend_specialist(p_specialist uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_staff() then
    raise exception 'Staff access required' using errcode = '42501';
  end if;

  update specialists set status = 'suspended' where id = p_specialist;
  if not found then
    raise exception 'Specialist not found' using errcode = 'P0002';
  end if;

  update listings
     set specialist_id   = null,
         status          = case when approval_status = 'approved' then status else 'Draft' end,
         approval_status = 'approved'
   where specialist_id = p_specialist;
end $$;

revoke execute on function suspend_specialist(uuid) from public, anon;
grant  execute on function suspend_specialist(uuid) to authenticated;

-- ---------- deleting a specialist row (staff delete, or auth user deleted) ----------
-- The listings FK would only null specialist_id, stranding unapproved listings.
-- Before the row goes, give its listings the same house-listing treatment as
-- suspend_specialist(). SECURITY DEFINER so it also works when the delete
-- arrives as an FK cascade from auth.users (run by the auth service).
create or replace function release_specialist_listings()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update listings
     set specialist_id   = null,
         status          = case when approval_status = 'approved' then status else 'Draft' end,
         approval_status = 'approved'
   where specialist_id = old.id;
  return old;
end $$;

revoke execute on function release_specialist_listings() from public, anon, authenticated;

drop trigger if exists specialists_release_listings on specialists;
create trigger specialists_release_listings before delete on specialists
  for each row execute function release_specialist_listings();

-- ========================================================================
-- Row Level Security
-- ========================================================================
alter table specialists enable row level security;

-- Anon has no business with the table at all (the public reads the view).
revoke all on specialists from anon;

drop policy if exists "staff manage specialists"   on specialists;
drop policy if exists "specialist reads self"      on specialists;
drop policy if exists "specialist updates self"    on specialists;

create policy "staff manage specialists" on specialists
  for all using (is_staff()) with check (is_staff());
-- Own row regardless of status, so a pending/rejected applicant can see where
-- their application stands. Privileged columns are locked by the trigger.
create policy "specialist reads self" on specialists
  for select to authenticated using (auth_user_id = (select auth.uid()));
create policy "specialist updates self" on specialists
  for update to authenticated
  using      (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

-- ---------- listings: public read now also requires approval ----------
drop policy if exists "public reads live listings" on listings;
create policy "public reads live listings"
  on listings for select using (
    status not in ('Draft', 'Archived') and approval_status = 'approved'
  );

drop policy if exists "public reads images of live listings" on listing_images;
create policy "public reads images of live listings"
  on listing_images for select using (
    exists (select 1 from listings l
            where l.id = listing_images.listing_id
              and l.status not in ('Draft', 'Archived')
              and l.approval_status = 'approved')
  );

-- ---------- listings: an approved specialist manages their own ----------
drop policy if exists "specialist reads own listings"   on listings;
drop policy if exists "specialist inserts own listings" on listings;
drop policy if exists "specialist updates own listings" on listings;
drop policy if exists "specialist deletes own listings" on listings;

create policy "specialist reads own listings" on listings
  for select to authenticated
  using (specialist_id = (select current_specialist_id()));
create policy "specialist inserts own listings" on listings
  for insert to authenticated
  with check (specialist_id = (select current_specialist_id()));
create policy "specialist updates own listings" on listings
  for update to authenticated
  using      (specialist_id = (select current_specialist_id()))
  with check (specialist_id = (select current_specialist_id()));
-- Never an APPROVED (live) listing: deleting cascades to staff-owned data
-- (viewing_bookings ON DELETE CASCADE, inquiries SET NULL) and FK actions
-- bypass RLS. Specialists take a live listing down by setting status
-- 'Archived' instead; staff can still delete anything.
create policy "specialist deletes own listings" on listings
  for delete to authenticated
  using (specialist_id = (select current_specialist_id())
         and approval_status <> 'approved');

-- ---------- listing_images: via the parent listing's specialist ----------
drop policy if exists "specialist reads own listing images"   on listing_images;
drop policy if exists "specialist inserts own listing images" on listing_images;
drop policy if exists "specialist updates own listing images" on listing_images;
drop policy if exists "specialist deletes own listing images" on listing_images;

create policy "specialist reads own listing images" on listing_images
  for select to authenticated using (
    exists (select 1 from listings l
            where l.id = listing_images.listing_id
              and l.specialist_id = (select current_specialist_id()))
  );
create policy "specialist inserts own listing images" on listing_images
  for insert to authenticated with check (
    exists (select 1 from listings l
            where l.id = listing_images.listing_id
              and l.specialist_id = (select current_specialist_id()))
  );
create policy "specialist updates own listing images" on listing_images
  for update to authenticated
  using (
    exists (select 1 from listings l
            where l.id = listing_images.listing_id
              and l.specialist_id = (select current_specialist_id()))
  )
  with check (
    exists (select 1 from listings l
            where l.id = listing_images.listing_id
              and l.specialist_id = (select current_specialist_id()))
  );
create policy "specialist deletes own listing images" on listing_images
  for delete to authenticated using (
    exists (select 1 from listings l
            where l.id = listing_images.listing_id
              and l.specialist_id = (select current_specialist_id()))
  );

-- ========================================================================
-- public_specialists view
-- ========================================================================
-- Owner-run (security_invoker = false), so it reads `specialists` past RLS —
-- which is why it exposes an explicit, PII-free column list and only
-- approved specialists that have been given a subdomain.
create or replace view public_specialists
  with (security_invoker = false) as
  select
    id,
    subdomain as slug,
    display_name,
    tagline,
    bio,
    areas,
    specialties,
    languages,
    years_experience,
    photo_path,
    license_mode,
    license_no
  from specialists
  where status = 'approved' and subdomain is not null;

-- A simple view is auto-updatable, and an owner-run one would write to
-- `specialists` past RLS. Supabase's default privileges grant ALL on new
-- relations to anon/authenticated, so strip everything and grant SELECT only.
revoke all on public_specialists from public, anon, authenticated;
grant select on public_specialists to anon, authenticated;

-- ========================================================================
-- Broker settings (licence line: "Accredited under <broker>, PRC Lic. No. …")
-- ========================================================================
insert into site_settings (key, value, label, group_name, type, sort_order) values
  ('broker_name',        'Aremchel M. Cruzado', 'Broker name',               'broker', 'text', 1),
  ('broker_prc_license', '',                    'Broker PRC license number', 'broker', 'text', 2),
  ('broker_prc_expiry',  '',                    'Broker PRC license expiry', 'broker', 'text', 3)
on conflict (key) do nothing;
