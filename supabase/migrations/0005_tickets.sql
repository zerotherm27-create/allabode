-- Phase 2: Ticketing System
-- Run this in the Supabase SQL Editor after 0004_invoices.sql

-- Enums
create type ticket_priority as enum ('critical', 'high', 'normal', 'low');
create type ticket_status as enum (
  'new', 'triaged', 'assigned', 'in_progress',
  'waiting_on_tenant', 'waiting_on_owner', 'waiting_on_vendor',
  'resolved', 'closed', 'cancelled', 'duplicate', 'escalated', 'reopened'
);
create type ticket_category as enum (
  'maintenance', 'billing_inquiry', 'lease_inquiry', 'access_keys',
  'safety_security', 'housekeeping', 'inspection', 'general_admin', 'owner_request'
);

-- Number sequence
create sequence if not exists ticket_seq start 1;

create or replace function generate_ticket_number()
returns text language sql security definer set search_path = public as $$
  select 'TKT-' || to_char(now() at time zone 'Asia/Manila', 'YYYY') ||
         '-' || lpad(nextval('ticket_seq')::text, 6, '0');
$$;

-- Tickets
create table tickets (
  id                  uuid primary key default gen_random_uuid(),
  ticket_number       text unique not null,
  property_id         uuid not null references properties(id),
  unit_id             uuid references units(id),
  lease_id            uuid references leases(id),
  tenant_id           uuid references tenants(id),
  owner_id            uuid references owners(id),
  reported_by_staff   uuid references users(id),
  category            ticket_category not null,
  subcategory         text,
  priority            ticket_priority not null default 'normal',
  subject             text not null,
  description         text not null,
  status              ticket_status not null default 'new',
  assigned_to         uuid references users(id),
  vendor_id           uuid references vendors(id),
  sla_due_at          timestamptz,
  first_response_at   timestamptz,
  resolved_at         timestamptz,
  closed_at           timestamptz,
  resolution_notes    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger set_tickets_updated_at before update on tickets
  for each row execute function set_updated_at();

-- Ticket comments (internal notes hidden from owner/tenant)
create table ticket_comments (
  id             uuid primary key default gen_random_uuid(),
  ticket_id      uuid not null references tickets(id) on delete cascade,
  author_user_id uuid,
  author_name    text not null,
  author_role    text not null,   -- 'staff' | 'owner' | 'tenant'
  body           text not null,
  is_internal    boolean not null default false,
  created_at     timestamptz not null default now()
);

-- Ticket attachments
create table ticket_attachments (
  id             uuid primary key default gen_random_uuid(),
  ticket_id      uuid not null references tickets(id) on delete cascade,
  uploaded_by    uuid,
  file_path      text not null,
  file_name      text not null,
  file_mime_type text,
  file_size      bigint,
  created_at     timestamptz not null default now()
);

-- Indexes
create index on tickets (property_id);
create index on tickets (tenant_id);
create index on tickets (owner_id);
create index on tickets (status);
create index on tickets (priority);
create index on tickets (sla_due_at);
create index on ticket_comments (ticket_id);
create index on ticket_attachments (ticket_id);

-- RLS: tickets
alter table tickets enable row level security;
create policy "staff full tickets"           on tickets for all  using (is_staff());
create policy "tenant reads own tickets"     on tickets for select
  using (tenant_id = current_tenant_id());
create policy "tenant inserts tickets"       on tickets for insert
  with check (tenant_id = current_tenant_id());
create policy "owner reads property tickets" on tickets for select
  using (property_id in (select id from properties where owner_id = current_owner_id()));

-- RLS: ticket_comments
alter table ticket_comments enable row level security;
create policy "staff full comments" on ticket_comments for all using (is_staff());
create policy "tenant reads non-internal comments" on ticket_comments for select
  using (
    is_internal = false and
    ticket_id in (select id from tickets where tenant_id = current_tenant_id())
  );
create policy "tenant inserts comments" on ticket_comments for insert
  with check (
    is_internal = false and
    ticket_id in (select id from tickets where tenant_id = current_tenant_id())
  );
create policy "owner reads non-internal comments" on ticket_comments for select
  using (
    is_internal = false and
    ticket_id in (
      select t.id from tickets t
      join properties p on p.id = t.property_id
      where p.owner_id = current_owner_id()
    )
  );

-- RLS: ticket_attachments
alter table ticket_attachments enable row level security;
create policy "staff full attachments" on ticket_attachments for all using (is_staff());
create policy "tenant reads own ticket attachments" on ticket_attachments for select
  using (ticket_id in (select id from tickets where tenant_id = current_tenant_id()));
create policy "tenant inserts attachments" on ticket_attachments for insert
  with check (ticket_id in (select id from tickets where tenant_id = current_tenant_id()));
create policy "owner reads property ticket attachments" on ticket_attachments for select
  using (
    ticket_id in (
      select t.id from tickets t
      join properties p on p.id = t.property_id
      where p.owner_id = current_owner_id()
    )
  );
