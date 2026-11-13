-- Let a specialist publish (or unpublish) their own page.
--
-- Run in Supabase -> SQL Editor. Idempotent: safe to run more than once.
--
-- New specialists are now added HIDDEN (specialists.is_visible = false), so they
-- are not on the /team page, have no public profile or web address, and their
-- listings show as house listings until the page is published. The owner
-- publishes with the existing "Show on website" button; the specialist
-- publishes from their dashboard through this function. is_visible stays
-- locked by guard_specialist_update(); this SECURITY DEFINER function is the
-- one narrow door, and it only ever touches the caller's own approved row.
-- Existing specialists are unchanged (they stay visible).

create or replace function set_my_specialist_visibility(p_visible boolean)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
begin
  v_id := current_specialist_id();   -- the caller's own approved row, or null
  if v_id is null then
    raise exception 'Only an approved property specialist can publish their page' using errcode = '42501';
  end if;
  update specialists set is_visible = coalesce(p_visible, false) where id = v_id;
  return coalesce(p_visible, false);
end $$;

revoke all on function set_my_specialist_visibility(boolean) from public, anon;
grant execute on function set_my_specialist_visibility(boolean) to authenticated;
