-- Phase 6: Automation Rules & Cron Job Registry
-- Run this in the Supabase SQL Editor after 0008_maintenance.sql

create table automation_rules (
  id             uuid primary key default gen_random_uuid(),
  code           text unique not null,
  name           text not null,
  description    text,
  trigger_type   text not null default 'schedule',
  -- 'schedule' | 'event'
  trigger_config jsonb not null default '{}',
  action_type    text not null,
  -- 'send_notification' | 'create_invoice' | 'escalate_ticket'
  -- | 'create_work_order' | 'generate_soa'
  action_config  jsonb not null default '{}',
  is_active      boolean not null default true,
  last_run_at    timestamptz,
  created_at     timestamptz not null default now()
);

create table automation_run_log (
  id                 uuid primary key default gen_random_uuid(),
  rule_id            uuid not null references automation_rules(id),
  triggered_at       timestamptz not null default now(),
  entities_processed int not null default 0,
  actions_taken      int not null default 0,
  errors             jsonb,
  status             text not null  -- 'success' | 'partial' | 'failed'
);

alter table automation_rules enable row level security;
alter table automation_run_log enable row level security;
create policy "staff full automation_rules"   on automation_rules   for all using (is_staff());
create policy "staff full automation_run_log" on automation_run_log for all using (is_staff());

-- Seed the 5 default cron rules
insert into automation_rules (code, name, description, trigger_type, trigger_config, action_type, action_config) values
  ('generate_invoices',
   'Generate Monthly Invoices',
   'Find active leases where today matches billing_day; create draft invoices + notify tenant.',
   'schedule',
   '{"cron": "0 1 * * *", "timezone": "Asia/Manila"}',
   'create_invoice',
   '{"billing_day": "1"}'
  ),
  ('check_lease_expiry',
   'Lease Expiry Reminders',
   'Send reminders at 90, 60, and 30 days before lease end date.',
   'schedule',
   '{"cron": "0 8 * * *", "timezone": "Asia/Manila"}',
   'send_notification',
   '{"days_before": [90, 60, 30]}'
  ),
  ('check_ticket_slas',
   'Ticket SLA Escalation',
   'Find open tickets past SLA deadline; escalate status and notify staff.',
   'schedule',
   '{"cron": "*/15 * * * *", "timezone": "Asia/Manila"}',
   'escalate_ticket',
   '{}'
  ),
  ('check_maintenance_due',
   'PM Due Scan',
   'Find maintenance plans due within 7 days; spawn work order if none already pending.',
   'schedule',
   '{"cron": "30 7 * * *", "timezone": "Asia/Manila"}',
   'create_work_order',
   '{"days_ahead": 7}'
  ),
  ('generate_owner_soa',
   'Monthly Owner SOA',
   'Generate draft Statements of Account for all owners on the 1st of each month.',
   'schedule',
   '{"cron": "0 2 1 * *", "timezone": "Asia/Manila"}',
   'generate_soa',
   '{}'
  )
on conflict (code) do nothing;
