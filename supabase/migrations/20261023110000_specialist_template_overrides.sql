-- A property specialist's own version of a follow-up email.
--
-- The owner runs this in Supabase -> SQL Editor AFTER
-- 20261022100000_leads_and_nurture.sql (it needs email_templates,
-- specialists, current_specialist_id(), is_staff() and set_updated_at()).
-- Idempotent: safe to run more than once.
--
--   * The owner's template stays the default. A specialist may write their
--     OWN subject + body for any CUSTOMER (audience = 'lead') template; it is
--     used only for that specialist's leads, picked at send time.
--   * Internal reminder templates (audience = 'specialist') can never have
--     an override (RLS below).
--   * The unsubscribe link, the "why you are receiving this" line and the
--     company details are added by the renderer (lib/nurture/render.ts), not
--     stored here, so an override can never remove or change them.
--   * Lengths are checked here as a backstop; the app validates first
--     (lib/nurture/override-validate.ts): subject <= 150, body <= 3000,
--     single-line subject, plain text, known merge fields only.
--   * Until this runs, the app treats every specialist as having no override.

create table if not exists specialist_template_overrides (
  specialist_id uuid not null references specialists (id) on delete cascade,
  template_id   uuid not null references email_templates (id) on delete cascade,
  subject       text not null
                  check (char_length(btrim(subject)) between 1 and 150
                         and subject !~ '[\r\n]'),
  body          text not null check (char_length(btrim(body)) between 1 and 3000),
  updated_at    timestamptz not null default now(),
  primary key (specialist_id, template_id)
);

create index if not exists specialist_template_overrides_template_idx
  on specialist_template_overrides (template_id);

drop trigger if exists specialist_template_overrides_updated_at on specialist_template_overrides;
create trigger specialist_template_overrides_updated_at before update on specialist_template_overrides
  for each row execute function set_updated_at();

-- ---------- grants ----------
-- Same pattern as the other follow-up tables: strip Supabase's default ALL
-- (TRUNCATE ignores RLS); anon gets nothing; authenticated gets plain DML
-- that RLS narrows; service_role (the sender) gets everything.
revoke all on specialist_template_overrides from public, anon, authenticated;
grant select, insert, update, delete on specialist_template_overrides to authenticated;
grant all on specialist_template_overrides to service_role;

-- ---------- Row Level Security ----------
alter table specialist_template_overrides enable row level security;

drop policy if exists "staff manage specialist template overrides" on specialist_template_overrides;
drop policy if exists "specialist reads own template overrides"    on specialist_template_overrides;
drop policy if exists "specialist inserts own template overrides"  on specialist_template_overrides;
drop policy if exists "specialist updates own template overrides"  on specialist_template_overrides;
drop policy if exists "specialist deletes own template overrides"  on specialist_template_overrides;

create policy "staff manage specialist template overrides" on specialist_template_overrides
  for all using (is_staff()) with check (is_staff());

-- Own rows only, and only for customer (lead-audience) templates.
create policy "specialist reads own template overrides" on specialist_template_overrides
  for select to authenticated using (
    specialist_id = (select current_specialist_id())
    and exists (select 1 from email_templates t
                 where t.id = specialist_template_overrides.template_id
                   and t.audience = 'lead')
  );
create policy "specialist inserts own template overrides" on specialist_template_overrides
  for insert to authenticated with check (
    specialist_id = (select current_specialist_id())
    and exists (select 1 from email_templates t
                 where t.id = specialist_template_overrides.template_id
                   and t.audience = 'lead'
                   and t.is_active)
  );
create policy "specialist updates own template overrides" on specialist_template_overrides
  for update to authenticated
  using (
    specialist_id = (select current_specialist_id())
    and exists (select 1 from email_templates t
                 where t.id = specialist_template_overrides.template_id
                   and t.audience = 'lead')
  )
  with check (
    specialist_id = (select current_specialist_id())
    and exists (select 1 from email_templates t
                 where t.id = specialist_template_overrides.template_id
                   and t.audience = 'lead'
                   and t.is_active)
  );
create policy "specialist deletes own template overrides" on specialist_template_overrides
  for delete to authenticated using (
    specialist_id = (select current_specialist_id())
    and exists (select 1 from email_templates t
                 where t.id = specialist_template_overrides.template_id
                   and t.audience = 'lead')
  );
