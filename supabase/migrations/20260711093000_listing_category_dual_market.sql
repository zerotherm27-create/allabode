-- The admin listing form and app code (commit ec185a6, "support dual-market
-- listings") already support a combined "For Sale and For Lease" category,
-- but the listing_category enum was never extended to allow it, so saving a
-- listing with that value fails at the database level. Add the missing value.
alter type listing_category add value if not exists 'For Sale and For Lease';
