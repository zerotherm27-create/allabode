-- 0012_billing_templates.sql
-- Charge templates per unit, lease type + management fee, SOA payout status, expense-to-SOA linkage

-- ─────────────────────────────────────────────────────────────────
-- 1. Charge templates
-- ─────────────────────────────────────────────────────────────────
create table if not exists charge_templates (
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid not null references units(id) on delete cascade,
  name          text not null,
  amount        numeric(12,2) not null default 0,
  billing_note  text,
  template_type text not null default 'utility'
                check (template_type in ('utility', 'expense_recurring')),
  sort_order    int  not null default 0,
  is_active     boolean not null default true,
  applies_to    text not null default 'both'
                check (applies_to in ('long_term', 'short_term', 'both')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Ensure all columns exist in case the table was created with an older schema
alter table charge_templates add column if not exists billing_note  text;
alter table charge_templates add column if not exists template_type text not null default 'utility';
alter table charge_templates add column if not exists sort_order    int  not null default 0;
alter table charge_templates add column if not exists is_active     boolean not null default true;
alter table charge_templates add column if not exists applies_to    text not null default 'both';
alter table charge_templates add column if not exists created_at    timestamptz not null default now();
alter table charge_templates add column if not exists updated_at    timestamptz not null default now();

create index if not exists charge_templates_unit_idx on charge_templates (unit_id, is_active);

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'charge_templates_updated_at'
  ) then
    create trigger charge_templates_updated_at before update on charge_templates
      for each row execute function set_updated_at();
  end if;
end $$;

alter table charge_templates enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'charge_templates' and policyname = 'staff_all_charge_templates'
  ) then
    create policy "staff_all_charge_templates" on charge_templates
      for all using (is_staff()) with check (is_staff());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'charge_templates' and policyname = 'owner_read_charge_templates'
  ) then
    create policy "owner_read_charge_templates" on charge_templates
      for select using (
        exists (
          select 1 from units u
          join properties p on p.id = u.property_id
          where u.id = charge_templates.unit_id
            and p.owner_id = current_owner_id()
        )
      );
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────
-- 2. Lease type and management fee
-- ─────────────────────────────────────────────────────────────────
alter table leases
  add column if not exists lease_type   text not null default 'long_term'
             check (lease_type in ('long_term', 'short_term')),
  add column if not exists mgmt_fee_pct numeric(5,2) not null default 5,
  add column if not exists vat_pct      numeric(5,2) not null default 12;

-- ─────────────────────────────────────────────────────────────────
-- 3. SOA payout tracking + lease linkage
-- ─────────────────────────────────────────────────────────────────
alter table statements_of_account
  add column if not exists lease_id        uuid references leases(id) on delete set null,
  add column if not exists lease_type      text,
  add column if not exists mgmt_fee_amt    numeric(12,2),
  add column if not exists vat_amt         numeric(12,2),
  add column if not exists adjustments     numeric(12,2) not null default 0,
  add column if not exists prev_soa_ref    text,
  add column if not exists payout_due_at   date,
  add column if not exists payout_status   text not null default 'pending'
             check (payout_status in ('pending','processing','paid','collected','refund_pending')),
  add column if not exists payout_slip_url text,
  add column if not exists paid_at         timestamptz;

create index if not exists soa_lease_idx on statements_of_account (lease_id);

-- ─────────────────────────────────────────────────────────────────
-- 4. SOA lines — expense linkage + receipt path + billing note
-- ─────────────────────────────────────────────────────────────────
alter table soa_lines
  add column if not exists expense_id   uuid references expenses(id) on delete set null,
  add column if not exists receipt_path text,      -- private storage key (generate signed URL at render)
  add column if not exists billing_note text;

-- ─────────────────────────────────────────────────────────────────
-- 5. Payment intents — SOA payments (owner pays PM for negative payout)
-- ─────────────────────────────────────────────────────────────────
alter table payment_intents
  add column if not exists statement_id uuid references statements_of_account(id) on delete set null,
  add column if not exists owner_id     uuid references owners(id) on delete set null;

-- Make lease_id / tenant_id optional so SOA payments don't require a tenant
alter table payment_intents alter column tenant_id drop not null;
alter table payment_intents alter column lease_id  drop not null;
