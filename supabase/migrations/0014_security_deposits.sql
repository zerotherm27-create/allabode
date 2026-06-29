-- 0014_security_deposits.sql
-- Security deposits held by AllAbode on behalf of owners.
-- Lease commissions (new lease / renewal) deducted from owner SOA.
-- Depends on: 0003_property_management.sql

-- ─── Security deposits ────────────────────────────────────────────
-- Money collected from tenant on lease signing: 1–3 months rent.
-- Held by AllAbode; NOT owner income until forfeited or applied to damages.
create table security_deposits (
  id             uuid primary key default gen_random_uuid(),
  lease_id       uuid not null references leases(id) on delete cascade,
  tenant_id      uuid references tenants(id),
  owner_id       uuid references owners(id),
  unit_id        uuid references units(id),
  months_held    numeric(4,1) not null default 2,
  amount_held    numeric(14,2) not null,
  received_at    date not null,
  payment_method text check (payment_method in ('cash','bank_transfer','gcash','maya','check','other')),
  status         text not null default 'held'
                 check (status in ('held','partially_returned','returned','forfeited')),
  -- Return
  returned_amount   numeric(14,2),
  return_deductions jsonb    default '[]',   -- [{description, amount}]
  returned_at       date,
  return_notes      text,
  -- Forfeiture
  forfeited_amount  numeric(14,2),
  forfeiture_reason text,
  forfeited_at      date,
  notes             text,
  created_by        uuid references auth.users(id),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ─── Lease commissions ────────────────────────────────────────────
-- One-time fee AllAbode earns for sourcing/renewing a lease.
-- Deducted from the owner's first SOA for that lease period.
create table lease_commissions (
  id              uuid primary key default gen_random_uuid(),
  lease_id        uuid not null references leases(id) on delete cascade,
  owner_id        uuid references owners(id),
  commission_type text not null default 'new_lease'
                  check (commission_type in ('new_lease','renewal','other')),
  description     text,
  amount          numeric(14,2) not null,
  status          text not null default 'pending'
                  check (status in ('pending','applied','waived')),
  soa_id          uuid references statements_of_account(id),
  applied_at      timestamptz,
  notes           text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─── Link commission → SOA line ──────────────────────────────────
alter table soa_lines add column if not exists commission_id uuid references lease_commissions(id);

-- ─── Triggers ────────────────────────────────────────────────────
create trigger set_updated_at_security_deposits
  before update on security_deposits
  for each row execute function set_updated_at();

create trigger set_updated_at_lease_commissions
  before update on lease_commissions
  for each row execute function set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────
alter table security_deposits enable row level security;
alter table lease_commissions  enable row level security;

create policy "staff full security_deposits" on security_deposits
  using (is_staff()) with check (is_staff());

create policy "staff full lease_commissions" on lease_commissions
  using (is_staff()) with check (is_staff());

-- Owners can read their own deposit and commission records (portal transparency)
create policy "owner reads own deposits" on security_deposits
  for select using (owner_id = current_owner_id());

create policy "owner reads own commissions" on lease_commissions
  for select using (owner_id = current_owner_id());
