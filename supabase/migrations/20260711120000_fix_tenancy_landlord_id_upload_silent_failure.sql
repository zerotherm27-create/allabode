-- save_tenancy_landlord_id_upload previously did a bare UPDATE with no
-- row-count check. If the WHERE clause matched zero rows (stale/expired
-- token, agreement already signed, etc.), the function returned
-- successfully with nothing written — the landlord's browser showed
-- "ID uploaded" and the file landed in Storage, but landlord_id_document_path
-- stayed null, so the ID silently never appeared on the generated PDF.
-- Now raises so the client surfaces a real error instead of a false success.
create or replace function save_tenancy_landlord_id_upload(
  p_token uuid,
  p_id_type text,
  p_id_number text,
  p_id_issued_date date,
  p_path text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_count int;
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

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'This link is no longer valid or the agreement has changed — please refresh the page and try again.';
  end if;
end;
$$;
