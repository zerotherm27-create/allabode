-- Page hero background image settings for all inner marketing pages.
-- Run in Supabase SQL Editor.

insert into site_settings (key, value, label, group_name, type, sort_order) values
  ('page_about_image',     '', 'About — Background Image',               'page_heroes', 'image', 1),
  ('page_leasing_image',   '', 'Leasing — Background Image',             'page_heroes', 'image', 2),
  ('page_buysell_image',   '', 'Buy & Sell — Background Image',          'page_heroes', 'image', 3),
  ('page_pm_image',        '', 'Property Management — Background Image', 'page_heroes', 'image', 4),
  ('page_appraisal_image', '', 'Appraisal — Background Image',           'page_heroes', 'image', 5),
  ('page_contact_image',   '', 'Contact — Background Image',             'page_heroes', 'image', 6),
  ('page_listings_image',  '', 'Listings — Background Image',            'page_heroes', 'image', 7),
  ('page_listyour_image',  '', 'List Your Property — Background Image',  'page_heroes', 'image', 8),
  ('page_resources_image', '', 'Resources — Background Image',           'page_heroes', 'image', 9),
  ('page_property_solutions_image', '', 'Property Solutions — Background Image',       'page_heroes', 'image', 10),
  ('page_documentation_image',      '', 'Documentation Assistance — Background Image', 'page_heroes', 'image', 11),
  ('page_faq_image',                '', 'FAQ — Background Image',                      'page_heroes', 'image', 12),
  ('page_terms_image',              '', 'Terms of Service — Background Image',         'page_heroes', 'image', 13),
  ('page_privacy_image',            '', 'Privacy Policy — Background Image',           'page_heroes', 'image', 14)
on conflict (key) do nothing;
