-- Nearby places (schools, malls, markets, etc.) cached per listing. Populated
-- on-demand by staff via a "Refresh nearby places" action (lib/nearby-places/),
-- never fetched live on the public page. Nullable, additive — zero risk to
-- existing rows.

alter table listings
  add column nearby_places jsonb,
  add column nearby_places_updated_at timestamptz;
