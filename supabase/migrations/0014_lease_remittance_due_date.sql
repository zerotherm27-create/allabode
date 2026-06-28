-- Lease-level default due date copied into generated owner SOAs.
alter table leases
  add column if not exists remittance_due_date date;
