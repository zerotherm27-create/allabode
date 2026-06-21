-- All Abode Property Solutions — initial schema
-- Tables per the build brief: users, listings, listing_images, inquiries,
-- appraisal_requests, property_management_leads.
--
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor.
-- RLS is enabled on every table: the public/anon key may only INSERT leads and
-- SELECT published listings; everything else is reserved for authenticated staff.

create extension if not exists "pgcrypto";

-- ---------- enums ----------
create type user_role            as enum ('admin', 'staff');
create type listing_category     as enum ('For Sale', 'For Lease');
create type lease_type           as enum ('Short-term', 'Long-term', 'Bed space');
create type property_type        as enum (
  'Condo', 'House and Lot', 'Apartment', 'Townhouse', 'Dorm / Bed Space',
  'Commercial', 'Office', 'Lot', 'Warehouse', 'Other'
);
create type listing_status       as enum (
  'Draft', 'Published', 'Available', 'Reserved', 'Leased', 'Sold', 'Archived'
);
create type inquiry_type         as enum (
  'inquiry', 'viewing', 'contact', 'list-property'
);
create type inquiry_status       as enum (
  'New', 'Contacted', 'Scheduled', 'In progress', 'Closed', 'Spam'
);
create type appraisal_status     as enum (
  'New', 'Reviewing', 'Scheduled', 'Inspected', 'Report in progress',
  'Completed', 'Closed'
);
create type pm_lead_status       as enum (
  'New', 'Contacted', 'Proposal sent', 'Onboarding', 'Active', 'Closed'
);

-- ---------- updated_at trigger ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- users (staff/admin; linked to auth.users) ----------
create table users (
  id            uuid primary key references auth.users (id) on delete cascade,
  name          text not null,
  email         text not null unique,
  role          user_role not null default 'staff',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger users_updated_at before update on users
  for each row execute function set_updated_at();

-- Helper: is the current user a staff/admin member?
create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from users where id = auth.uid());
$$;

-- ---------- listings ----------
create table listings (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  slug              text not null unique,
  description       text,
  location          text,
  city              text,
  province          text,
  private_address   text,                       -- admin-only
  price             numeric(14,2),
  price_label       text,                       -- e.g. "per month", "total contract price"
  listing_category  listing_category not null default 'For Sale',
  lease_type        lease_type,
  property_type     property_type not null default 'Condo',
  status            listing_status not null default 'Draft',
  bedrooms          int,
  bathrooms         int,
  floor_area        numeric(10,2),
  lot_area          numeric(10,2),
  parking           int,
  furnishing        text,                       -- furnished / semi / unfurnished
  amenities         text[] not null default '{}',
  lease_terms       text,
  sale_terms        text,
  availability_date date,
  is_featured       boolean not null default false,
  owner_name        text,                       -- admin-only
  owner_contact     text,                       -- admin-only
  internal_notes    text,                       -- admin-only
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index listings_status_idx   on listings (status);
create index listings_featured_idx on listings (is_featured) where is_featured;
create trigger listings_updated_at before update on listings
  for each row execute function set_updated_at();

-- ---------- listing_images ----------
create table listing_images (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings (id) on delete cascade,
  url         text not null,
  alt_text    text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index listing_images_listing_idx on listing_images (listing_id, sort_order);

-- ---------- inquiries (listing inquiry / viewing / contact / list-property) ----------
create table inquiries (
  id                       uuid primary key default gen_random_uuid(),
  type                     inquiry_type not null default 'inquiry',
  listing_id               uuid references listings (id) on delete set null,
  name                     text not null,
  email                    text not null,
  phone                    text,
  message                  text,
  preferred_viewing_date   date,
  preferred_contact_method text,
  -- extra fields carried by the "List my property" intake
  details                  jsonb not null default '{}',
  status                   inquiry_status not null default 'New',
  internal_notes           text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index inquiries_status_idx  on inquiries (status);
create index inquiries_listing_idx on inquiries (listing_id);
create trigger inquiries_updated_at before update on inquiries
  for each row execute function set_updated_at();

-- ---------- appraisal_requests ----------
create table appraisal_requests (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  email                     text not null,
  phone                     text,
  property_location         text,
  property_type             text,
  appraisal_purpose         text,
  preferred_inspection_date date,
  message                   text,
  status                    appraisal_status not null default 'New',
  internal_notes            text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index appraisal_status_idx on appraisal_requests (status);
create trigger appraisal_updated_at before update on appraisal_requests
  for each row execute function set_updated_at();

-- ---------- property_management_leads ----------
create table property_management_leads (
  id                uuid primary key default gen_random_uuid(),
  owner_name        text not null,
  email             text not null,
  phone             text,
  property_location text,
  property_type     text,
  number_of_units   int,
  occupancy_status  text,
  needed_service    text,
  message           text,
  status            pm_lead_status not null default 'New',
  internal_notes    text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index pm_leads_status_idx on property_management_leads (status);
create trigger pm_leads_updated_at before update on property_management_leads
  for each row execute function set_updated_at();

-- ========================================================================
-- Row Level Security
-- ========================================================================
alter table users                     enable row level security;
alter table listings                  enable row level security;
alter table listing_images            enable row level security;
alter table inquiries                 enable row level security;
alter table appraisal_requests        enable row level security;
alter table property_management_leads enable row level security;

-- Public site: anyone may read LIVE listings (everything except Draft/Archived)
-- + their images. Draft and Archived stay private to staff.
create policy "public reads live listings"
  on listings for select using (status not in ('Draft', 'Archived'));
create policy "public reads images of live listings"
  on listing_images for select using (
    exists (select 1 from listings l
            where l.id = listing_images.listing_id
              and l.status not in ('Draft', 'Archived'))
  );

-- Public site: anyone (anon key) may submit a lead, but never read them back.
create policy "anyone submits inquiry"
  on inquiries for insert with check (true);
create policy "anyone submits appraisal"
  on appraisal_requests for insert with check (true);
create policy "anyone submits pm lead"
  on property_management_leads for insert with check (true);

-- Staff: full access to everything once authenticated.
create policy "staff read users"    on users for select using (is_staff());
create policy "staff manage listings"        on listings                  for all using (is_staff()) with check (is_staff());
create policy "staff manage images"          on listing_images            for all using (is_staff()) with check (is_staff());
create policy "staff manage inquiries"       on inquiries                 for all using (is_staff()) with check (is_staff());
create policy "staff manage appraisals"      on appraisal_requests        for all using (is_staff()) with check (is_staff());
create policy "staff manage pm leads"        on property_management_leads for all using (is_staff()) with check (is_staff());
