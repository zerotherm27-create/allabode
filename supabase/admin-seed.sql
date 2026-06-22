-- Grant admin access + set up listing-photo storage.
-- Run AFTER you create the auth user in the Supabase dashboard
-- (Authentication → Users → Add user → email + password).

-- 1) Promote that auth user to staff/admin (edit the email below).
insert into public.users (id, name, email, role)
select id, 'Admin', email, 'admin'
from auth.users
where email = 'REPLACE_WITH_ADMIN_EMAIL'
on conflict (id) do update set role = 'admin';

-- 2) Public storage bucket for listing photos.
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

-- 3) Storage policies: anyone can view; only staff can upload/delete.
drop policy if exists "public reads listing photos" on storage.objects;
create policy "public reads listing photos"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

drop policy if exists "staff manage listing photos" on storage.objects;
create policy "staff manage listing photos"
  on storage.objects for all
  using (bucket_id = 'listing-photos' and public.is_staff())
  with check (bucket_id = 'listing-photos' and public.is_staff());
