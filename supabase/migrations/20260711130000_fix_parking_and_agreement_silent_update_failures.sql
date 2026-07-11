-- Same silent-no-op bug as fixed for save_tenancy_landlord_id_upload in
-- 20260711120000: several parking (0024) and PM/owner agreement (0020/0022)
-- RPCs do a bare UPDATE with no row-count check. If the WHERE clause matches
-- zero rows (stale/expired token, wrong status, already-signed, etc.), the
-- function returns successfully with nothing written — the client shows a
-- false success while the underlying column stays null/stale. Each affected
-- function below now raises when its UPDATE affects zero rows.

-- ── Parking (0024) ──────────────────────────────────────────────────────────

create or replace function save_parking_draft(
  p_token uuid,
  p_tenant_details jsonb,
  p_vehicle_details jsonb,
  p_tenant_id_type text,
  p_tenant_id_number text,
  p_tenant_id_issued_date date
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  update parking_agreements
  set tenant_details = p_tenant_details,
      vehicle_details = p_vehicle_details,
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

create or replace function save_parking_id_upload(
  p_token uuid,
  p_path text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  update parking_agreements
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

create or replace function save_parking_landlord_id_upload(
  p_token uuid,
  p_id_type text,
  p_id_number text,
  p_id_issued_date date,
  p_path text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_count int;
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

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'This link is no longer valid or the agreement has changed — please refresh the page and try again.';
  end if;
end;
$$;

-- ── PM/owner agreement (0020, save_agreement_draft signature per 0022) ─────

create or replace function save_agreement_id_upload(
  p_token uuid,
  p_path text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  update agreements
  set owner_id_document_path = p_path
  where access_token = p_token
    and status = 'sent'
    and (token_expires_at is null or token_expires_at > now());

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'This link is no longer valid or the agreement has changed — please refresh the page and try again.';
  end if;
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
  p_owner_id_issued_date date,
  p_intake_profile jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_count int;
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

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'This link is no longer valid or the agreement has changed — please refresh the page and try again.';
  end if;
end;
$$;
