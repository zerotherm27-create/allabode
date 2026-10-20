-- Specialist website visibility (staff-only "Hide from website" switch).
--
-- Run in Supabase -> SQL Editor AFTER 20261020100000_specialists.sql (it needs
-- the specialists table, the guard trigger and the public_specialists view).
-- Idempotent: safe to run more than once.
--
-- A hidden specialist (is_visible = false) disappears from every public
-- surface (the /team directory, their profile and <name>.allabodeph.com, the
-- sitemap and the "Listed by" line on their listings, which then show as house
-- listings) because all of those read the public_specialists view. Unlike
-- Suspend, a hidden specialist keeps their login, can edit their profile and
-- manage/submit listings, and nothing is deleted. Default is visible, so every
-- existing row is unchanged.

alter table specialists add column if not exists is_visible boolean not null default true;

-- ---------- guard: only staff may change is_visible ----------
-- Re-issued in full (create or replace) from 20261020100000_specialists.sql;
-- the only change is adding is_visible to the staff-only columns. Staff and
-- definer contexts are exempt exactly as before.
create or replace function guard_specialist_update()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if current_user not in ('anon', 'authenticated') or is_staff() then
    return new;
  end if;

  if new.id           is distinct from old.id
  or new.status       is distinct from old.status
  or new.subdomain    is distinct from old.subdomain
  or new.auth_user_id is distinct from old.auth_user_id
  or new.email        is distinct from old.email
  or new.is_visible   is distinct from old.is_visible then
    raise exception 'Only staff can change a specialist''s status, subdomain, email, account link or website visibility'
      using errcode = '42501';
  end if;

  -- The licence columns are records only: the site shows every specialist
  -- with the fixed label "Accredited real estate salesperson" and never a
  -- broker name or licence number. Once a row has left 'pending' (approved,
  -- rejected or suspended), only staff may change them.
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

-- ---------- public_specialists: also require is_visible ----------
-- Same columns, security and grants as before; only the filter gains
-- `and is_visible`. Dropped and recreated so a re-run lands on this definition.
drop view if exists public_specialists;
create view public_specialists
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
    photo_path
  from specialists
  where status = 'approved' and subdomain is not null and is_visible;

revoke all on public_specialists from public, anon, authenticated;
grant select on public_specialists to anon, authenticated;
