-- Specialist designation + accreditation type.
--
-- Run in Supabase -> SQL Editor AFTER 20261103100000_public_specialists_invoker.sql
-- (it re-issues the public_specialists view and anon column grants that
-- migration last defined). Idempotent: safe to run more than once.
--
--   designation    free-text job title shown on the public page (e.g. "Property
--                  Specialist", "Senior Property Consultant", "Marketing
--                  Partner"). NULL = the site's default wording, so every
--                  existing specialist looks exactly as before.
--   accreditation  'salesperson' (the default and what everyone had until now),
--                  'sales_partner' or 'marketing_partner'. Drives the line
--                  "Accredited real estate salesperson / sales partner /
--                  marketing partner".
--
-- Both are staff-only: guard_specialist_update() is re-issued below to lock
-- them, so a specialist cannot retitle or re-accredit themselves.

alter table specialists add column if not exists designation text;
alter table specialists add column if not exists accreditation text not null default 'salesperson';

alter table specialists drop constraint if exists specialists_designation_len;
alter table specialists add constraint specialists_designation_len
  check (designation is null or char_length(designation) <= 60);

alter table specialists drop constraint if exists specialists_accreditation_check;
alter table specialists add constraint specialists_accreditation_check
  check (accreditation in ('salesperson', 'sales_partner', 'marketing_partner'));

-- ---------- guard: only staff may change designation / accreditation ----------
-- Re-issued in full from 20261021100000_specialist_visibility.sql; the only
-- change is adding the two columns to the staff-only list.
create or replace function guard_specialist_update()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if current_user not in ('anon', 'authenticated') or is_staff() then
    return new;
  end if;

  if new.id            is distinct from old.id
  or new.status        is distinct from old.status
  or new.subdomain     is distinct from old.subdomain
  or new.auth_user_id  is distinct from old.auth_user_id
  or new.email         is distinct from old.email
  or new.is_visible    is distinct from old.is_visible
  or new.designation   is distinct from old.designation
  or new.accreditation is distinct from old.accreditation then
    raise exception 'Only staff can change a specialist''s status, subdomain, email, account link, website visibility, designation or accreditation'
      using errcode = '42501';
  end if;

  if old.status <> 'pending'
     and (new.license_mode   is distinct from old.license_mode
       or new.license_no     is distinct from old.license_no
       or new.license_expiry is distinct from old.license_expiry) then
    raise exception 'Licence details can only be changed by All Abode.'
      using errcode = '42501';
  end if;

  new.created_at := old.created_at;
  return new;
end $$;

-- ---------- public_specialists: append designation + accreditation ----------
-- Same columns (same order), filter and grants as 20261023120000; the two new
-- columns go at the END so `create or replace view` is allowed. The view runs
-- as the caller (security_invoker, per 20261103100000), so anon needs a column
-- grant on each new column too.
create or replace view public_specialists
  with (security_invoker = true) as
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
    public_email,
    hide_call_link,
    designation,
    accreditation
  from specialists
  where status = 'approved' and subdomain is not null and is_visible;

revoke all on public_specialists from public, anon, authenticated;
grant select on public_specialists to anon, authenticated;

grant select (designation, accreditation) on specialists to anon;

-- Checks afterwards (SQL editor, each as its own query):
--   select designation, accreditation from specialists limit 5;      -- NULL / 'salesperson' for everyone
--   begin; set local role anon;
--     select slug, designation, accreditation from public_specialists;
--   rollback;
