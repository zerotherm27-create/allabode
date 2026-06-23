-- Phase 3: Document Management
-- Run this in the Supabase SQL Editor after 0005_tickets.sql

create table documents (
  id                 uuid primary key default gen_random_uuid(),
  entity_type        text not null,
  -- 'lease' | 'property' | 'owner' | 'tenant' | 'ticket' | 'work_order'
  entity_id          uuid not null,
  document_type      text not null default 'other',
  -- 'lease_contract' | 'id' | 'proof_of_ownership' | 'inventory'
  -- | 'move_in_checklist' | 'inspection_report' | 'other'
  title              text not null,
  version_no         int not null default 1,
  file_path          text not null,   -- key in 'documents' private bucket
  file_name          text not null,
  file_mime_type     text,
  file_size          bigint,
  file_hash_sha256   text,
  is_signed          boolean not null default false,
  signed_at          timestamptz,
  is_immutable       boolean not null default false,
  visibility         text not null default 'staff',
  -- 'staff' | 'owner' | 'tenant'
  uploaded_by        uuid,
  notes              text,
  created_at         timestamptz not null default now()
);

create index on documents (entity_type, entity_id);
create index on documents (visibility);

alter table documents enable row level security;

create policy "staff full documents" on documents for all using (is_staff());

create policy "tenant reads tenant-visible docs" on documents for select
  using (
    visibility = 'tenant' and (
      (entity_type = 'lease'  and entity_id in (
        select id from leases where tenant_id = current_tenant_id()
      )) or
      (entity_type = 'tenant' and entity_id = current_tenant_id())
    )
  );

create policy "owner reads owner-and-tenant-visible docs" on documents for select
  using (
    visibility in ('owner', 'tenant') and (
      (entity_type = 'property' and entity_id in (
        select id from properties where owner_id = current_owner_id()
      )) or
      (entity_type = 'owner' and entity_id = current_owner_id()) or
      (entity_type = 'lease' and entity_id in (
        select l.id from leases l
        join units u on u.id = l.unit_id
        join properties p on p.id = u.property_id
        where p.owner_id = current_owner_id()
      ))
    )
  );

-- Note: create a private 'documents' bucket in Supabase Storage manually.
-- Policy: staff can read/write; tenant and owner get signed URLs via API route.
