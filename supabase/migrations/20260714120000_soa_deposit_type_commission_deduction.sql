-- Distinguishes "security deposit" (the real computation base for a new
-- lease's first owner Statement of Account) from "advance rent" (held by
-- AllAbode, informational-only, never touches owner payout math). The
-- computeOwnerSoaByLease() function already selected `deposit_type` from
-- security_deposits, but the column never existed — every SOA generation
-- has silently failed to fetch held deposits at all until now.
--
-- soa_id/applied_at mirror lease_commissions' own applied-tracking, so a
-- deposit's value only ever funds one owner payout, not every subsequent
-- SOA regenerated for the same lease. This is orthogonal to `status`
-- (held/returned/forfeited), which governs the separate tenant-refund
-- lifecycle and is untouched by this migration.

alter table security_deposits
  add column if not exists deposit_type text not null default 'security'
    check (deposit_type in ('security', 'advance')),
  add column if not exists soa_id uuid references statements_of_account(id),
  add column if not exists applied_at timestamptz;

-- Mirrors the existing soa_lines.commission_id column — lets the publish
-- pipeline trace an income line back to the deposit row it came from, to
-- mark it applied (soa_id set) so it can't be double-counted later.
alter table soa_lines
  add column if not exists deposit_id uuid references security_deposits(id);
