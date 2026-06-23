-- Phase 5: Preventive Maintenance & Work Orders
-- Run this in the Supabase SQL Editor after 0007_notifications.sql

create table maintenance_plans (
  id                  uuid primary key default gen_random_uuid(),
  property_id         uuid not null references properties(id),
  unit_id             uuid references units(id),
  title               text not null,
  category            text not null default 'general',
  -- 'ac' | 'plumbing' | 'electrical' | 'pest_control' | 'grease_trap' | 'general'
  frequency_type      text not null default 'monthly',
  -- 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'custom_days'
  frequency_days      int,
  last_done_at        date,
  next_due_at         date,
  is_active           boolean not null default true,
  preferred_vendor_id uuid references vendors(id),
  estimated_cost      numeric(12,2),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create sequence if not exists work_order_seq start 1;

create or replace function generate_work_order_number()
returns text language sql security definer set search_path = public as $$
  select 'WO-' || to_char(now() at time zone 'Asia/Manila', 'YYYY') ||
         '-' || lpad(nextval('work_order_seq')::text, 6, '0');
$$;

create table work_orders (
  id                  uuid primary key default gen_random_uuid(),
  work_order_number   text unique not null,
  ticket_id           uuid references tickets(id),
  maintenance_plan_id uuid references maintenance_plans(id),
  property_id         uuid not null references properties(id),
  unit_id             uuid references units(id),
  vendor_id           uuid references vendors(id),
  assigned_staff_id   uuid references users(id),
  title               text not null,
  description         text,
  priority            text not null default 'normal',
  -- 'critical' | 'high' | 'normal' | 'low'
  status              text not null default 'pending',
  -- 'pending' | 'scheduled' | 'in_progress' | 'waiting_parts'
  -- | 'completed' | 'verified' | 'cancelled'
  scheduled_date      date,
  completed_date      date,
  estimated_cost      numeric(12,2),
  actual_cost         numeric(12,2),
  proof_path          text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger set_maintenance_plans_updated_at before update on maintenance_plans
  for each row execute function set_updated_at();

create trigger set_work_orders_updated_at before update on work_orders
  for each row execute function set_updated_at();

create index on maintenance_plans (property_id);
create index on maintenance_plans (next_due_at);
create index on work_orders (property_id);
create index on work_orders (status);
create index on work_orders (ticket_id);

alter table maintenance_plans enable row level security;
alter table work_orders enable row level security;

create policy "staff full maintenance_plans" on maintenance_plans for all using (is_staff());
create policy "owner reads own maintenance_plans" on maintenance_plans for select
  using (property_id in (select id from properties where owner_id = current_owner_id()));

create policy "staff full work_orders" on work_orders for all using (is_staff());
create policy "owner reads own work_orders" on work_orders for select
  using (property_id in (select id from properties where owner_id = current_owner_id()));
