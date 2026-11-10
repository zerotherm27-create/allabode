-- Clears the Supabase Security Advisor error "Security Definer View" on
-- public.public_specialists.
--
-- Until now the view ran with its owner's rights (security_invoker = false) so
-- anon could read live specialists without any access to the specialists
-- table. This switches it to the caller's rights and moves the same boundary
-- onto the table itself, with no wider exposure than before:
--   * row rule  - anon can see only approved, visible specialists with a subdomain
--   * column rule - anon can read only the public columns the view already
--     exposed (plus status/is_visible, which the view's WHERE clause needs).
--     email, phone, auth_user_id and the licence columns stay unreadable.
-- Only the plain anon client reads the view (lib/team/public-queries.ts,
-- lib/listings.ts), so authenticated users get no new access: they still see
-- just their own row, and staff everything, exactly as before.
--
-- Run in Supabase -> SQL Editor. Idempotent: safe to run more than once.
-- If you ever add a column to public_specialists, add it to the grant below.
--
-- Roll back with:  alter view public_specialists set (security_invoker = false);

begin;

-- Start from nothing: a table-level SELECT would make the column list below
-- meaningless (anon could read every column), and revoking it also clears any
-- stray column grants. Supabase's default grants can leave anon with it.
revoke all on specialists from anon;

grant select (
  id, subdomain, display_name, tagline, bio, areas, specialties, languages,
  years_experience, photo_path,
  public_phone, public_viber, public_facebook_url, public_linkedin_url, public_email,
  hide_call_link,
  status, is_visible
) on specialists to anon;

drop policy if exists "public reads live specialists" on specialists;
create policy "public reads live specialists" on specialists
  for select to anon
  using (status = 'approved' and subdomain is not null and is_visible);

alter view public_specialists set (security_invoker = true);

commit;

-- Checks to run afterwards (SQL editor, each as its own query):
--   select column_name from information_schema.column_privileges
--     where grantee = 'anon' and table_name = 'specialists' and privilege_type = 'SELECT'
--     order by 1;                       -- exactly the 18 granted columns, no email/phone/auth_user_id/license_*
--   begin; set local role anon;
--     select slug, display_name from public_specialists;   -- live specialists only
--     select email from specialists;                       -- must fail: permission denied
--   rollback;
