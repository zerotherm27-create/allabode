-- Authority to Sell: the Title No. / Tax Declaration No. is now required to sign.
-- Enforced at submit (not in save_ats_draft, which runs on every wizard step
-- while the field can still be empty). Same body as before plus the title check.

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
  if coalesce(btrim(a.property_details ->> 'titleNo'), '') = '' then
    raise exception 'the Title No. or Tax Declaration No. is required before signing';
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
