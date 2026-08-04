-- Owner-facing invoices: bill a property owner directly for a unit with no
-- active lease (e.g. company pays for a repair/errand, bills owner back).

alter table invoices alter column lease_id drop not null;
alter table invoices alter column tenant_id drop not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_party_check') then
    alter table invoices add constraint invoices_party_check
      check (tenant_id is not null or owner_id is not null);
  end if;
end $$;

-- payment_intents had no owner read/insert policy despite already having an
-- owner_id column (used by the existing negative-SOA-balance payment flow) --
-- fixes that pre-existing gap alongside enabling owner-invoice payments.
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'payment_intents' and policyname = 'owner reads own payment_intents') then
    create policy "owner reads own payment_intents" on payment_intents for select
      using (owner_id = current_owner_id());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'payment_intents' and policyname = 'owner inserts payment_intents') then
    create policy "owner inserts payment_intents" on payment_intents for insert
      with check (owner_id = current_owner_id());
  end if;
end $$;

alter table payments add column if not exists owner_id uuid references owners(id) on delete set null;
create index if not exists payments_owner_idx on payments (owner_id);
