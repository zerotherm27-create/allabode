-- Specialist public contact details (opt-in, shown on their microsite).
--
-- Run in Supabase -> SQL Editor AFTER 20261021100000_specialist_visibility.sql
-- (it needs the specialists table, the guard trigger and the
-- public_specialists view). Idempotent: safe to run more than once.
--
-- A property specialist may publish their own mobile, Viber, Facebook link,
-- LinkedIn link and public email. Each one they fill replaces the company
-- value for that row of their microsite Contact section; blank falls back to
-- the company details from Admin Settings. All five are null by default, so
-- nothing becomes public until the specialist fills it in.
--
-- These are NEW columns: the login `email` and the private `phone` column are
-- unchanged and stay out of the view. Lead routing is unchanged.
--
-- guard_specialist_update() is NOT re-issued: it locks only id, status,
-- subdomain, auth_user_id, email, is_visible (and licence fields once out of
-- 'pending'), so a specialist can edit these five through the existing
-- "update own row" policy while every staff-only field stays locked.

alter table specialists add column if not exists public_phone        text;
alter table specialists add column if not exists public_viber        text;
alter table specialists add column if not exists public_facebook_url text;
alter table specialists add column if not exists public_linkedin_url text;
alter table specialists add column if not exists public_email        text;

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'specialists_public_phone_len'
                    and conrelid = 'public.specialists'::regclass) then
    alter table specialists add constraint specialists_public_phone_len
      check (public_phone is null or char_length(public_phone) <= 200);
  end if;
  if not exists (select 1 from pg_constraint
                  where conname = 'specialists_public_viber_len'
                    and conrelid = 'public.specialists'::regclass) then
    alter table specialists add constraint specialists_public_viber_len
      check (public_viber is null or char_length(public_viber) <= 200);
  end if;
  if not exists (select 1 from pg_constraint
                  where conname = 'specialists_public_facebook_url_len'
                    and conrelid = 'public.specialists'::regclass) then
    alter table specialists add constraint specialists_public_facebook_url_len
      check (public_facebook_url is null or char_length(public_facebook_url) <= 300);
  end if;
  if not exists (select 1 from pg_constraint
                  where conname = 'specialists_public_linkedin_url_len'
                    and conrelid = 'public.specialists'::regclass) then
    alter table specialists add constraint specialists_public_linkedin_url_len
      check (public_linkedin_url is null or char_length(public_linkedin_url) <= 300);
  end if;
  if not exists (select 1 from pg_constraint
                  where conname = 'specialists_public_email_len'
                    and conrelid = 'public.specialists'::regclass) then
    alter table specialists add constraint specialists_public_email_len
      check (public_email is null or char_length(public_email) <= 200);
  end if;
end $$;

-- ---------- public_specialists: append the five public contact columns ----------
-- Same columns (in the same order), filter, security and grants as
-- 20261021100000_specialist_visibility.sql; the new columns are appended at
-- the END, so `create or replace view` is allowed and dependants (such as
-- create_specialist_inquiry()) are untouched. No email, phone, auth id or
-- licence column is exposed.
create or replace view public_specialists
  with (security_invoker = false) as
  select
    id,
    subdomain as slug,
    display_name,
    tagline,
    bio,
    areas,
    specialties,
    languages,
    years_experience,
    photo_path,
    public_phone,
    public_viber,
    public_facebook_url,
    public_linkedin_url,
    public_email
  from specialists
  where status = 'approved' and subdomain is not null and is_visible;

revoke all on public_specialists from public, anon, authenticated;
grant select on public_specialists to anon, authenticated;
