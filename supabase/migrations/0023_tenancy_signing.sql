-- Tenancy Agreement e-signature workflow (landlord <-> tenant lease contract).
-- Sibling of the Property Management Agreement flow (0020-0022) with a
-- reversed authoring model: staff pre-fill all lease terms, the tenant fills
-- only their personal details + ID and signs first, then the landlord (the
-- actual property owner) signs via their own token link — or a designated
-- staff signatory countersigns as fallback.
-- Depends on: set_updated_at(), is_staff() (0001), tenants/units/leases (0003),
-- users.is_signatory (0020).

create type tenancy_agreement_status as enum
  ('draft', 'sent', 'tenant_signed', 'completed', 'voided');

create table tenancy_agreements (
  id                        uuid primary key default gen_random_uuid(),
  status                    tenancy_agreement_status not null default 'draft',

  -- Tenant signing link. The landlord gets a *separate* token (below) so one
  -- party's credential can never reach the other party's signing RPCs.
  access_token              uuid not null unique default gen_random_uuid(),
  token_expires_at          timestamptz,

  -- Landlord signing link — issued only after the tenant has signed.
  landlord_access_token     uuid unique,
  landlord_token_expires_at timestamptz,

  created_by                uuid references auth.users(id) on delete set null,
  tenant_email              text not null,
  tenant_name_hint          text,
  landlord_email            text,     -- optional: countersign fallback needs none
  landlord_name_hint        text,

  -- Staff-authored terms (locked once the tenant signs)
  unit_id                   uuid references units(id) on delete set null,
  agreement_date            date,     -- "AN AGREEMENT made on the __ of ____ 20__"
  landlord_details          jsonb not null default '{}',  -- name, idNumber, address
  property_details          jsonb not null default '{}',  -- buildingName, floorUnit, address
  lease_months              integer,
  lease_start_date          date,
  lease_end_date            date,
  rent_amount               numeric(14,2),
  rent_amount_words         text,
  advance_deposit_amount    numeric(14,2),   -- 1 mo advance + 2 mo deposit, combined (clause 3.2)
  advance_deposit_words     text,
  deposit_amount            numeric(14,2),   -- 2 months security deposit (clause 4)
  deposit_amount_words      text,
  rent_due_day              integer check (rent_due_day is null or (rent_due_day between 1 and 31)),
  payment_schedule          jsonb not null default '[]',  -- [{dueDate, amount, particulars}]
  bank_details              jsonb not null default '{"name":"All Abode Property Management Corp.","bank":"Union Bank of the Philippines","branch":"JTKC Building, Pasong Tamo Branch","accountNumber":"0020 2003 7938"}',
  inventory                 jsonb not null default '[]',  -- [{quantity, particulars, brand, remarks}] staff-editable until completed

  -- Tenant-filled details
  tenant_details            jsonb not null default '{}',  -- name, idNumber, address, contact, email
  occupants                 jsonb not null default '[]',  -- string[]
  tenant_id_type            text,
  tenant_id_number          text,
  tenant_id_issued_date     date,
  tenant_id_document_path   text,

  -- Landlord ID (remote signing path only; countersign path leaves these blank)
  landlord_id_type          text,
  landlord_id_number        text,
  landlord_id_issued_date   date,
  landlord_id_document_path text,

  -- Signatures
  tenant_typed_name         text,
  tenant_signature_data     text,      -- base64 PNG from canvas
  tenant_signed_at          timestamptz,
  tenant_signed_ip          text,

  landlord_typed_name       text,
  landlord_signature_data   text,
  landlord_signed_at        timestamptz,
  landlord_signed_ip        text,
  landlord_signed_via       text check (landlord_signed_via is null or landlord_signed_via in ('remote', 'countersign')),
  signatory_user_id         uuid references auth.users(id) on delete set null,  -- countersign path

  pdf_path                  text,      -- 'agreements' bucket, tenancy/{id}/... prefix
  linked_tenant_id          uuid references tenants(id) on delete set null,
  linked_lease_id           uuid references leases(id) on delete set null,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create trigger tenancy_agreements_updated_at before update on tenancy_agreements
  for each row execute function set_updated_at();

alter table tenancy_agreements enable row level security;

create policy "staff all tenancy_agreements" on tenancy_agreements
  for all using (is_staff()) with check (is_staff());

-- No anon/portal RLS policies — public access goes only through the
-- SECURITY DEFINER RPCs below, which validate their own token and never
-- expose the other party's token.

-- ── Tenant-side RPCs ────────────────────────────────────────────────────────

create or replace function get_tenancy_agreement_by_token(p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
begin
  select to_jsonb(a) - 'landlord_access_token' into v
  from tenancy_agreements a
  where a.access_token = p_token
    and a.status in ('sent', 'tenant_signed', 'completed')
    and (a.token_expires_at is null or a.token_expires_at > now());
  return v; -- null if not found/expired — caller renders a "link invalid" state
end;
$$;

create or replace function save_tenancy_draft(
  p_token uuid,
  p_tenant_details jsonb,
  p_occupants jsonb,
  p_tenant_id_type text,
  p_tenant_id_number text,
  p_tenant_id_issued_date date
) returns void language plpgsql security definer set search_path = public as $$
begin
  -- Only tenant-writable columns; the staff-authored terms are never
  -- touchable through this token. No draft->sent promotion here — terms
  -- are staff-authored, so only sendTenancyTenantLink transitions to sent.
  update tenancy_agreements
  set tenant_details = p_tenant_details,
      occupants = p_occupants,
      tenant_id_type = p_tenant_id_type,
      tenant_id_number = p_tenant_id_number,
      tenant_id_issued_date = p_tenant_id_issued_date
  where access_token = p_token
    and status = 'sent' -- locked once the tenant has signed
    and (token_expires_at is null or token_expires_at > now());
end;
$$;

create or replace function save_tenancy_id_upload(
  p_token uuid,
  p_path text
) returns void language plpgsql security definer set search_path = public as $$
begin
  update tenancy_agreements
  set tenant_id_document_path = p_path
  where access_token = p_token
    and status = 'sent'
    and (token_expires_at is null or token_expires_at > now());
end;
$$;

create or replace function submit_tenant_signature(
  p_token uuid,
  p_typed_name text,
  p_signature_data text,
  p_ip text
) returns void language plpgsql security definer set search_path = public as $$
declare
  a tenancy_agreements;
begin
  select * into a from tenancy_agreements
  where access_token = p_token
    and status = 'sent'
    and (token_expires_at is null or token_expires_at > now());

  if a.id is null then
    raise exception 'agreement not found or not signable';
  end if;
  if a.tenant_id_document_path is null or a.tenant_id_type is null or a.tenant_id_number is null then
    raise exception 'a valid government ID (type, number, and uploaded image) is required before signing';
  end if;
  if a.tenant_id_issued_date is null then
    raise exception 'the government ID''s issue date is required before signing';
  end if;

  update tenancy_agreements
  set tenant_typed_name = p_typed_name,
      tenant_signature_data = p_signature_data,
      tenant_signed_at = now(),
      tenant_signed_ip = p_ip,
      status = 'tenant_signed'
  where id = a.id;
end;
$$;

-- ── Landlord-side RPCs ──────────────────────────────────────────────────────

create or replace function get_tenancy_agreement_by_landlord_token(p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
begin
  select to_jsonb(a) - 'access_token' into v
  from tenancy_agreements a
  where a.landlord_access_token = p_token
    and a.status in ('tenant_signed', 'completed')
    and (a.landlord_token_expires_at is null or a.landlord_token_expires_at > now());
  return v;
end;
$$;

create or replace function save_tenancy_landlord_id_upload(
  p_token uuid,
  p_id_type text,
  p_id_number text,
  p_id_issued_date date,
  p_path text
) returns void language plpgsql security definer set search_path = public as $$
begin
  update tenancy_agreements
  set landlord_id_type = p_id_type,
      landlord_id_number = p_id_number,
      landlord_id_issued_date = p_id_issued_date,
      landlord_id_document_path = p_path
  where landlord_access_token = p_token
    and status = 'tenant_signed'
    and landlord_signature_data is null
    and (landlord_token_expires_at is null or landlord_token_expires_at > now());
end;
$$;

create or replace function submit_landlord_signature(
  p_token uuid,
  p_typed_name text,
  p_signature_data text,
  p_ip text
) returns void language plpgsql security definer set search_path = public as $$
declare
  a tenancy_agreements;
begin
  -- landlord_signature_data guard blocks the race where a staff signatory
  -- countersigned while the landlord had the remote page open (and vice
  -- versa — the countersign action checks landlord_signed_via first).
  select * into a from tenancy_agreements
  where landlord_access_token = p_token
    and status = 'tenant_signed'
    and landlord_signature_data is null
    and (landlord_token_expires_at is null or landlord_token_expires_at > now());

  if a.id is null then
    raise exception 'agreement not found or not signable';
  end if;
  if a.landlord_id_document_path is null or a.landlord_id_type is null or a.landlord_id_number is null then
    raise exception 'a valid government ID (type, number, and uploaded image) is required before signing';
  end if;
  if a.landlord_id_issued_date is null then
    raise exception 'the government ID''s issue date is required before signing';
  end if;

  update tenancy_agreements
  set landlord_typed_name = p_typed_name,
      landlord_signature_data = p_signature_data,
      landlord_signed_at = now(),
      landlord_signed_ip = p_ip,
      landlord_signed_via = 'remote'
  where id = a.id;
  -- Status stays 'tenant_signed' — the server action runs the completion
  -- pipeline (PDF, tenant + lease records, portal account) and flips the
  -- status to 'completed'; if that pipeline fails the signature is durable
  -- and staff retry from the admin "Finalize" button.
end;
$$;
