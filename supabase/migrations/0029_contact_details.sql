-- Correct public contact details that were originally seeded as placeholders.
-- Idempotent: safe to rerun in the Supabase SQL editor.

insert into site_settings (key, value, label, group_name, type, sort_order)
values
  ('contact_phone',   '+63 917 159 6808',                    'Phone',        'contact', 'tel',   1),
  ('contact_email',   'info@allabodeph.com',                  'Email',        'contact', 'email', 2),
  ('social_whatsapp', 'https://wa.me/639171596808',           'WhatsApp URL', 'social',  'url',   3),
  ('social_viber',    'viber://chat?number=%2B639171596808',  'Viber URL',    'social',  'url',   4)
on conflict (key) do update
set
  value = excluded.value,
  label = excluded.label,
  group_name = excluded.group_name,
  type = excluded.type,
  sort_order = excluded.sort_order,
  updated_at = now();
