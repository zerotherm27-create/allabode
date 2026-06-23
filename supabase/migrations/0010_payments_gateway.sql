-- Phase 7: Payment Gateway
-- Run this in the Supabase SQL Editor after 0009_automation.sql

create table payment_intents (
  id                   uuid primary key default gen_random_uuid(),
  provider             text not null,             -- 'maya' | 'xendit'
  provider_reference   text unique,               -- provider's checkout/payment ID
  invoice_id           uuid references invoices(id),
  lease_id             uuid not null references leases(id),
  tenant_id            uuid not null references tenants(id),
  amount               numeric(12,2) not null,
  currency             text not null default 'PHP',
  status               text not null default 'pending',
  -- 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded'
  checkout_url         text,
  return_url           text,
  webhook_received_at  timestamptz,
  raw_webhook_json     jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger set_payment_intents_updated_at before update on payment_intents
  for each row execute function set_updated_at();

create index on payment_intents (tenant_id, status);
create index on payment_intents (invoice_id);
create index on payment_intents (provider_reference);

alter table payment_intents enable row level security;
create policy "staff full payment_intents" on payment_intents for all using (is_staff());
create policy "tenant reads own payment_intents" on payment_intents for select
  using (tenant_id = current_tenant_id());
create policy "tenant inserts payment_intents" on payment_intents for insert
  with check (tenant_id = current_tenant_id());
