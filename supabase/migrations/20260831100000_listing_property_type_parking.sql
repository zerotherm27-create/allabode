-- The public /listings/parking category page filters listings by
-- property_type = 'Parking', but the property_type enum never had that value,
-- so no listing could ever be filed under it. Add the missing value.
alter type property_type add value if not exists 'Parking';
