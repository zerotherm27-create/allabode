-- Addendum: amend a contract that was never signed in this system.
--
-- Until now an addendum could only amend one of the four in-system signing
-- flows, because `addenda.parent_id` was `not null` and the admin picker only
-- offered rows from those four tables. All Abode manages properties whose
-- original leases were signed on paper or in Word long before this platform
-- existed; those contracts had no way in.
--
-- This adds a second provenance for the parent: staff upload the signed
-- original (PDF or scan), it is read by AI, staff review the result, and the
-- extracted identity lands in the same `parent_snapshot` the contract text has
-- always been built from. The generated Addendum is unchanged in format.
--
-- Depends on: 20260726100000_addendum_signing.sql.
-- Storage: reuses the private `agreements` bucket (staff-only policies from
-- supabase/setup-storage.sql) under addendum/uploads/{uuid}/... — no new
-- bucket or policy is required.

-- A `system` parent still points at a real row; an `uploaded` one cannot.
alter table addenda alter column parent_id drop not null;

alter table addenda
  add column if not exists parent_source        text not null default 'system'
    check (parent_source in ('system', 'uploaded')),
  -- Path in the private `agreements` bucket. The uploaded original is kept:
  -- staff view it here, both signing parties can open it from their link, and
  -- completion cross-copies it into the tenant's portal documents.
  add column if not exists parent_document_path text,
  add column if not exists parent_document_name text,
  -- Raw AI output kept for auditability, exactly like receipt_extractions:
  -- { provider, model_name, prompt_version, raw_ai_json, confidence,
  --   warnings, extracted_at }. Staff working data — the token RPCs strip it.
  add column if not exists parent_extraction    jsonb;

-- Exactly one of the two provenances must be satisfied. Written as a table
-- check rather than two column checks because the requirement is a choice
-- between them, not a property of either column alone.
alter table addenda drop constraint if exists addenda_parent_ref_ck;
alter table addenda add constraint addenda_parent_ref_ck check (
  (parent_source = 'system'   and parent_id is not null) or
  (parent_source = 'uploaded' and parent_document_path is not null)
);

-- ── RPC replacements ───────────────────────────────────────────────────────
-- Identical to 20260726100000 apart from also stripping `parent_extraction`:
-- the raw model output, its confidence and its warnings are staff review
-- material and have no business being handed to a signing party. Both getters
-- keep returning parent_document_path/parent_document_name so the signing
-- pages can offer "view the original contract".

create or replace function get_addendum_by_token(p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
begin
  select to_jsonb(a) - 'landlord_access_token' - 'parent_extraction' into v
  from addenda a
  where a.access_token = p_token
    and a.status in ('sent', 'tenant_signed', 'completed')
    and (a.token_expires_at is null or a.token_expires_at > now());
  return v;
end;
$$;

create or replace function get_addendum_by_landlord_token(p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
begin
  select to_jsonb(a) - 'access_token' - 'parent_extraction' into v
  from addenda a
  where a.landlord_access_token = p_token
    and a.status in ('tenant_signed', 'completed')
    and (a.landlord_token_expires_at is null or a.landlord_token_expires_at > now());
  return v;
end;
$$;
