-- Run this once in Supabase → SQL Editor
-- Creates the 3 storage buckets + all RLS policies

-- ── 1. Buckets ────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values
  ('receipts',     'receipts',     false),
  ('finance-docs', 'finance-docs', false),
  ('site-assets',  'site-assets',  true )
on conflict (id) do nothing;

-- ── 2. receipts (private — staff only) ───────────────────────────────────────
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

-- ── 3. finance-docs (private — staff only; portal users get signed URLs) ──────
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

-- ── 4. site-assets (public bucket — staff write, CDN handles public reads) ────
create policy "staff manage site-assets"
  on storage.objects for all to authenticated
  using     (bucket_id = 'site-assets' and public.is_staff())
  with check (bucket_id = 'site-assets' and public.is_staff());
