-- All Abode — Invoices & Billing
-- Phase 1 of the full platform blueprint.
-- Run in Supabase SQL Editor after 0001, 0002, 0003.

-- ========================================================================
-- Enum
-- ========================================================================
create type invoice_status as enum (
  'draft', 'issued', 'partially_paid', 'paid', 'overdue', 'voided'
);

-- ========================================================================
-- Sequence + number helper
-- ========================================================================
create sequence if not exists invoice_seq start 1;

create or replace function generate_invoice_number()
returns text language sql security definer set search_path = public as $$
  select 'INV-' || to_char(now() at time zone 'Asia/Manila', 'YYYY') ||
         '-' || lpad(nextval('invoice_seq')::text, 6, '0');
$$;

-- ========================================================================
-- Tables
-- ========================================================================
create table invoices (
  id                   uuid primary key default gen_random_uuid(),
  invoice_number       text unique not null,
  lease_id             uuid not null references leases(id),
  tenant_id            uuid not null references tenants(id),
  unit_id              uuid not null references units(id),
  property_id          uuid not null references properties(id),
  owner_id             uuid references owners(id),
  billing_period_start date not null,
  billing_period_end   date not null,
  due_date             date not null,
  status               invoice_status not null default 'draft',
  subtotal             numeric(12,2) not null default 0,
  tax_amount           numeric(12,2) not null default 0,
  total_amount         numeric(12,2) not null default 0,
  amount_paid          numeric(12,2) not null default 0,
  notes                text,
  issued_at            timestamptz,
  voided_at            timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table invoice_lines (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity    numeric(10,2) not null default 1,
  unit_price  numeric(12,2) not null,
  amount      numeric(12,2) not null,
  sort_order  int not null default 0
);

create trigger set_invoices_updated_at
  before update on invoices
  for each row execute function set_updated_at();

create index on invoices (tenant_id);
create index on invoices (owner_id);
create index on invoices (status);
create index on invoices (due_date);

-- ========================================================================
-- RLS
-- ========================================================================
alter table invoices      enable row level security;
alter table invoice_lines enable row level security;

-- Staff: full access
create policy "staff full invoices"
  on invoices for all using (is_staff());

-- Tenant: read own invoices
create policy "tenant reads own invoices"
  on invoices for select
  using (tenant_id = current_tenant_id());

-- Owner: read invoices for their properties
create policy "owner reads property invoices"
  on invoices for select
  using (owner_id = current_owner_id());

-- Invoice lines follow invoice visibility
create policy "staff full invoice_lines"
  on invoice_lines for all using (is_staff());

create policy "tenant reads own invoice_lines"
  on invoice_lines for select
  using (invoice_id in (
    select id from invoices where tenant_id = current_tenant_id()
  ));

create policy "owner reads invoice_lines"
  on invoice_lines for select
  using (invoice_id in (
    select id from invoices where owner_id = current_owner_id()
  ));
