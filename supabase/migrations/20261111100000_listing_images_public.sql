-- Make the listing-images bucket public so listing photos are served at stable,
-- cacheable URLs. With private signed URLs every page regeneration minted new
-- tokens, so next/image re-downloaded each photo from Supabase every time
-- (billed egress, quota exceeded).
--
-- Also drops the anon SELECT policy on storage.objects for this bucket. It only
-- existed so the anon client could mint signed URLs; with a public bucket it is
-- unnecessary, and leaving it would let anyone enumerate every file in the
-- bucket, draft listings included. Photo URLs stay unguessable
-- (`{listing_id}/{uuid}.jpg`) and the listing_images rows are only readable by
-- anon for live listings.
--
-- Run in Supabase -> SQL Editor. Idempotent.
-- Roll back:  update storage.buckets set public = false where id = 'listing-images';
--   then re-create the policy "anon read listing-images" (see setup-storage.sql history).

update storage.buckets set public = true where id = 'listing-images';

drop policy if exists "anon read listing-images" on storage.objects;

-- Check afterwards:
--   select id, public from storage.buckets where id = 'listing-images';   -- public = true
--   select policyname from pg_policies
--    where schemaname = 'storage' and tablename = 'objects' and policyname like '%listing-images%';
--     -- no "anon read listing-images"
