-- Short Term Rental Agreement e-signature workflow. 4th sibling of the PM
-- agreement (0020-0022), Tenancy Agreement (0023), and Parking Agreement
-- (0024) flows — closest in shape to Parking (no unit/lease linkage), but
-- uses "landlord" as the property-side party name (matching the reference
-- template) instead of "landlord". Staff pre-fill all booking terms, the
-- tenant fills their personal details + occupants + ID and signs first, then
-- the landlord signs via their own token link — or a designated staff
-- signatory countersigns as fallback.
-- Depends on: set_updated_at(), is_staff() (0001), tenants (0003),
-- users.is_signatory (0020).

create type short_term_rental_status as enum
  ('draft', 'sent', 'tenant_signed', 'completed', 'voided');

create table short_term_rental_agreements (
  id                          uuid primary key default gen_random_uuid(),
  status                      short_term_rental_status not null default 'draft',

  -- Tenant signing link. The landlord gets a *separate* token (below) so
  -- one party's credential can never reach the other party's signing RPCs.
  access_token                uuid not null unique default gen_random_uuid(),
  token_expires_at            timestamptz,

  -- Landlord signing link — issued only after the tenant has signed.
  landlord_access_token      uuid unique,
  landlord_token_expires_at  timestamptz,

  created_by                  uuid references auth.users(id) on delete set null,
  tenant_email                text not null,
  tenant_name_hint            text,
  landlord_email             text,     -- optional: countersign fallback needs none
  landlord_name_hint         text,

  -- Staff-authored terms (locked once the tenant signs)
  agreement_date              date,
  landlord_details           jsonb not null default '{}',  -- name, address
  property_details            jsonb not null default '{}',  -- buildingName, unitNumber, address
  check_in_date                date,
  check_out_date               date,
  occupants                   jsonb not null default '[]',  -- string[] — Section 2.1
  amenity_location             text,
  amenities_list               text,
  garbage_disposal_location    text,

  -- Section 6: Rental Rates and Fees — flexible line items + dedicated deposit
  fee_items                   jsonb not null default '[]',  -- [{label, amount}]
  security_deposit_amount     numeric(14,2),
  bank_details                jsonb not null default
    '{"name":"All Abode Brokerage and Valuation OPC","bank":"Union Bank of the Philippines","branch":"JTKC Building, Pasong Tamo Branch","accountNumber":"0020 2003 7938"}',

  -- Annex A: Rental Agreement Checklist (furnishing inventory)
  inventory                   jsonb not null default '[]',  -- [{quantity, particulars, brand, remarks}]

  -- Tenant-filled details
  tenant_details              jsonb not null default '{}',  -- name, address, contact, email
  tenant_id_type               text,
  tenant_id_number             text,
  tenant_id_issued_date        date,
  tenant_id_document_path      text,

  -- Landlord ID (remote signing path only; countersign path leaves these blank)
  landlord_id_type            text,
  landlord_id_number          text,
  landlord_id_issued_date      date,
  landlord_id_document_path    text,

  -- Signatures
  tenant_typed_name            text,
  tenant_signature_data        text,      -- base64 PNG from canvas
  tenant_signed_at             timestamptz,
  tenant_signed_ip             text,

  landlord_typed_name         text,
  landlord_signature_data     text,
  landlord_signed_at          timestamptz,
  landlord_signed_ip          text,
  landlord_signed_via         text check (landlord_signed_via is null or landlord_signed_via in ('remote', 'countersign')),
  signatory_user_id            uuid references auth.users(id) on delete set null,  -- countersign path

  pdf_path                     text,      -- 'agreements' bucket, short-term-rental/{id}/... prefix
  linked_tenant_id             uuid references tenants(id) on delete set null,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create trigger short_term_rental_agreements_updated_at before update on short_term_rental_agreements
  for each row execute function set_updated_at();

alter table short_term_rental_agreements enable row level security;

create policy "staff all short_term_rental_agreements" on short_term_rental_agreements
  for all using (is_staff()) with check (is_staff());

-- No anon/portal RLS policies — public access goes only through the
-- SECURITY DEFINER RPCs below, which validate their own token and never
-- expose the other party's token.

-- ── Tenant-side RPCs ────────────────────────────────────────────────────────

create or replace function get_str_agreement_by_token(p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
begin
  select to_jsonb(a) - 'landlord_access_token' into v
  from short_term_rental_agreements a
  where a.access_token = p_token
    and a.status in ('sent', 'tenant_signed', 'completed')
    and (a.token_expires_at is null or a.token_expires_at > now());
  return v; -- null if not found/expired — caller renders a "link invalid" state
end;
$$;

create or replace function save_str_draft(
  p_token uuid,
  p_tenant_details jsonb,
  p_occupants jsonb,
  p_tenant_id_type text,
  p_tenant_id_number text,
  p_tenant_id_issued_date date
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  -- Only tenant-writable columns; the staff-authored terms are never
  -- touchable through this token.
  update short_term_rental_agreements
  set tenant_details = p_tenant_details,
      occupants = p_occupants,
      tenant_id_type = p_tenant_id_type,
      tenant_id_number = p_tenant_id_number,
      tenant_id_issued_date = p_tenant_id_issued_date
  where access_token = p_token
    and status = 'sent' -- locked once the tenant has signed
    and (token_expires_at is null or token_expires_at > now());

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'This link is no longer valid or the agreement has changed — please refresh the page and try again.';
  end if;
end;
$$;

create or replace function save_str_id_upload(
  p_token uuid,
  p_path text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  update short_term_rental_agreements
  set tenant_id_document_path = p_path
  where access_token = p_token
    and status = 'sent'
    and (token_expires_at is null or token_expires_at > now());

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'This link is no longer valid or the agreement has changed — please refresh the page and try again.';
  end if;
end;
$$;

create or replace function submit_str_tenant_signature(
  p_token uuid,
  p_typed_name text,
  p_signature_data text,
  p_ip text
) returns void language plpgsql security definer set search_path = public as $$
declare
  a short_term_rental_agreements;
begin
  select * into a from short_term_rental_agreements
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

  update short_term_rental_agreements
  set tenant_typed_name = p_typed_name,
      tenant_signature_data = p_signature_data,
      tenant_signed_at = now(),
      tenant_signed_ip = p_ip,
      status = 'tenant_signed'
  where id = a.id;
end;
$$;

-- ── Landlord-side RPCs ─────────────────────────────────────────────────────

create or replace function get_str_agreement_by_landlord_token(p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
begin
  select to_jsonb(a) - 'access_token' into v
  from short_term_rental_agreements a
  where a.landlord_access_token = p_token
    and a.status in ('tenant_signed', 'completed')
    and (a.landlord_token_expires_at is null or a.landlord_token_expires_at > now());
  return v;
end;
$$;

create or replace function save_str_landlord_id_upload(
  p_token uuid,
  p_id_type text,
  p_id_number text,
  p_id_issued_date date,
  p_path text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  update short_term_rental_agreements
  set landlord_id_type = p_id_type,
      landlord_id_number = p_id_number,
      landlord_id_issued_date = p_id_issued_date,
      landlord_id_document_path = p_path
  where landlord_access_token = p_token
    and status = 'tenant_signed'
    and landlord_signature_data is null
    and (landlord_token_expires_at is null or landlord_token_expires_at > now());

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'This link is no longer valid or the agreement has changed — please refresh the page and try again.';
  end if;
end;
$$;

create or replace function submit_str_landlord_signature(
  p_token uuid,
  p_typed_name text,
  p_signature_data text,
  p_ip text
) returns void language plpgsql security definer set search_path = public as $$
declare
  a short_term_rental_agreements;
begin
  -- landlord_signature_data guard blocks the race where a staff signatory
  -- countersigned while the landlord had the remote page open (and vice
  -- versa — the countersign action checks landlord_signed_via first).
  select * into a from short_term_rental_agreements
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

  update short_term_rental_agreements
  set landlord_typed_name = p_typed_name,
      landlord_signature_data = p_signature_data,
      landlord_signed_at = now(),
      landlord_signed_ip = p_ip,
      landlord_signed_via = 'remote'
  where id = a.id;
  -- Status stays 'tenant_signed' — the server action runs the completion
  -- pipeline (PDF, tenant record, portal account) and flips the status to
  -- 'completed'; if that pipeline fails the signature is durable and staff
  -- retry from the admin "Finalize" button.
end;
$$;
