-- Add a staff-managed hero background video setting (overrides the hero
-- image when set; the image is reused as the video's poster/fallback).

insert into site_settings (key, value, label, group_name, type, sort_order) values
  ('hero_video', '', 'Background Video (overrides image when set; image is used as poster)', 'hero', 'video', 5)
on conflict (key) do update
set
  label = excluded.label,
  group_name = excluded.group_name,
  type = excluded.type,
  sort_order = excluded.sort_order;
