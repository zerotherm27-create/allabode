-- Specialist option: "Don't show a call link on my page".
--
-- Run in Supabase -> SQL Editor AFTER 20261023100000_specialist_public_contact.sql
-- (it re-creates the public_specialists view that migration last defined).
-- Idempotent: safe to run more than once.
--
-- When true, the specialist's microsite Contact section shows no "Call me"
-- row at all (neither their own number nor the company number). Visitors can
-- still use the contact form, email and the other links. Default false, so
-- nothing changes for anyone until they tick the box.
--
-- guard_specialist_update() is NOT re-issued: it locks only id, status,
-- subdomain, auth_user_id, email, is_visible (and licence fields once out of
-- 'pending'), so a specialist can edit this column through the existing
-- "update own row" policy.

alter table specialists add column if not exists hide_call_link boolean not null default false;

-- ---------- public_specialists: append hide_call_link ----------
-- Same columns (same order), filter, security and grants as
-- 20261023100000_specialist_public_contact.sql; the new column is appended at
-- the END, so `create or replace view` is allowed and dependants are untouched.
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
    public_email,
    hide_call_link
  from specialists
  where status = 'approved' and subdomain is not null and is_visible;

revoke all on public_specialists from public, anon, authenticated;
grant select on public_specialists to anon, authenticated;
