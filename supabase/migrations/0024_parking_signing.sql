-- Parking Space Rental Agreement e-signature workflow. Third sibling of the
-- PM agreement (0020-0022) and Tenancy Agreement (0023) flows, mirroring the
-- tenancy model exactly: staff pre-fill all rental terms, the tenant fills
-- their personal details + authorized vehicle + ID and signs first, then the
-- landlord signs via their own token link — or a designated staff signatory
-- countersigns as fallback.
-- Depends on: set_updated_at(), is_staff() (0001), tenants (0003),
-- users.is_signatory (0020).

create type parking_agreement_status as enum
  ('draft', 'sent', 'tenant_signed', 'completed', 'voided');

create table parking_agreements (
  id                        uuid primary key default gen_random_uuid(),
  status                    parking_agreement_status not null default 'draft',

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
  agreement_date            date,     -- "made and entered into on the __ day of ____ 20__"
  agreement_city            text not null default 'Makati City',
  landlord_details          jsonb not null default '{}',  -- name, idNumber, address
  parking_details           jsonb not null default '{}',  -- slotLabel, buildingName, address
  lease_start_date          date,
  lease_end_date            date,
  rent_amount               numeric(14,2),
  rent_amount_words         text,
  -- 2 months' advance + 1 month security deposit, due upon signing (clause 4)
  signing_total_amount      numeric(14,2),
  signing_total_words       text,
  sticker_amount            numeric(14,2),   -- parking sticker payable to the PMO
  rent_due_day              integer check (rent_due_day is null or (rent_due_day between 1 and 31)),
  payment_schedule          jsonb not null default '[]',  -- [{dueDate, amount, bankBranch, coverage}]
  bank_details              jsonb not null default '{"name":"All Abode Property Management Corp.","bank":"Banco de Oro (BDO)","branch":"Makati Cinema Square","accountNumber":"004290181697"}',

  -- Tenant-filled details
  tenant_details            jsonb not null default '{}',  -- name, address, contact, email
  vehicle_details           jsonb not null default '{}',  -- makeModel, plateNo, color
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

  pdf_path                  text,      -- 'agreements' bucket, parking/{id}/... prefix
  linked_tenant_id          uuid references tenants(id) on delete set null,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create trigger parking_agreements_updated_at before update on parking_agreements
  for each row execute function set_updated_at();

alter table parking_agreements enable row level security;

create policy "staff all parking_agreements" on parking_agreements
  for all using (is_staff()) with check (is_staff());

-- No anon/portal RLS policies — public access goes only through the
-- SECURITY DEFINER RPCs below, which validate their own token and never
-- expose the other party's token.

-- ── Tenant-side RPCs ────────────────────────────────────────────────────────

create or replace function get_parking_agreement_by_token(p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
begin
  select to_jsonb(a) - 'landlord_access_token' into v
  from parking_agreements a
  where a.access_token = p_token
    and a.status in ('sent', 'tenant_signed', 'completed')
    and (a.token_expires_at is null or a.token_expires_at > now());
  return v; -- null if not found/expired — caller renders a "link invalid" state
end;
$$;

create or replace function save_parking_draft(
  p_token uuid,
  p_tenant_details jsonb,
  p_vehicle_details jsonb,
  p_tenant_id_type text,
  p_tenant_id_number text,
  p_tenant_id_issued_date date
) returns void language plpgsql security definer set search_path = public as $$
begin
  -- Only tenant-writable columns; the staff-authored terms are never
  -- touchable through this token.
  update parking_agreements
  set tenant_details = p_tenant_details,
      vehicle_details = p_vehicle_details,
      tenant_id_type = p_tenant_id_type,
      tenant_id_number = p_tenant_id_number,
      tenant_id_issued_date = p_tenant_id_issued_date
  where access_token = p_token
    and status = 'sent' -- locked once the tenant has signed
    and (token_expires_at is null or token_expires_at > now());
end;
$$;

create or replace function save_parking_id_upload(
  p_token uuid,
  p_path text
) returns void language plpgsql security definer set search_path = public as $$
begin
  update parking_agreements
  set tenant_id_document_path = p_path
  where access_token = p_token
    and status = 'sent'
    and (token_expires_at is null or token_expires_at > now());
end;
$$;

create or replace function submit_parking_tenant_signature(
  p_token uuid,
  p_typed_name text,
  p_signature_data text,
  p_ip text
) returns void language plpgsql security definer set search_path = public as $$
declare
  a parking_agreements;
begin
  select * into a from parking_agreements
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

  update parking_agreements
  set tenant_typed_name = p_typed_name,
      tenant_signature_data = p_signature_data,
      tenant_signed_at = now(),
      tenant_signed_ip = p_ip,
      status = 'tenant_signed'
  where id = a.id;
end;
$$;

-- ── Landlord-side RPCs ──────────────────────────────────────────────────────

create or replace function get_parking_agreement_by_landlord_token(p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
begin
  select to_jsonb(a) - 'access_token' into v
  from parking_agreements a
  where a.landlord_access_token = p_token
    and a.status in ('tenant_signed', 'completed')
    and (a.landlord_token_expires_at is null or a.landlord_token_expires_at > now());
  return v;
end;
$$;

create or replace function save_parking_landlord_id_upload(
  p_token uuid,
  p_id_type text,
  p_id_number text,
  p_id_issued_date date,
  p_path text
) returns void language plpgsql security definer set search_path = public as $$
begin
  update parking_agreements
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

create or replace function submit_parking_landlord_signature(
  p_token uuid,
  p_typed_name text,
  p_signature_data text,
  p_ip text
) returns void language plpgsql security definer set search_path = public as $$
declare
  a parking_agreements;
begin
  -- landlord_signature_data guard blocks the race where a staff signatory
  -- countersigned while the landlord had the remote page open (and vice
  -- versa — the countersign action checks landlord_signed_via first).
  select * into a from parking_agreements
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

  update parking_agreements
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
