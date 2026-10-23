-- Authority to Sell e-signature workflow (owner-facing, sibling of the PM agreement flow).
-- Depends on: set_updated_at(), is_staff() (0001), owners/users tables, users.is_signatory (0020).
-- Admin sends name + email only; the owner fills property, price, commission,
-- period and authority type, uploads an ID and signs; the broker (fixed company
-- defaults, not stored) countersigns from /admin/contracts/authority-to-sell/[id].

create type authority_to_sell_status as enum
  ('draft', 'sent', 'owner_signed', 'completed', 'voided');

create table authority_to_sell_agreements (
  id                  uuid primary key default gen_random_uuid(),
  status              authority_to_sell_status not null default 'draft',
  access_token        uuid not null unique default gen_random_uuid(),
  token_expires_at    timestamptz,

  created_by          uuid references auth.users(id) on delete set null,
  owner_email         text not null,
  owner_name_hint     text,

  -- filled in by the owner during the flow
  owner_details       jsonb not null default '{}',  -- name, nationality, civilStatus, address, email, contact
  property_details    jsonb not null default '{}',  -- propertyType, location, titleNo, area, improvements
  sale_terms          jsonb not null default '{}',  -- authorityType, grossPrice, minPrice, paymentTerms[], paymentOther, commissionPct, period*, protectionDays, terminationNoticeDays, executionPlace
  execution_date      date,

  owner_id_type           text,
  owner_id_number         text,
  owner_id_issued_date    date,
  owner_id_document_path  text,

  owner_typed_name      text,
  owner_signature_data  text,
  owner_signed_at       timestamptz,
  owner_signed_ip       text,

  signatory_user_id       uuid references auth.users(id) on delete set null,
  broker_signature_data   text,
  broker_signed_at        timestamptz,
  broker_signed_ip        text,

  pdf_path              text,   -- path in 'agreements' bucket once completed
  linked_owner_id       uuid references owners(id) on delete set null,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger authority_to_sell_agreements_updated_at before update on authority_to_sell_agreements
  for each row execute function set_updated_at();

alter table authority_to_sell_agreements enable row level security;

create policy "staff all authority_to_sell_agreements" on authority_to_sell_agreements
  for all using (is_staff()) with check (is_staff());

-- No anon/portal policies: the public flow goes only through the SECURITY
-- DEFINER RPCs below, which validate the token themselves.

create or replace function get_ats_by_token(p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
begin
  select to_jsonb(a) into v
  from authority_to_sell_agreements a
  where a.access_token = p_token
    and a.status in ('sent', 'owner_signed', 'completed')
    and (a.token_expires_at is null or a.token_expires_at > now());
  return v;
end;
$$;

create or replace function save_ats_draft(
  p_token uuid,
  p_owner_details jsonb,
  p_property_details jsonb,
  p_sale_terms jsonb,
  p_execution_date date,
  p_owner_id_type text,
  p_owner_id_number text,
  p_owner_id_issued_date date
) returns void language plpgsql security definer set search_path = public as $$
begin
  update authority_to_sell_agreements
  set owner_details = p_owner_details,
      property_details = p_property_details,
      sale_terms = p_sale_terms,
      execution_date = p_execution_date,
      owner_id_type = p_owner_id_type,
      owner_id_number = p_owner_id_number,
      owner_id_issued_date = p_owner_id_issued_date
  where access_token = p_token
    and status = 'sent'
    and (token_expires_at is null or token_expires_at > now());
  if not found then
    raise exception 'authority to sell not found or no longer editable';
  end if;
end;
$$;

create or replace function save_ats_id_upload(
  p_token uuid,
  p_path text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  select id into v_id from authority_to_sell_agreements
  where access_token = p_token
    and status = 'sent'
    and (token_expires_at is null or token_expires_at > now());
  -- The path must be one this record's upload ticket could have issued, so a
  -- token holder can't point the ID at another file in the private bucket.
  if v_id is null
     or p_path is null
     or p_path like '%..%'
     or p_path !~ ('^authority-to-sell/' || v_id::text || '/owner-id-[0-9]+\.(jpg|png)$') then
    raise exception 'invalid ID upload path';
  end if;

  update authority_to_sell_agreements
  set owner_id_document_path = p_path
  where id = v_id
    and status = 'sent';
  if not found then
    raise exception 'authority to sell not found or no longer editable';
  end if;
end;
$$;

create or replace function submit_ats_owner_signature(
  p_token uuid,
  p_typed_name text,
  p_signature_data text,
  p_ip text
) returns void language plpgsql security definer set search_path = public as $$
declare
  a authority_to_sell_agreements;
begin
  select * into a from authority_to_sell_agreements
  where access_token = p_token
    and status = 'sent'
    and (token_expires_at is null or token_expires_at > now());

  if a.id is null then
    raise exception 'authority to sell not found or not signable';
  end if;
  if p_signature_data is null
     or length(p_signature_data) > 1500000
     or p_signature_data !~ '^data:image/(png|jpeg);base64,[A-Za-z0-9+/=]+$' then
    raise exception 'invalid signature';
  end if;
  if a.owner_id_document_path is null or a.owner_id_type is null or a.owner_id_number is null then
    raise exception 'a valid government ID (type, number, and uploaded image) is required before signing';
  end if;

  update authority_to_sell_agreements
  set owner_typed_name = p_typed_name,
      owner_signature_data = p_signature_data,
      owner_signed_at = now(),
      owner_signed_ip = p_ip,
      status = 'owner_signed'
  where id = a.id;
  if not found then
    raise exception 'authority to sell not found or not signable';
  end if;
end;
$$;

grant execute on function get_ats_by_token(uuid) to anon, authenticated;
grant execute on function save_ats_draft(uuid, jsonb, jsonb, jsonb, date, text, text, date) to anon, authenticated;
grant execute on function save_ats_id_upload(uuid, text) to anon, authenticated;
grant execute on function submit_ats_owner_signature(uuid, text, text, text) to anon, authenticated;
