-- Specialist About headline.
--
-- Run in Supabase -> SQL Editor AFTER 20261115100000_specialist_layout.sql
-- (it re-issues the public_specialists view that migration last defined).
-- Idempotent: safe to run more than once.
--
--   bio_headline  the heading above the About text on the specialist's public
--                 page (up to 80 characters). NULL = the site's default
--                 heading, so every existing page looks exactly as before.
--
-- guard_specialist_update() is deliberately NOT changed: the specialist edits
-- this themselves (same own-row UPDATE policy as tagline and bio).

alter table specialists add column if not exists bio_headline text;

alter table specialists drop constraint if exists specialists_bio_headline_len;
alter table specialists add constraint specialists_bio_headline_len
  check (bio_headline is null or char_length(bio_headline) <= 80);

-- ---------- public_specialists: append bio_headline ----------
-- Same columns (same order), filter and grants as 20261115100000; the new
-- column goes at the END so `create or replace view` is allowed. The view runs
-- as the caller (security_invoker), so anon needs a column grant on it too.
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
    accreditation,
    layout,
    bio_headline
  from specialists
  where status = 'approved' and subdomain is not null and is_visible;

revoke all on public_specialists from public, anon, authenticated;
grant select on public_specialists to anon, authenticated;

grant select (bio_headline) on specialists to anon;

-- Checks afterwards (SQL editor, each as its own query):
--   select bio_headline from specialists limit 5;           -- NULL for everyone
--   begin; set local role anon;
--     select slug, layout, bio_headline from public_specialists;
--   rollback;
