-- Add BNB/platform daily rentals as a separate lease type.
-- Run this before creating leases with lease_type = 'bnb'.

do $$
declare
  constraint_name text;
begin
  select c.conname
    into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'leases'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) like '%lease_type%';

  if constraint_name is not null then
    execute format('alter table public.leases drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.leases
  add constraint leases_lease_type_check
  check (lease_type in ('long_term', 'short_term', 'bnb'));

do $$
declare
  constraint_name text;
begin
  select c.conname
    into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'charge_templates'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) like '%applies_to%';

  if constraint_name is not null then
    execute format('alter table public.charge_templates drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.charge_templates
  add constraint charge_templates_applies_to_check
  check (applies_to in ('long_term', 'short_term', 'bnb', 'both'));
