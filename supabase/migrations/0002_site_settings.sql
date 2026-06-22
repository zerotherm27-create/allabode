-- Site Settings: key-value store for admin-editable site content.
-- Run in Supabase SQL Editor.

create table if not exists site_settings (
  key          text primary key,
  value        text,
  label        text not null,
  group_name   text not null,
  type         text not null default 'text',
  sort_order   int  not null default 0,
  updated_at   timestamptz not null default now()
);

create trigger site_settings_updated_at
  before update on site_settings
  for each row execute function set_updated_at();

alter table site_settings enable row level security;
create policy "public reads settings"  on site_settings for select using (true);
create policy "staff manage settings"  on site_settings for all
  using (is_staff()) with check (is_staff());

-- Seed defaults
insert into site_settings (key, value, label, group_name, type, sort_order) values
  ('contact_phone',        '+63 2 8888 1234',                              'Phone',                  'contact', 'tel',      1),
  ('contact_email',        'hello@allabodeph.com',                         'Email',                  'contact', 'email',    2),
  ('contact_location',     'Makati City, Philippines',                     'Location / Address',     'contact', 'text',     3),
  ('contact_service_area', 'Metro Manila · Cebu · Davao',                  'Service Area',           'contact', 'text',     4),
  ('social_facebook',      'https://facebook.com/allabodeph',              'Facebook URL',           'social',  'url',      1),
  ('social_messenger',     'https://m.me/allabodeph',                      'Messenger URL',          'social',  'url',      2),
  ('social_whatsapp',      'https://wa.me/63288881234',                    'WhatsApp URL',           'social',  'url',      3),
  ('social_viber',         'viber://chat?number=%2B63288881234',           'Viber URL',              'social',  'url',      4),
  ('brand_tagline',        'Complete Property Services. One Trusted Partner.', 'Tagline',            'brand',   'text',     1),
  ('brand_descriptor',     'Brokerage | Leasing | Property Management | Appraisal', 'Descriptor',   'brand',   'text',     2),
  ('hero_heading',         'Your property, professionally taken care of.', 'Hero Heading',           'hero',    'text',     1),
  ('hero_subheading',      'Brokerage, leasing, property management, and appraisal support through one trusted partner.', 'Hero Subheading', 'hero', 'text', 2),
  ('hero_body',            'All Abode Property Solutions helps owners, investors, buyers, sellers, tenants, and appraisal clients move through property decisions with clear guidance, organized coordination, and licensed professional expertise.', 'Hero Body Text', 'hero', 'textarea', 3),
  ('hero_image',           '',                                             'Hero Background Image URL', 'hero', 'image',    4)
on conflict (key) do nothing;
