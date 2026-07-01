-- Digital contract signing: Property Management Agreement e-signature workflow.
-- Depends on: set_updated_at(), is_staff() (0001), owners/users tables (0001, 0003).

create type agreement_status as enum
  ('draft', 'sent', 'owner_signed', 'completed', 'voided');

create table agreements (
  id                  uuid primary key default gen_random_uuid(),
  status              agreement_status not null default 'draft',
  access_token        uuid not null unique default gen_random_uuid(),
  token_expires_at    timestamptz,

  created_by          uuid references auth.users(id) on delete set null,
  owner_email         text not null,
  owner_name_hint     text,                 -- optional label admin typed when sending

  -- filled in by the owner during the flow
  owner_details       jsonb not null default '{}',   -- name, nationality, civil_status, address, contact
  property_details    jsonb not null default '{}',   -- condo, unit, address, floor area, parking, storage, furnished, inclusions
  service_selections  jsonb not null default '{}',   -- checkboxes + "other services" note
  annex_c             jsonb not null default '{}',   -- authority matrix: rent, lease term, discount limit, repair limit, pet/smoking/sublease/short-term/furnishing policy, comms pref, bank details, payout pref, special instructions
  annex_b             jsonb not null default '{}',   -- STAFF-ONLY, optional: keys, furniture, appliances, fixtures, initial condition report. Empty => PDF prints the blank template instead.
  effective_date      date,

  -- owner identity — the only required document at signing; both the typed
  -- details and the image appear in the PDF (Acknowledgment table + attachment page)
  owner_id_type           text,          -- e.g. 'passport', 'drivers_license', 'national_id', 'umid'
  owner_id_number         text,
  owner_id_document_path  text,          -- required before signing

  -- admin-reference-only intake profile — staff-only, never rendered into the PDF
  intake_profile       jsonb not null default '{}',   -- spouse or emergency-contact details, messenger, viber/whatsapp

  owner_typed_name      text,
  owner_signature_data  text,      -- base64 PNG from canvas
  owner_signed_at       timestamptz,
  owner_signed_ip        text,

  signatory_user_id     uuid references auth.users(id) on delete set null,
  manager_signature_data text,
  manager_signed_at     timestamptz,
  manager_signed_ip     text,      -- captured server-side from the countersign request, for the Certificate of Electronic Signature

  pdf_path             text,       -- path in 'agreements' bucket once completed
  linked_owner_id       uuid references owners(id) on delete set null,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger agreements_updated_at before update on agreements
  for each row execute function set_updated_at();

alter table users add column if not exists is_signatory boolean not null default false;

-- Staff-facing follow-up reminder only — unrelated to signing or PDF content.
-- All Abode collects an SPA/Authorization Letter from the Owner separately,
-- authorizing All Abode to represent the Owner with third parties (Section IX
-- of the Property Management Agreement).
alter table owners add column if not exists spa_authorization_received boolean not null default false;

alter table agreements enable row level security;

create policy "staff all agreements" on agreements
  for all using (is_staff()) with check (is_staff());

-- No anon/portal RLS policies on this table — public access goes only
-- through the SECURITY DEFINER RPCs below, which validate the token
-- themselves and never expose the raw row to an unauthenticated role.

create or replace function get_agreement_by_token(p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
begin
  select to_jsonb(a) into v
  from agreements a
  where a.access_token = p_token
    and a.status in ('sent', 'owner_signed', 'completed')
    and (a.token_expires_at is null or a.token_expires_at > now());
  return v; -- null if not found/expired — caller renders a "link invalid" state
end;
$$;

create or replace function save_agreement_draft(
  p_token uuid,
  p_owner_details jsonb,
  p_property_details jsonb,
  p_service_selections jsonb,
  p_annex_c jsonb,
  p_effective_date date,
  p_owner_id_type text,
  p_owner_id_number text,
  p_intake_profile jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  update agreements
  set owner_details = p_owner_details,
      property_details = p_property_details,
      service_selections = p_service_selections,
      annex_c = p_annex_c,
      effective_date = p_effective_date,
      owner_id_type = p_owner_id_type,
      owner_id_number = p_owner_id_number,
      intake_profile = p_intake_profile,
      status = case when status = 'draft' then 'sent' else status end
  where access_token = p_token
    and status in ('sent') -- locked once owner has signed
    and (token_expires_at is null or token_expires_at > now());
end;
$$;

-- Called once, when the owner uploads their government ID image during the flow.
create or replace function save_agreement_id_upload(
  p_token uuid,
  p_path text
) returns void language plpgsql security definer set search_path = public as $$
begin
  update agreements
  set owner_id_document_path = p_path
  where access_token = p_token
    and status = 'sent'
    and (token_expires_at is null or token_expires_at > now());
end;
$$;

create or replace function submit_owner_signature(
  p_token uuid,
  p_typed_name text,
  p_signature_data text,
  p_ip text
) returns void language plpgsql security definer set search_path = public as $$
declare
  a agreements;
begin
  select * into a from agreements
  where access_token = p_token
    and status = 'sent'
    and (token_expires_at is null or token_expires_at > now());

  if a.id is null then
    raise exception 'agreement not found or not signable';
  end if;
  if a.owner_id_document_path is null or a.owner_id_type is null or a.owner_id_number is null then
    raise exception 'a valid government ID (type, number, and uploaded image) is required before signing';
  end if;

  update agreements
  set owner_typed_name = p_typed_name,
      owner_signature_data = p_signature_data,
      owner_signed_at = now(),
      owner_signed_ip = p_ip,
      status = 'owner_signed'
  where id = a.id;
end;
$$;
