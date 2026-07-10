-- Staff-maintained appliance brand catalog for inventory forms.
-- Seeded from Abenson home/small appliance category pages reviewed on 2026-07-10.

create table if not exists appliance_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  source_url text,
  source_checked_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists appliance_brand_categories (
  brand_id uuid not null references appliance_brands(id) on delete cascade,
  category_key text not null,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  primary key (brand_id, category_key)
);

create index if not exists appliance_brand_categories_category_idx
  on appliance_brand_categories (category_key, sort_order);

drop trigger if exists appliance_brands_updated_at on appliance_brands;
create trigger appliance_brands_updated_at before update on appliance_brands
for each row execute function set_updated_at();

alter table appliance_brands enable row level security;
alter table appliance_brand_categories enable row level security;

drop policy if exists "staff full appliance_brands" on appliance_brands;
create policy "staff full appliance_brands" on appliance_brands
  for all using (is_staff()) with check (is_staff());

drop policy if exists "staff full appliance_brand_categories" on appliance_brand_categories;
create policy "staff full appliance_brand_categories" on appliance_brand_categories
  for all using (is_staff()) with check (is_staff());

with seed(name, source_url) as (
  values
    ('Ariston', 'https://home.abenson.com/home-appliances.html'),
    ('Asahi', 'https://home.abenson.com/small-appliances.html'),
    ('Caribbean', 'https://home.abenson.com/small-appliances.html'),
    ('Carrier', 'https://home.abenson.com/home-appliances.html'),
    ('Condura', 'https://home.abenson.com/home-appliances/refrigerator.html'),
    ('Daikin', 'https://home.abenson.com/home-appliances.html'),
    ('Dowell', 'https://home.abenson.com/small-appliances.html'),
    ('Fujidenzo', 'https://home.abenson.com/home-appliances/refrigerator.html'),
    ('Haier', 'https://home.abenson.com/home-appliances/refrigerator.html'),
    ('Hanabishi', 'https://home.abenson.com/small-appliances.html'),
    ('Hisense', 'https://home.abenson.com/home-appliances.html'),
    ('Kolin', 'https://home.abenson.com/home-appliances.html'),
    ('Kyowa', 'https://home.abenson.com/small-appliances.html'),
    ('La Germania', 'https://home.abenson.com/home-appliances.html'),
    ('LG', 'https://home.abenson.com/home-appliances/refrigerator.html'),
    ('Midea', 'https://home.abenson.com/home-appliances/refrigerator.html'),
    ('Panasonic', 'https://home.abenson.com/home-appliances/refrigerator.html'),
    ('Samsung', 'https://home.abenson.com/home-appliances/refrigerator.html'),
    ('Sharp', 'https://home.abenson.com/home-appliances/refrigerator.html'),
    ('Sony', 'https://home.abenson.com/home-appliances.html'),
    ('Stiebel Eltron', 'https://home.abenson.com/home-appliances.html'),
    ('TCL', 'https://home.abenson.com/home-appliances/refrigerator.html'),
    ('Tecnogas', 'https://home.abenson.com/home-appliances.html'),
    ('Technik', 'https://home.abenson.com/home-appliances.html'),
    ('Tefal', 'https://home.abenson.com/small-appliances.html'),
    ('Tiger', 'https://home.abenson.com/small-appliances.html'),
    ('Toshiba', 'https://home.abenson.com/home-appliances/refrigerator.html'),
    ('Whirlpool', 'https://home.abenson.com/home-appliances/refrigerator.html')
)
insert into appliance_brands (name, source_url, source_checked_on)
select name, source_url, date '2026-07-10'
from seed
on conflict (name) do update set
  source_url = excluded.source_url,
  source_checked_on = excluded.source_checked_on,
  is_active = true;

with category_brand(category_key, brand_name, sort_order) as (
  values
    ('refrigerator', 'Condura', 10), ('refrigerator', 'Fujidenzo', 20), ('refrigerator', 'Haier', 30),
    ('refrigerator', 'LG', 40), ('refrigerator', 'Midea', 50), ('refrigerator', 'Panasonic', 60),
    ('refrigerator', 'Samsung', 70), ('refrigerator', 'Sharp', 80), ('refrigerator', 'Toshiba', 90),
    ('refrigerator', 'Whirlpool', 100),
    ('air_conditioner', 'Carrier', 10), ('air_conditioner', 'Condura', 20), ('air_conditioner', 'Daikin', 30),
    ('air_conditioner', 'Kolin', 40), ('air_conditioner', 'LG', 50), ('air_conditioner', 'Midea', 60),
    ('air_conditioner', 'Panasonic', 70), ('air_conditioner', 'Samsung', 80), ('air_conditioner', 'TCL', 90),
    ('television', 'Hisense', 10), ('television', 'LG', 20), ('television', 'Panasonic', 30),
    ('television', 'Samsung', 40), ('television', 'Sharp', 50), ('television', 'Sony', 60),
    ('television', 'TCL', 70), ('television', 'Toshiba', 80),
    ('microwave', 'Dowell', 10), ('microwave', 'Hanabishi', 20), ('microwave', 'Midea', 30),
    ('microwave', 'Panasonic', 40), ('microwave', 'Samsung', 50), ('microwave', 'Sharp', 60),
    ('microwave', 'Whirlpool', 70),
    ('induction_cooker', 'Dowell', 10), ('induction_cooker', 'Hanabishi', 20), ('induction_cooker', 'La Germania', 30),
    ('induction_cooker', 'Midea', 40), ('induction_cooker', 'Tecnogas', 50), ('induction_cooker', 'Tefal', 60),
    ('induction_cooker', 'Whirlpool', 70),
    ('rice_cooker', 'Dowell', 10), ('rice_cooker', 'Hanabishi', 20), ('rice_cooker', 'Kyowa', 30),
    ('rice_cooker', 'Panasonic', 40), ('rice_cooker', 'Sharp', 50), ('rice_cooker', 'Tefal', 60),
    ('rice_cooker', 'Tiger', 70),
    ('electric_kettle', 'Dowell', 10), ('electric_kettle', 'Hanabishi', 20), ('electric_kettle', 'Kyowa', 30),
    ('electric_kettle', 'Tefal', 40),
    ('washing_machine', 'Fujidenzo', 10), ('washing_machine', 'Haier', 20), ('washing_machine', 'LG', 30),
    ('washing_machine', 'Midea', 40), ('washing_machine', 'Panasonic', 50), ('washing_machine', 'Samsung', 60),
    ('washing_machine', 'Sharp', 70), ('washing_machine', 'Toshiba', 80), ('washing_machine', 'Whirlpool', 90),
    ('water_heater', 'Ariston', 10), ('water_heater', 'Caribbean', 20), ('water_heater', 'Midea', 30),
    ('water_heater', 'Panasonic', 40), ('water_heater', 'Sharp', 50), ('water_heater', 'Stiebel Eltron', 60),
    ('range_hood', 'La Germania', 10), ('range_hood', 'Midea', 20), ('range_hood', 'Tecnogas', 30),
    ('range_hood', 'Technik', 40),
    ('fan', 'Asahi', 10), ('fan', 'Dowell', 20), ('fan', 'Hanabishi', 30), ('fan', 'Kyowa', 40),
    ('air_fryer', 'Dowell', 10), ('air_fryer', 'Hanabishi', 20), ('air_fryer', 'Kyowa', 30), ('air_fryer', 'Tefal', 40),
    ('coffee_maker', 'Dowell', 10), ('coffee_maker', 'Hanabishi', 20), ('coffee_maker', 'Kyowa', 30), ('coffee_maker', 'Tefal', 40),
    ('water_dispenser', 'Caribbean', 10), ('water_dispenser', 'Dowell', 20), ('water_dispenser', 'Hanabishi', 30), ('water_dispenser', 'Midea', 40),
    ('others', 'Asahi', 10), ('others', 'Caribbean', 20), ('others', 'Condura', 30), ('others', 'Dowell', 40),
    ('others', 'Fujidenzo', 50), ('others', 'Haier', 60), ('others', 'Hanabishi', 70), ('others', 'Kyowa', 80),
    ('others', 'LG', 90), ('others', 'Midea', 100), ('others', 'Panasonic', 110), ('others', 'Samsung', 120),
    ('others', 'Sharp', 130), ('others', 'TCL', 140), ('others', 'Tefal', 150), ('others', 'Toshiba', 160),
    ('others', 'Whirlpool', 170)
)
insert into appliance_brand_categories (brand_id, category_key, sort_order)
select b.id, cb.category_key, cb.sort_order
from category_brand cb
join appliance_brands b on b.name = cb.brand_name
on conflict (brand_id, category_key) do update set sort_order = excluded.sort_order;
