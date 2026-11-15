-- Specialist microsite layout choice.
--
-- Run in Supabase -> SQL Editor AFTER 20261113100000_specialist_designation_accreditation.sql
-- (it re-issues the public_specialists view that migration last defined).
-- Idempotent: safe to run more than once.
--
--   layout  'signature' (the default, so every existing specialist gets the
--           new default page), 'editorial' or 'listings'. Chosen by the
--           specialist on their Profile page; it only changes the hero and the
--           order of the sections on their public page.
--
-- guard_specialist_update() is deliberately NOT changed: the specialist may
-- set this column themselves (it rides the same own-row UPDATE policy as
-- tagline and bio).

alter table specialists add column if not exists layout text not null default 'signature';

alter table specialists drop constraint if exists specialists_layout_check;
alter table specialists add constraint specialists_layout_check
  check (layout in ('editorial', 'signature', 'listings'));

-- ---------- public_specialists: append layout ----------
-- Same columns (same order), filter and grants as 20261113100000; the new
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
    layout
  from specialists
  where status = 'approved' and subdomain is not null and is_visible;

revoke all on public_specialists from public, anon, authenticated;
grant select on public_specialists to anon, authenticated;

grant select (layout) on specialists to anon;

-- Already ran the earlier version of this file (default 'editorial')? Run this
-- once as well (nobody can have picked a layout yet):
--   alter table specialists alter column layout set default 'signature';
--   update specialists set layout = 'signature' where layout = 'editorial';

-- Checks afterwards (SQL editor, each as its own query):
--   select layout from specialists limit 5;                 -- 'signature' for everyone
--   begin; set local role anon;
--     select slug, layout from public_specialists;
--   rollback;
