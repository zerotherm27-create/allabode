-- Phase 4: Notices & In-App Notifications
-- Run this in the Supabase SQL Editor after 0006_documents.sql

create table notices (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null,
  notice_type  text not null default 'info',
  -- 'info' | 'warning' | 'maintenance' | 'urgent'
  audience     text not null default 'all',
  -- 'all' | 'owners' | 'tenants'
  property_id  uuid references properties(id),
  published_at timestamptz,
  expires_at   timestamptz,
  created_by   uuid,
  created_at   timestamptz not null default now()
);

create table notifications (
  id                uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null,
  type              text not null,
  -- 'invoice_issued' | 'ticket_updated' | 'statement_published'
  -- | 'notice' | 'lease_expiring' | 'document_shared'
  title             text not null,
  body              text not null,
  link              text,
  is_read           boolean not null default false,
  read_at           timestamptz,
  entity_type       text,
  entity_id         uuid,
  created_at        timestamptz not null default now()
);

create index on notices (published_at, expires_at);
create index on notifications (recipient_user_id, is_read, created_at);

alter table notices enable row level security;
alter table notifications enable row level security;

create policy "staff full notices" on notices for all using (is_staff());
create policy "published notices visible" on notices for select
  using (published_at is not null and (expires_at is null or expires_at > now()));

create policy "staff full notifications" on notifications for all using (is_staff());
create policy "user reads own notifications" on notifications for select
  using (recipient_user_id = auth.uid());
create policy "user marks own notifications read" on notifications for update
  using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());
