-- Run this in Supabase → SQL Editor (idempotent — safe to re-run)
-- Creates storage buckets + all RLS policies for receipts, finance-docs,
-- site-assets, and documents.

-- ── 1. Buckets ────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values
  ('receipts',     'receipts',     false),
  ('finance-docs', 'finance-docs', false),
  ('site-assets',  'site-assets',  true ),
  ('documents',    'documents',    false),
  ('agreements',   'agreements',   false)
on conflict (id) do nothing;

-- ── 2. Drop existing policies (idempotent) ────────────────────────────────────
drop policy if exists "staff insert receipts"      on storage.objects;
drop policy if exists "staff select receipts"      on storage.objects;
drop policy if exists "staff update receipts"      on storage.objects;
drop policy if exists "staff delete receipts"      on storage.objects;
drop policy if exists "staff insert finance-docs"  on storage.objects;
drop policy if exists "staff select finance-docs"  on storage.objects;
drop policy if exists "staff update finance-docs"  on storage.objects;
drop policy if exists "staff delete finance-docs"  on storage.objects;
drop policy if exists "staff manage site-assets"   on storage.objects;
drop policy if exists "staff insert documents"     on storage.objects;
drop policy if exists "staff select documents"     on storage.objects;
drop policy if exists "staff update documents"     on storage.objects;
drop policy if exists "staff delete documents"     on storage.objects;
drop policy if exists "portal select documents"    on storage.objects;
drop policy if exists "staff insert agreements"    on storage.objects;
drop policy if exists "staff select agreements"    on storage.objects;
drop policy if exists "staff update agreements"    on storage.objects;
drop policy if exists "staff delete agreements"    on storage.objects;

-- ── 3. receipts (private — staff only) ───────────────────────────────────────
create policy "staff insert receipts"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and public.is_staff());

create policy "staff select receipts"
  on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and public.is_staff());

create policy "staff update receipts"
  on storage.objects for update to authenticated
  using (bucket_id = 'receipts' and public.is_staff());

create policy "staff delete receipts"
  on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and public.is_staff());

-- ── 4. finance-docs (private — staff only; portal users get signed URLs) ──────
create policy "staff insert finance-docs"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'finance-docs' and public.is_staff());

create policy "staff select finance-docs"
  on storage.objects for select to authenticated
  using (bucket_id = 'finance-docs' and public.is_staff());

create policy "staff update finance-docs"
  on storage.objects for update to authenticated
  using (bucket_id = 'finance-docs' and public.is_staff());

create policy "staff delete finance-docs"
  on storage.objects for delete to authenticated
  using (bucket_id = 'finance-docs' and public.is_staff());

-- ── 5. site-assets (public bucket — staff write, CDN handles public reads) ────
create policy "staff manage site-assets"
  on storage.objects for all to authenticated
  using     (bucket_id = 'site-assets' and public.is_staff())
  with check (bucket_id = 'site-assets' and public.is_staff());

-- ── 6. documents (private — staff full; portal users via signed URL only) ─────
create policy "staff insert documents"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.is_staff());

create policy "staff select documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.is_staff());

create policy "staff update documents"
  on storage.objects for update to authenticated
  using (bucket_id = 'documents' and public.is_staff());

create policy "staff delete documents"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.is_staff());

-- Portal users download documents via /api/portal/documents/[id] (signed URL).
-- The API route runs as the authenticated user, so we need select access for
-- any authenticated user whose ownership is checked at the app layer.
create policy "portal select documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'documents');

-- ── 7. agreements (private — staff only). The public owner-signing flow
-- never gets a direct anon policy here: ID uploads and the final signed-PDF
-- download both go through narrow, token-validated server actions/routes
-- using the service-role client, which bypasses RLS entirely. No anon
-- policy is needed or added.
create policy "staff insert agreements"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'agreements' and public.is_staff());

create policy "staff select agreements"
  on storage.objects for select to authenticated
  using (bucket_id = 'agreements' and public.is_staff());

create policy "staff update agreements"
  on storage.objects for update to authenticated
  using (bucket_id = 'agreements' and public.is_staff());

create policy "staff delete agreements"
  on storage.objects for delete to authenticated
  using (bucket_id = 'agreements' and public.is_staff());
