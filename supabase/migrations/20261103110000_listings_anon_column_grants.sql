-- Closes a data leak: anon (anyone on the internet, no login) could read EVERY
-- column of every live listing through the REST API, including private_address,
-- owner_name, owner_contact and internal_notes. The row policy only hides
-- Draft/Archived listings; it never limited columns.
--
-- This leaves anon able to read only the columns the public site actually uses
-- (lib/listings.ts COLS + the specialist link, and `title` for viewing
-- bookings). Row rules are unchanged: anon still sees only live, approved
-- listings.
--
-- Nothing else changes: staff, specialists, portal users and server code that
-- uses the service role are unaffected (they are not the anon role).
-- Not covered: a signed-in tenant/owner/specialist can still read these columns
-- through their own login. Closing that means moving the private fields to a
-- separate staff-only table (a follow-up).
--
-- `status` and `approval_status` are granted because the row policies and the
-- listing_images policy reference them. If the public site ever starts using
-- another listings column (or one is added to lib/listings.ts COLS), add it to
-- the grant below, or anon requests for it fail with "permission denied".
--
-- Run in Supabase -> SQL Editor. Idempotent: safe to run more than once.
-- Roll back (restores the old exposure):  grant select on listings to anon;

begin;

-- Start from nothing so a table-level SELECT cannot make the list meaningless;
-- revoking it also clears any stray column grants. anon never writes listings
-- (no write policy exists), so INSERT/UPDATE/DELETE go with it.
revoke all on listings from anon;

grant select (
  id, slug, title, location,
  price, price_label, rent_price, rent_price_label,
  description, seo_description,
  listing_category, lease_type, property_type, status,
  bedrooms, bathrooms, floor_area, lot_area, parking, furnishing,
  lease_terms, sale_terms, availability_date,
  is_featured, clean_title, created_at,
  nearby_places, nearby_places_updated_at,
  specialist_id, approval_status
) on listings to anon;

commit;

-- Checks to run afterwards (SQL editor, each as its own query):
--   select column_name from information_schema.column_privileges
--     where grantee = 'anon' and table_name = 'listings' and privilege_type = 'SELECT'
--     order by 1;        -- the 30 columns above; no owner_*, private_address, internal_notes
--   begin; set local role anon;
--     select slug, title, status from listings limit 3;        -- works
--     select owner_contact from listings limit 1;              -- must fail: permission denied
--   rollback;
