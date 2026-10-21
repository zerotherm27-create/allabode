
-- Creates storage buckets + all RLS policies for receipts, finance-docs,
-- site-assets, documents, agreements, listing-images and specialist-photos.
-- Requires migration 20261020100000_specialists.sql (specialists table and
-- current_specialist_id()) to have been run first.

-- ── 1. Buckets ────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values
  ('receipts',       'receipts',       false),
  ('finance-docs',   'finance-docs',   false),
  ('site-assets',    'site-assets',    true ),
  ('documents',       'documents',      false),
  ('agreements',     'agreements',     false),
  ('listing-images', 'listing-images', false)
on conflict (id) do nothing;

-- listing-images: approved specialists can write here too, so cap the size and
-- accept images only. Staff uploads are re-encoded to JPEG in the browser
-- (lib/image-optimize.ts) and the admin form caps files at 10 MB, so they pass.
-- An UPDATE (not part of the insert above) so re-running applies it to the
-- existing bucket.
update storage.buckets
   set file_size_limit    = 10485760,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'listing-images';

-- Public bucket for specialist portrait photos (served straight from the CDN).
-- Restricted to images with a size cap, since specialists can write to it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('specialist-photos', 'specialist-photos', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

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
drop policy if exists "staff manage listing-images" on storage.objects;
drop policy if exists "anon read listing-images" on storage.objects;
drop policy if exists "specialist select listing-images" on storage.objects;
drop policy if exists "specialist insert listing-images" on storage.objects;
drop policy if exists "specialist delete listing-images" on storage.objects;
drop policy if exists "staff manage specialist-photos"   on storage.objects;
drop policy if exists "public read specialist-photos"    on storage.objects;
drop policy if exists "specialist insert specialist-photos" on storage.objects;
drop policy if exists "specialist update specialist-photos" on storage.objects;
drop policy if exists "specialist delete specialist-photos" on storage.objects;

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
-- The Tenancy Agreement e-signature flow (migration 0023) shares this bucket
-- under the `tenancy/{agreement_id}/...` path prefix with the exact same
-- access model — no additional policies are required for it. Likewise the
-- Parking Space Rental Agreement flow (migration 0024) uses the
-- `parking/{agreement_id}/...` prefix.
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

-- ── 8. listing-images (private — staff full access; anon gets SELECT only,
-- which is required for the Storage API to mint signed URLs, but does NOT
-- allow constructing a working direct/public URL to the object, since the
-- bucket's public flag is now false. Listing photos are served to visitors
-- exclusively as short-lived signed URLs, resolved server-side.) ─────────────
create policy "staff manage listing-images"
  on storage.objects for all to authenticated
  using     (bucket_id = 'listing-images' and public.is_staff())
  with check (bucket_id = 'listing-images' and public.is_staff());

create policy "anon read listing-images"
  on storage.objects for select to anon
  using (bucket_id = 'listing-images');

-- Approved specialists may manage photos of listings they own. Paths are
-- `{listing_id}/{uuid}.jpg` (app/admin/actions.ts uploadListingImages), so the
-- first folder must be the id of one of the caller's own listings. SELECT is
-- included because the Storage API needs it to remove objects and to sign
-- URLs for the specialist's own (not yet public) listing photos.
create policy "specialist select listing-images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] in (
      select l.id::text from public.listings l
      where l.specialist_id = public.current_specialist_id()
    )
  );

create policy "specialist insert listing-images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] in (
      select l.id::text from public.listings l
      where l.specialist_id = public.current_specialist_id()
    )
  );

create policy "specialist delete listing-images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] in (
      select l.id::text from public.listings l
      where l.specialist_id = public.current_specialist_id()
    )
  );

-- ── 9. specialist-photos (public — CDN serves reads; staff full access;
-- a specialist writes only inside the folder named after their own
-- specialists.id, while pending or approved — not once rejected/suspended) ──
create policy "staff manage specialist-photos"
  on storage.objects for all to authenticated
  using     (bucket_id = 'specialist-photos' and public.is_staff())
  with check (bucket_id = 'specialist-photos' and public.is_staff());

create policy "public read specialist-photos"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'specialist-photos');

create policy "specialist insert specialist-photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'specialist-photos'
    and (storage.foldername(name))[1] in (
      select s.id::text from public.specialists s
      where s.auth_user_id = auth.uid() and s.status in ('pending', 'approved')
    )
  );

create policy "specialist update specialist-photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'specialist-photos'
    and (storage.foldername(name))[1] in (
      select s.id::text from public.specialists s
      where s.auth_user_id = auth.uid() and s.status in ('pending', 'approved')
    )
  )
  with check (
    bucket_id = 'specialist-photos'
    and (storage.foldername(name))[1] in (
      select s.id::text from public.specialists s
      where s.auth_user_id = auth.uid() and s.status in ('pending', 'approved')
    )
  );

create policy "specialist delete specialist-photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'specialist-photos'
    and (storage.foldername(name))[1] in (
      select s.id::text from public.specialists s
      where s.auth_user_id = auth.uid() and s.status in ('pending', 'approved')
    )
  );
