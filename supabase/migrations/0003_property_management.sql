-- All Abode — Property Management platform (Foundation + AI Finance)
-- Single-tenant (no org_id). Run in the Supabase SQL editor after 0001 + 0002.
-- Depends on: set_updated_at(), is_staff(), and the property_type enum from 0001.
--
-- Adds: operations (owners, tenants, properties, units, leases, payments),
-- finance (vendors, receipts + AI extraction + validation, expenses, ledger,
-- statements of account), and an audit log. RLS on every table: staff get full
-- access; owners/tenants get scoped read-only access to their own records.

-- ========================================================================
-- Enums
-- ========================================================================
create type property_status     as enum ('Active', 'Inactive', 'Sold', 'Archived');
create type unit_status         as enum ('Vacant', 'Occupied', 'Reserved', 'Maintenance');
create type lease_status        as enum (
  'draft', 'pending_signature', 'active', 'renewal_pending', 'renewed',
  'expiring', 'ended', 'terminated', 'archived'
);
create type billing_cycle       as enum ('monthly', 'quarterly', 'semi_annual', 'annual');
create type payment_method      as enum ('cash', 'bank_transfer', 'gcash', 'maya', 'check', 'other');
create type payment_status      as enum ('recorded', 'pending_review', 'verified', 'reversed');
create type charge_to           as enum ('owner', 'tenant', 'company', 'split');
create type risk_level          as enum ('low', 'medium', 'high', 'critical');
create type validation_severity as enum ('info', 'warning', 'error', 'critical');
create type receipt_status      as enum (
  'uploaded', 'scanning', 'scan_failed', 'extracted', 'validation_pending',
  'validation_failed', 'needs_review', 'duplicate_suspected',
  'awaiting_owner_approval', 'reviewed', 'approved_for_posting', 'posted',
  'included_in_statement', 'locked', 'rejected', 'voided'
);
create type receipt_scan_status as enum ('pending', 'scanning', 'scanned', 'scan_failed');
create type expense_status      as enum (
  'draft', 'ai_suggested', 'needs_review', 'pending_approval', 'approved',
  'posted', 'reversed', 'voided', 'locked'
);
create type soa_type            as enum ('tenant', 'owner');
create type soa_status          as enum (
  'draft', 'precheck_failed', 'generated', 'validation_failed', 'maker_review',
  'checker_review', 'approved', 'published', 'locked', 'revised', 'voided'
);

-- Staff sub-role for finance segregation of duties (admin acts as super-admin).
alter table users add column if not exists finance_role text
  check (finance_role in ('maker', 'checker'));

-- ========================================================================
-- Operations
-- ========================================================================
create table owners (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text not null unique,
  phone           text,
  address         text,
  bank_name       text,
  bank_account_name text,
  bank_account_no text,
  management_fee_percent numeric(5,2),
  notes           text,                                  -- admin-only
  auth_user_id    uuid unique references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger owners_updated_at before update on owners
  for each row execute function set_updated_at();

create table tenants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null unique,
  phone         text,
  notes         text,                                    -- admin-only
  auth_user_id  uuid unique references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger tenants_updated_at before update on tenants
  for each row execute function set_updated_at();

create table vendors (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  tin          text,
  address      text,
  is_approved  boolean not null default false,
  is_blocked   boolean not null default false,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger vendors_updated_at before update on vendors
  for each row execute function set_updated_at();

create table properties (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references owners (id) on delete restrict,
  name          text not null,
  address       text,
  city          text,
  province      text,
  property_type property_type not null default 'Condo',
  status        property_status not null default 'Active',
  management_start_date date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index properties_owner_idx on properties (owner_id);
create trigger properties_updated_at before update on properties
  for each row execute function set_updated_at();

create table units (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references properties (id) on delete cascade,
  unit_label   text not null,
  bedrooms     int,
  bathrooms    int,
  floor_area   numeric(10,2),
  base_rent    numeric(14,2),
  status       unit_status not null default 'Vacant',
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index units_property_idx on units (property_id);
create trigger units_updated_at before update on units
  for each row execute function set_updated_at();

create table leases (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid not null references units (id) on delete restrict,
  tenant_id     uuid not null references tenants (id) on delete restrict,
  start_date    date not null,
  end_date      date,
  rent_amount   numeric(14,2) not null,
  billing_cycle billing_cycle not null default 'monthly',
  deposit       numeric(14,2),
  advance       numeric(14,2),
  notice_period_days int,
  status        lease_status not null default 'draft',
  terms         text,
  contract_path text,                                    -- private storage key
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index leases_unit_idx   on leases (unit_id);
create index leases_tenant_idx on leases (tenant_id);
create trigger leases_updated_at before update on leases
  for each row execute function set_updated_at();

create table payments (
  id           uuid primary key default gen_random_uuid(),
  lease_id     uuid references leases (id) on delete set null,
  tenant_id    uuid references tenants (id) on delete set null,
  amount       numeric(14,2) not null,
  method       payment_method not null default 'bank_transfer',
  reference    text,
  proof_path   text,                                     -- private storage key
  status       payment_status not null default 'recorded',
  received_at  date not null default current_date,
  recorded_by  uuid references auth.users (id) on delete set null,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index payments_lease_idx  on payments (lease_id);
create index payments_tenant_idx on payments (tenant_id);
create trigger payments_updated_at before update on payments
  for each row execute function set_updated_at();

-- ========================================================================
-- Finance — receipts, AI extraction, validation
-- ========================================================================
create table receipt_uploads (
  id                  uuid primary key default gen_random_uuid(),
  uploaded_by         uuid references auth.users (id) on delete set null,
  file_path           text not null,                     -- private 'receipts' bucket key
  file_name           text,
  file_mime_type      text,
  file_size           bigint,
  file_hash_sha256    text,                              -- duplicate detection
  source              text,                              -- upload | email | api
  scan_status         receipt_scan_status not null default 'pending',
  status              receipt_status not null default 'uploaded',
  overall_confidence  numeric(4,3),                      -- 0..1 from AI
  risk_level          risk_level,
  risk_scores         jsonb not null default '{}',       -- per-dimension scores
  related_property_id uuid references properties (id) on delete set null,
  related_unit_id     uuid references units (id) on delete set null,
  related_owner_id    uuid references owners (id) on delete set null,
  related_vendor_id   uuid references vendors (id) on delete set null,
  related_lease_id    uuid references leases (id) on delete set null,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index receipt_uploads_status_idx on receipt_uploads (status);
create index receipt_uploads_hash_idx   on receipt_uploads (file_hash_sha256);
create trigger receipt_uploads_updated_at before update on receipt_uploads
  for each row execute function set_updated_at();

-- Raw AI output is stored SEPARATELY from any reviewed/approved record (spec §10.6/§10.12).
create table receipt_extractions (
  id                    uuid primary key default gen_random_uuid(),
  receipt_upload_id     uuid not null references receipt_uploads (id) on delete cascade,
  provider              text,                            -- openai | anthropic | ...
  model_name            text,
  prompt_version        text,
  raw_ocr_text          text,
  raw_ai_json           jsonb,                           -- untouched model output
  normalized_json       jsonb,                           -- normalized (PHP, Asia/Manila, etc.)
  extraction_confidence numeric(4,3),
  warnings              jsonb not null default '[]',
  created_at            timestamptz not null default now()
);
create index receipt_extractions_upload_idx on receipt_extractions (receipt_upload_id);

create table receipt_validation_results (
  id                   uuid primary key default gen_random_uuid(),
  receipt_upload_id    uuid not null references receipt_uploads (id) on delete cascade,
  validation_rule_code text not null,
  severity             validation_severity not null default 'info',
  passed               boolean not null,
  message              text,
  metadata_json        jsonb not null default '{}',
  created_at           timestamptz not null default now()
);
create index receipt_validation_upload_idx on receipt_validation_results (receipt_upload_id);

-- ========================================================================
-- Finance — expenses, allocations, ledger
-- ========================================================================
create table expenses (
  id                uuid primary key default gen_random_uuid(),
  property_id       uuid references properties (id) on delete set null,
  unit_id           uuid references units (id) on delete set null,
  owner_id          uuid references owners (id) on delete set null,
  tenant_id         uuid references tenants (id) on delete set null,
  vendor_id         uuid references vendors (id) on delete set null,
  lease_id          uuid references leases (id) on delete set null,
  receipt_upload_id uuid references receipt_uploads (id) on delete set null,
  expense_date      date not null,
  category          text not null,                       -- chart-of-accounts code
  description       text,
  amount            numeric(14,2) not null default 0,
  vat_amount        numeric(14,2) not null default 0,
  total_amount      numeric(14,2) not null default 0,
  currency          text not null default 'PHP',
  charge_to         charge_to not null default 'company',
  status            expense_status not null default 'draft',
  approval_required boolean not null default false,
  approved_by       uuid references auth.users (id) on delete set null,
  approved_at       timestamptz,
  posted_by         uuid references auth.users (id) on delete set null,
  posted_at         timestamptz,
  locked_at         timestamptz,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index expenses_owner_idx    on expenses (owner_id);
create index expenses_property_idx on expenses (property_id);
create index expenses_status_idx   on expenses (status);
create trigger expenses_updated_at before update on expenses
  for each row execute function set_updated_at();

create table expense_allocations (
  id              uuid primary key default gen_random_uuid(),
  expense_id      uuid not null references expenses (id) on delete cascade,
  allocation_type text,                                  -- owner | tenant | company | split
  property_id     uuid references properties (id) on delete set null,
  unit_id         uuid references units (id) on delete set null,
  owner_id        uuid references owners (id) on delete set null,
  tenant_id       uuid references tenants (id) on delete set null,
  percentage      numeric(5,2),
  amount          numeric(14,2),
  notes           text,
  created_at      timestamptz not null default now()
);
create index expense_allocations_expense_idx on expense_allocations (expense_id);

-- Append-only ledger; SOA totals are recomputed deterministically from here.
create table ledger_entries (
  id           uuid primary key default gen_random_uuid(),
  source_type  text not null,                            -- expense | payment | invoice | adjustment
  source_id    uuid,
  account_code text not null,
  debit        numeric(14,2) not null default 0,
  credit       numeric(14,2) not null default 0,
  currency     text not null default 'PHP',
  entry_date   date not null default current_date,
  property_id  uuid references properties (id) on delete set null,
  unit_id      uuid references units (id) on delete set null,
  owner_id     uuid references owners (id) on delete set null,
  tenant_id    uuid references tenants (id) on delete set null,
  memo         text,
  locked       boolean not null default false,
  created_at   timestamptz not null default now()
);
create index ledger_owner_idx  on ledger_entries (owner_id);
create index ledger_tenant_idx on ledger_entries (tenant_id);
create index ledger_source_idx on ledger_entries (source_type, source_id);

-- ========================================================================
-- Finance — statements of account
-- ========================================================================
create table soa_batches (
  id                    uuid primary key default gen_random_uuid(),
  statement_type        soa_type not null,
  period_start          date not null,
  period_end            date not null,
  generated_by          uuid references auth.users (id) on delete set null,
  status                soa_status not null default 'draft',
  precheck_report_json  jsonb not null default '{}',
  validation_report_json jsonb not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger soa_batches_updated_at before update on soa_batches
  for each row execute function set_updated_at();

create table statements_of_account (
  id                uuid primary key default gen_random_uuid(),
  soa_batch_id      uuid references soa_batches (id) on delete set null,
  statement_type    soa_type not null,
  owner_id          uuid references owners (id) on delete set null,
  tenant_id         uuid references tenants (id) on delete set null,
  property_id       uuid references properties (id) on delete set null,
  unit_id           uuid references units (id) on delete set null,
  period_start      date not null,
  period_end        date not null,
  opening_balance   numeric(14,2) not null default 0,
  total_charges     numeric(14,2) not null default 0,
  total_payments    numeric(14,2) not null default 0,
  total_expenses    numeric(14,2) not null default 0,
  total_adjustments numeric(14,2) not null default 0,
  closing_balance   numeric(14,2) not null default 0,
  net_remittance    numeric(14,2) not null default 0,
  status            soa_status not null default 'draft',
  pdf_path          text,                                -- private 'finance-docs' bucket key
  ai_summary        text,
  created_by        uuid references auth.users (id) on delete set null,
  approved_by       uuid references auth.users (id) on delete set null,
  approved_at       timestamptz,
  published_at      timestamptz,
  locked_at         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index soa_owner_idx  on statements_of_account (owner_id);
create index soa_tenant_idx on statements_of_account (tenant_id);
create index soa_status_idx on statements_of_account (status);
create trigger soa_updated_at before update on statements_of_account
  for each row execute function set_updated_at();

create table soa_lines (
  id           uuid primary key default gen_random_uuid(),
  statement_id uuid not null references statements_of_account (id) on delete cascade,
  line_type    text not null,                            -- charge | payment | expense | adjustment | credit
  source_type  text,
  source_id    uuid,
  description  text,
  amount       numeric(14,2) not null default 0,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index soa_lines_statement_idx on soa_lines (statement_id, sort_order);

create table finance_approval_steps (
  id               uuid primary key default gen_random_uuid(),
  entity_type      text not null,                        -- expense | soa
  entity_id        uuid not null,
  step_name        text not null,                        -- maker_review | checker_review | owner_approval
  assigned_role    text,
  assigned_user_id uuid references auth.users (id) on delete set null,
  status           text not null default 'pending',      -- pending | approved | rejected | returned
  decision         text,
  reason           text,
  decided_by       uuid references auth.users (id) on delete set null,
  decided_at       timestamptz,
  created_at       timestamptz not null default now()
);
create index finance_approval_entity_idx on finance_approval_steps (entity_type, entity_id);

-- ========================================================================
-- Audit log
-- ========================================================================
create table audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  action        text not null,
  entity_type   text,
  entity_id     uuid,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);
create index audit_log_entity_idx on audit_log (entity_type, entity_id);
create index audit_log_created_idx on audit_log (created_at desc);

-- ========================================================================
-- RLS helpers — map the signed-in auth user to an owner / tenant record
-- ========================================================================
create or replace function current_owner_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from owners where auth_user_id = auth.uid();
$$;

create or replace function current_tenant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from tenants where auth_user_id = auth.uid();
$$;

-- Self-signup link: a signed-in portal user claims the owner/tenant record that
-- matches their verified auth email. Runs as definer (RLS would otherwise block
-- the update), but only ever links the CALLER's own account — no service_role key.
create or replace function link_portal_account()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then return null; end if;
  if exists (select 1 from users   where id = v_uid)           then return 'staff';  end if;
  if exists (select 1 from owners  where auth_user_id = v_uid) then return 'owner';  end if;
  if exists (select 1 from tenants where auth_user_id = v_uid) then return 'tenant'; end if;

  select email into v_email from auth.users where id = v_uid;
  if v_email is null then return null; end if;

  update owners set auth_user_id = v_uid
    where lower(email) = lower(v_email) and auth_user_id is null;
  if found then return 'owner'; end if;

  update tenants set auth_user_id = v_uid
    where lower(email) = lower(v_email) and auth_user_id is null;
  if found then return 'tenant'; end if;

  return null;  -- no matching record yet → "pending" in the UI
end $$;

-- ========================================================================
-- Row Level Security
-- ========================================================================
alter table owners                     enable row level security;
alter table tenants                    enable row level security;
alter table vendors                    enable row level security;
alter table properties                 enable row level security;
alter table units                      enable row level security;
alter table leases                     enable row level security;
alter table payments                   enable row level security;
alter table receipt_uploads            enable row level security;
alter table receipt_extractions        enable row level security;
alter table receipt_validation_results enable row level security;
alter table expenses                   enable row level security;
alter table expense_allocations        enable row level security;
alter table ledger_entries             enable row level security;
alter table soa_batches                enable row level security;
alter table statements_of_account      enable row level security;
alter table soa_lines                  enable row level security;
alter table finance_approval_steps     enable row level security;
alter table audit_log                  enable row level security;

-- Staff: full access to everything (mirrors the 0001 pattern).
create policy "staff all owners"      on owners                     for all using (is_staff()) with check (is_staff());
create policy "staff all tenants"     on tenants                    for all using (is_staff()) with check (is_staff());
create policy "staff all vendors"     on vendors                    for all using (is_staff()) with check (is_staff());
create policy "staff all properties"  on properties                 for all using (is_staff()) with check (is_staff());
create policy "staff all units"       on units                      for all using (is_staff()) with check (is_staff());
create policy "staff all leases"      on leases                     for all using (is_staff()) with check (is_staff());
create policy "staff all payments"    on payments                   for all using (is_staff()) with check (is_staff());
create policy "staff all receipts"    on receipt_uploads            for all using (is_staff()) with check (is_staff());
create policy "staff all extractions" on receipt_extractions        for all using (is_staff()) with check (is_staff());
create policy "staff all validations" on receipt_validation_results for all using (is_staff()) with check (is_staff());
create policy "staff all expenses"    on expenses                   for all using (is_staff()) with check (is_staff());
create policy "staff all allocations" on expense_allocations        for all using (is_staff()) with check (is_staff());
create policy "staff all ledger"      on ledger_entries             for all using (is_staff()) with check (is_staff());
create policy "staff all soa_batches" on soa_batches                for all using (is_staff()) with check (is_staff());
create policy "staff all soa"         on statements_of_account      for all using (is_staff()) with check (is_staff());
create policy "staff all soa_lines"   on soa_lines                  for all using (is_staff()) with check (is_staff());
create policy "staff all approvals"   on finance_approval_steps     for all using (is_staff()) with check (is_staff());
create policy "staff all audit"       on audit_log                  for all using (is_staff()) with check (is_staff());

-- Owners: read-only access scoped to their own records.
create policy "owner reads self" on owners for select
  using (id = current_owner_id());
create policy "owner reads properties" on properties for select
  using (owner_id = current_owner_id());
create policy "owner reads units" on units for select
  using (property_id in (select id from properties where owner_id = current_owner_id()));
create policy "owner reads leases" on leases for select
  using (unit_id in (
    select u.id from units u join properties p on p.id = u.property_id
    where p.owner_id = current_owner_id()));
create policy "owner reads expenses" on expenses for select
  using (owner_id = current_owner_id());
create policy "owner reads published soa" on statements_of_account for select
  using (owner_id = current_owner_id() and status = 'published');
create policy "owner reads published soa_lines" on soa_lines for select
  using (statement_id in (
    select id from statements_of_account
    where owner_id = current_owner_id() and status = 'published'));

-- Tenants: read-only access scoped to their own records.
create policy "tenant reads self" on tenants for select
  using (id = current_tenant_id());
create policy "tenant reads leases" on leases for select
  using (tenant_id = current_tenant_id());
create policy "tenant reads own unit" on units for select
  using (id in (select unit_id from leases where tenant_id = current_tenant_id()));
create policy "tenant reads payments" on payments for select
  using (tenant_id = current_tenant_id());
create policy "tenant reads published soa" on statements_of_account for select
  using (tenant_id = current_tenant_id() and status = 'published');
create policy "tenant reads published soa_lines" on soa_lines for select
  using (statement_id in (
    select id from statements_of_account
    where tenant_id = current_tenant_id() and status = 'published'));

-- ========================================================================
-- Seed — one demo owner / tenant / property / unit / lease / vendor.
-- Emails match the accounts you create via Supabase Auth to test the portals.
-- ========================================================================
do $$
declare
  v_owner    uuid;
  v_tenant   uuid;
  v_property uuid;
  v_unit     uuid;
begin
  insert into owners (name, email, phone, management_fee_percent)
    values ('Demo Owner', 'owner@allabode.test', '+63 917 000 0001', 8.00)
    returning id into v_owner;

  insert into tenants (name, email, phone)
    values ('Demo Tenant', 'tenant@allabode.test', '+63 917 000 0002')
    returning id into v_tenant;

  insert into properties (owner_id, name, address, city, province, property_type, status, management_start_date)
    values (v_owner, 'The Astoria Residences', '11th Ave', 'Taguig', 'Metro Manila', 'Condo', 'Active', '2026-01-01')
    returning id into v_property;

  insert into units (property_id, unit_label, bedrooms, bathrooms, floor_area, base_rent, status)
    values (v_property, 'Unit 4B', 2, 2, 65.00, 45000.00, 'Occupied')
    returning id into v_unit;

  insert into leases (unit_id, tenant_id, start_date, end_date, rent_amount, billing_cycle, deposit, advance, status)
    values (v_unit, v_tenant, '2026-01-01', '2026-12-31', 45000.00, 'monthly', 90000.00, 45000.00, 'active');

  insert into vendors (name, is_approved) values ('Cool Air Servicing', true);
end $$;
