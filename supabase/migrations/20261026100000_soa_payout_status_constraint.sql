-- "Carry to Next Payout" silently did nothing: 0012 created the payout_status
-- check inline (auto-named statements_of_account_payout_status_check) without
-- 'carried_forward', and 0017 only dropped/added a differently named constraint
-- (soa_payout_status_check), so the original one kept rejecting the value.
-- Drop every check on payout_status and re-add one that includes it.
-- Idempotent: safe to run more than once.
do $$
declare c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.statements_of_account'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%payout_status%'
  loop
    execute format('alter table public.statements_of_account drop constraint %I', c.conname);
  end loop;

  alter table public.statements_of_account
    add constraint soa_payout_status_check
    check (payout_status in
      ('pending','processing','paid','collected','refund_pending','carried_forward'));
end $$;
