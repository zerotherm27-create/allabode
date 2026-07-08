-- Keep admin Page Hero Background settings aligned with rendered marketing pages.

insert into site_settings (key, value, label, group_name, type, sort_order) values
  ('page_property_solutions_image', '', 'Property Solutions — Background Image',       'page_heroes', 'image', 10),
  ('page_documentation_image',      '', 'Documentation Assistance — Background Image', 'page_heroes', 'image', 11),
  ('page_faq_image',                '', 'FAQ — Background Image',                      'page_heroes', 'image', 12),
  ('page_terms_image',              '', 'Terms of Service — Background Image',         'page_heroes', 'image', 13),
  ('page_privacy_image',            '', 'Privacy Policy — Background Image',           'page_heroes', 'image', 14)
on conflict (key) do update
set
  label = excluded.label,
  group_name = excluded.group_name,
  type = excluded.type,
  sort_order = excluded.sort_order;
