-- Add the government ID's issue date, collected alongside ID type/number
-- on the signing form, so the Acknowledgment page's "Date/Place Issued"
-- column no longer prints blank for the Owner's row.
alter table agreements add column if not exists owner_id_issued_date date;

-- save_agreement_draft() gains a new required parameter, so its signature
-- (name + arg types) changes — drop the old overload explicitly first,
-- since "create or replace" only replaces a function with the exact same
-- argument types.
drop function if exists save_agreement_draft(uuid, jsonb, jsonb, jsonb, jsonb, date, text, text, jsonb);

create or replace function save_agreement_draft(
  p_token uuid,
  p_owner_details jsonb,
  p_property_details jsonb,
  p_service_selections jsonb,
  p_annex_c jsonb,
  p_effective_date date,
  p_owner_id_type text,
  p_owner_id_number text,
  p_owner_id_issued_date date,
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
      owner_id_issued_date = p_owner_id_issued_date,
      intake_profile = p_intake_profile,
      status = case when status = 'draft' then 'sent' else status end
  where access_token = p_token
    and status in ('sent') -- locked once owner has signed
    and (token_expires_at is null or token_expires_at > now());
end;
$$;

-- Require the issued date before signing too, matching the existing
-- ID type/number/image guard (same "competent evidence of identity"
-- requirement the Acknowledgment page needs).
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
  if a.owner_id_issued_date is null then
    raise exception 'the government ID''s issue date is required before signing';
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
