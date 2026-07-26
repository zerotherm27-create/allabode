-- Addendum e-signature flow — the FIFTH sibling of the contract signing
-- flows (PM 0020-0022, Tenancy 0023, Parking 0024, Short Term Rental
-- 20260714100000). Structurally closest to Short Term Rental: dual tokens,
-- same status machine, no lease/unit linkage.
--
-- What makes this one different: an Addendum *amends an already-executed
-- contract* of any of the four other kinds. It therefore carries a
-- polymorphic parent reference plus a snapshot of that parent's identity.
--
-- Depends on: set_updated_at() + is_staff() (0001), tenants (0003),
-- users.is_signatory (0020).
--
-- Storage: reuses the existing private `agreements` bucket under the
-- addendum/{id}/... prefix — no new bucket or policy is required.

create type addendum_status as enum
  ('draft', 'sent', 'tenant_signed', 'completed', 'voided');

create table addenda (
  id                          uuid primary key default gen_random_uuid(),
  status                      addendum_status not null default 'draft',

  -- Tenant signing link. The landlord gets a *separate* token (below) so
  -- one party's credential can never reach the other party's signing RPCs.
  access_token                uuid not null unique default gen_random_uuid(),
  token_expires_at            timestamptz,

  -- Landlord signing link — issued only after the tenant has signed.
  landlord_access_token       uuid unique,
  landlord_token_expires_at   timestamptz,

  created_by                  uuid references auth.users(id) on delete set null,
  tenant_email                text not null,
  tenant_name_hint            text,
  landlord_email              text,     -- optional: countersign fallback needs none
  landlord_name_hint          text,

  -- ── Parent contract ──────────────────────────────────────────────────────
  -- Deliberately NOT a foreign key: Postgres cannot reference four different
  -- tables from one column, and an executed addendum must keep printing the
  -- parent exactly as it stood when signed. parent_snapshot is the document
  -- of record; parent_type/parent_id exist for navigation and reporting only.
  parent_type                 text not null
    check (parent_type in ('pm', 'tenancy', 'parking', 'short_term_rental')),
  parent_id                   uuid not null,
  parent_snapshot             jsonb not null default '{}',
    -- { contractTitle, referenceCode, agreementDate, propertyDescription }

  -- ── Staff-authored amendment content (locked once the tenant signs) ───────
  -- Which optional sections print is derived from this data, not from
  -- separate boolean flags — a flag that can disagree with its own data is a
  -- bug waiting to happen.
  agreement_date              date,     -- date the Addendum itself is made
  effective_date              date,
  landlord_details            jsonb not null default '{}',  -- name, address

  -- Section: Amendment of Term (prints when either date is set)
  new_start_date              date,
  new_end_date                date,

  -- Section: Amendment of Rent and Fees (prints when fee_items is non-empty)
  fee_items                   jsonb not null default '[]',  -- [{label, amount}]
  payment_schedule            jsonb not null default '[]',  -- [{dueDate, amount, bankBranch, coverage}]
  bank_details                jsonb not null default
    '{"name":"All Abode Brokerage and Valuation OPC","bank":"Union Bank of the Philippines","branch":"JTKC Building, Pasong Tamo Branch","accountNumber":"0020 2003 7938"}',

  -- Section: Change of Parties and Occupants (prints when non-empty)
  party_changes               jsonb not null default '[]',
    -- [{action:'add'|'remove'|'substitute', role, name, outgoingName, notes}]

  -- Section: Amended Provisions (prints when non-empty)
  amended_clauses             jsonb not null default '[]',
    -- [{ref, heading, mode:'replace'|'add', newText}]

  -- Tenant-filled details (also carries additionalOccupantIds upload paths,
  -- same as the tenancy and parking flows)
  tenant_details              jsonb not null default '{}',  -- name, address, contact, email
  tenant_id_type              text,
  tenant_id_number            text,
  tenant_id_issued_date       date,
  tenant_id_document_path     text,

  -- Landlord ID (remote signing path only; countersign path leaves these blank)
  landlord_id_type            text,
  landlord_id_number          text,
  landlord_id_issued_date     date,
  landlord_id_document_path   text,

  -- Signatures
  tenant_typed_name           text,
  tenant_signature_data       text,      -- base64 PNG from canvas
  tenant_signed_at            timestamptz,
  tenant_signed_ip            text,

  landlord_typed_name         text,
  landlord_signature_data     text,
  landlord_signed_at          timestamptz,
  landlord_signed_ip          text,
  landlord_signed_via         text check (landlord_signed_via is null or landlord_signed_via in ('remote', 'countersign')),
  signatory_user_id           uuid references auth.users(id) on delete set null,  -- countersign path

  pdf_path                    text,      -- 'agreements' bucket, addendum/{id}/... prefix
  linked_tenant_id            uuid references tenants(id) on delete set null,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index addenda_parent_idx on addenda (parent_type, parent_id);

create trigger addenda_updated_at before update on addenda
  for each row execute function set_updated_at();

alter table addenda enable row level security;

create policy "staff all addenda" on addenda
  for all using (is_staff()) with check (is_staff());

-- No anon/portal RLS policies — public access goes only through the
-- SECURITY DEFINER RPCs below, which validate their own token and never
-- expose the other party's token.

-- ── Tenant-side RPCs ────────────────────────────────────────────────────────

create or replace function get_addendum_by_token(p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
begin
  select to_jsonb(a) - 'landlord_access_token' into v
  from addenda a
  where a.access_token = p_token
    and a.status in ('sent', 'tenant_signed', 'completed')
    and (a.token_expires_at is null or a.token_expires_at > now());
  return v;
end;
$$;

create or replace function save_addendum_draft(
  p_token uuid,
  p_tenant_details jsonb,
  p_tenant_id_type text,
  p_tenant_id_number text,
  p_tenant_id_issued_date date
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  update addenda
  set tenant_details = p_tenant_details,
      tenant_id_type = p_tenant_id_type,
      tenant_id_number = p_tenant_id_number,
      tenant_id_issued_date = p_tenant_id_issued_date
  where access_token = p_token
    and status = 'sent' -- locked once the tenant has signed
    and (token_expires_at is null or token_expires_at > now());

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'This link is no longer valid or the addendum has changed — please refresh the page and try again.';
  end if;
end;
$$;

create or replace function save_addendum_id_upload(
  p_token uuid,
  p_path text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  update addenda
  set tenant_id_document_path = p_path
  where access_token = p_token
    and status = 'sent'
    and (token_expires_at is null or token_expires_at > now());

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'This link is no longer valid or the addendum has changed — please refresh the page and try again.';
  end if;
end;
$$;

create or replace function submit_addendum_tenant_signature(
  p_token uuid,
  p_typed_name text,
  p_signature_data text,
  p_ip text
) returns void language plpgsql security definer set search_path = public as $$
declare
  a addenda;
begin
  select * into a from addenda
  where access_token = p_token
    and status = 'sent'
    and (token_expires_at is null or token_expires_at > now());

  if a.id is null then
    raise exception 'addendum not found or not signable';
  end if;
  if a.tenant_id_document_path is null or a.tenant_id_type is null or a.tenant_id_number is null then
    raise exception 'a valid government ID (type, number, and uploaded image) is required before signing';
  end if;
  if a.tenant_id_issued_date is null then
    raise exception 'the government ID''s issue date is required before signing';
  end if;

  update addenda
  set tenant_typed_name = p_typed_name,
      tenant_signature_data = p_signature_data,
      tenant_signed_at = now(),
      tenant_signed_ip = p_ip,
      status = 'tenant_signed'
  where id = a.id;
end;
$$;

-- ── Landlord-side RPCs ─────────────────────────────────────────────────────

create or replace function get_addendum_by_landlord_token(p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
begin
  select to_jsonb(a) - 'access_token' into v
  from addenda a
  where a.landlord_access_token = p_token
    and a.status in ('tenant_signed', 'completed')
    and (a.landlord_token_expires_at is null or a.landlord_token_expires_at > now());
  return v;
end;
$$;

create or replace function save_addendum_landlord_id_upload(
  p_token uuid,
  p_id_type text,
  p_id_number text,
  p_id_issued_date date,
  p_path text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  update addenda
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
    raise exception 'This link is no longer valid or the addendum has changed — please refresh the page and try again.';
  end if;
end;
$$;

create or replace function submit_addendum_landlord_signature(
  p_token uuid,
  p_typed_name text,
  p_signature_data text,
  p_ip text
) returns void language plpgsql security definer set search_path = public as $$
declare
  a addenda;
begin
  -- landlord_signature_data guard blocks the race where a staff signatory
  -- countersigned while the landlord had the remote page open (and vice
  -- versa — the countersign action checks landlord_signed_via first).
  select * into a from addenda
  where landlord_access_token = p_token
    and status = 'tenant_signed'
    and landlord_signature_data is null
    and (landlord_token_expires_at is null or landlord_token_expires_at > now());

  if a.id is null then
    raise exception 'addendum not found or not signable';
  end if;
  if a.landlord_id_document_path is null or a.landlord_id_type is null or a.landlord_id_number is null then
    raise exception 'a valid government ID (type, number, and uploaded image) is required before signing';
  end if;
  if a.landlord_id_issued_date is null then
    raise exception 'the government ID''s issue date is required before signing';
  end if;

  update addenda
  set landlord_typed_name = p_typed_name,
      landlord_signature_data = p_signature_data,
      landlord_signed_at = now(),
      landlord_signed_ip = p_ip,
      landlord_signed_via = 'remote'
  where id = a.id;
  -- Status stays 'tenant_signed' — the server action runs the completion
  -- pipeline (PDF, tenant record, portal document) and flips the status to
  -- 'completed'; if that pipeline fails the signature is durable and staff
  -- can retry from the admin "Finalize" button.
end;
$$;
