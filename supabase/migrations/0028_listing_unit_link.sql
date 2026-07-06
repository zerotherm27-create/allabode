-- Optional link from a public marketing listing to the property-management
-- unit it advertises. Nullable, additive — a listing can exist with no
-- linked unit (most won't, since the two systems are otherwise unrelated).
-- Used only by the admin listing form to auto-fill specs/location/price
-- from the unit at pick time; never exposed on the public site.

alter table listings
  add column unit_id uuid references units(id) on delete set null;

create index listings_unit_idx on listings(unit_id);
