-- Dual-market listings ("For Sale and For Lease") had only one `price` column,
-- so there was no way to show a distinct sale price and rent price for the
-- same listing. This adds an optional rent price alongside the existing
-- price/price_label pair. Existing rows are untouched: `price`/`price_label`
-- keep meaning exactly what they mean today for "For Sale" and "For Lease"
-- listings; `rent_price`/`rent_price_label` are only populated for dual-market
-- listings, representing the rental side while `price` holds the sale side.
alter table listings add column if not exists rent_price numeric(14,2);
alter table listings add column if not exists rent_price_label text;
