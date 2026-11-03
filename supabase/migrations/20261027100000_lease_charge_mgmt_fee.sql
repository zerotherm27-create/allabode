-- Per-lease switch: skip the management fee (and VAT on it) on owner statements,
-- e.g. tenant-hunting-only leases. Existing leases keep charging it.
alter table leases
  add column if not exists charge_mgmt_fee boolean not null default true;
