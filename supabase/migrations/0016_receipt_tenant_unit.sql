-- Add tenant tag to receipt_uploads (unit column already exists from 0003)
alter table receipt_uploads
  add column if not exists related_tenant_id uuid references tenants(id) on delete set null;
