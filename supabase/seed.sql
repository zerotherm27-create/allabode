-- All Abode — seed data + RLS visibility fix.
-- Paste into the Supabase SQL editor and Run. Safe to re-run (idempotent).

-- 1) Widen public-read so live (non-draft/archived) listings are visible.
drop policy if exists "public reads published listings" on listings;
drop policy if exists "public reads images of published listings" on listing_images;
drop policy if exists "public reads live listings" on listings;
drop policy if exists "public reads images of live listings" on listing_images;

create policy "public reads live listings"
  on listings for select using (status not in ('Draft', 'Archived'));
create policy "public reads images of live listings"
  on listing_images for select using (
    exists (select 1 from listings l
            where l.id = listing_images.listing_id
              and l.status not in ('Draft', 'Archived'))
  );

-- 2) Seed listings (upsert by slug).
insert into listings
  (slug, title, description, location, city, province, price, price_label,
   listing_category, lease_type, property_type, status, bedrooms, bathrooms,
   floor_area, lot_area, parking, furnishing, lease_terms, sale_terms,
   availability_date, is_featured)
values
  ('modern-zen-loyola', 'Modern Zen Estate',
   'A premium residential property presented by All Abode Property Solutions.',
   'Loyola Grand Villas, Quezon City', 'Quezon City', 'Metro Manila',
   45000000, 'Total contract price', 'For Sale', null, 'House and Lot', 'Available',
   5, 4, 450, 520, 2, 'Semi-furnished', null, 'Cash or bank financing', null, true),

  ('executive-proscenium', 'Executive Suite, The Proscenium',
   'A fully-appointed executive residence in a premier Rockwell address.',
   'Rockwell, Makati City', 'Makati City', 'Metro Manila',
   120000, 'per month', 'For Lease', 'Long-term', 'Condo', 'Available',
   2, 2, 98, null, 1, 'Fully furnished', '12-month minimum, 2 months deposit', null, null, true),

  ('commercial-salcedo', 'Commercial Floor, Salcedo Village',
   'A whole commercial floor in the Salcedo Village business district.',
   'Salcedo Village, Makati City', 'Makati City', 'Metro Manila',
   28500000, 'Total contract price', 'For Sale', null, 'Commercial', 'Reserved',
   null, null, 210, null, 3, 'Unfurnished (bare shell)', null, 'Total contract price', null, true),

  ('garden-villa-alabang', 'Garden Villa, Ayala Alabang',
   'A spacious garden villa in the exclusive Ayala Alabang enclave.',
   'Ayala Alabang, Muntinlupa', 'Muntinlupa', 'Metro Manila',
   62000000, 'Total contract price', 'For Sale', null, 'House and Lot', 'Available',
   6, 5, 620, 800, 4, 'Unfurnished', null, 'Cash or bank financing', null, false),

  ('skyline-bgc', 'Skyline Loft, Uptown BGC',
   'A modern loft with skyline views in Uptown Bonifacio Global City.',
   'Bonifacio Global City, Taguig', 'Taguig', 'Metro Manila',
   95000, 'per month', 'For Lease', 'Short-term', 'Condo', 'Available',
   1, 1, 64, null, 1, 'Fully furnished', 'Short-term, flexible', null, null, false),

  ('retail-cebu', 'Retail Space, Cebu Business Park',
   'Prime retail space in the heart of Cebu Business Park.',
   'Cebu Business Park, Cebu City', 'Cebu City', 'Cebu',
   18750000, 'Total contract price', 'For Sale', null, 'Commercial', 'Sold',
   null, null, 150, null, 2, 'Unfurnished (bare shell)', null, 'Total contract price', null, false)
on conflict (slug) do update set
  title            = excluded.title,
  description      = excluded.description,
  location         = excluded.location,
  city             = excluded.city,
  province         = excluded.province,
  price            = excluded.price,
  price_label      = excluded.price_label,
  listing_category = excluded.listing_category,
  lease_type       = excluded.lease_type,
  property_type    = excluded.property_type,
  status           = excluded.status,
  bedrooms         = excluded.bedrooms,
  bathrooms        = excluded.bathrooms,
  floor_area       = excluded.floor_area,
  lot_area         = excluded.lot_area,
  parking          = excluded.parking,
  furnishing       = excluded.furnishing,
  lease_terms      = excluded.lease_terms,
  sale_terms       = excluded.sale_terms,
  availability_date = excluded.availability_date,
  is_featured      = excluded.is_featured;
