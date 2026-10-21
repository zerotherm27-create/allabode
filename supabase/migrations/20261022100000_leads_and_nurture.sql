-- Lead assignment, pipeline stages, follow-up consent and the follow-up email
-- tables (Phase 3).
--
-- Run in Supabase -> SQL Editor AFTER 20261021100000_specialist_visibility.sql
-- (it needs specialists, current_specialist_id(), is_specialist() and the
-- public_specialists view) and 0009_automation.sql. Idempotent: safe to run
-- more than once. The backfills run ONLY on the run that first adds their
-- column, so a re-run can never re-tag a lead or overwrite a stage a
-- specialist has since changed.
--
--   * inquiries gains specialist_id (who the lead belongs to), lead_stage
--     (the specialist-facing pipeline), consent_followup/consent_at (the
--     visitor's opt-in to follow-up emails), unsubscribed_at and unsub_token
--     (the secret in the unsubscribe link).
--   * Public visitors (anon/authenticated, not staff) still insert straight
--     into inquiries, but a trigger forces every privileged column (incl.
--     follow-up consent), so a direct insert can NEVER tag a specialist or
--     opt anyone in to emails. Specialist-owned / consenting leads are only
--     written by create_specialist_inquiry() and create_listing_inquiry(),
--     which are service_role-only: /api/leads calls them after its origin,
--     Turnstile and rate-limit checks.
--   * Moving a lead to Viewing/Negotiating/Closed/Lost, or unsubscribing it,
--     skips its queued follow-ups (trigger stop_lead_followups).
--   * An approved specialist reads only their own leads and may change only
--     lead_stage and internal_notes (trigger guard_inquiry_update).
--   * email_templates / specialist_email_settings / specialist_template_prefs
--     / lead_email_sends / email_suppressions hold the follow-up sequence.
--   * unsubscribe_lead(token) is the public unsubscribe.
--   * suspend_specialist() and deleting a specialist also release their leads
--     and skip their queued follow-ups.
--
-- No templates are seeded here.

-- ========================================================================
-- inquiries: new columns (+ one-shot backfills)
-- ========================================================================
do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'inquiries'
                    and column_name = 'specialist_id') then
    alter table public.inquiries
      add column specialist_id uuid references public.specialists (id) on delete set null;

    -- Leads sent from a specialist page before this migration carried the
    -- server-verified slug in details (lib/leads/specialist-lead.ts). Only
    -- currently approved specialists are matched (a suspended specialist's
    -- leads stay with the house, as suspend_specialist() now does). The
    -- updated_at trigger is paused so the backfill does not look like an edit.
    alter table public.inquiries disable trigger inquiries_updated_at;
    update public.inquiries i
       set specialist_id = s.id
      from public.specialists s
     where i.type = 'inquiry'
       and i.details ->> 'source' = 'specialist-page'
       and i.details ->> 'specialistSlug' = s.subdomain
       and s.status = 'approved';
    alter table public.inquiries enable trigger inquiries_updated_at;
  end if;

  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'inquiries'
                    and column_name = 'lead_stage') then
    alter table public.inquiries
      add column lead_stage text not null default 'New'
        check (lead_stage in ('New', 'Contacted', 'Viewing', 'Negotiating', 'Closed', 'Lost'));

    alter table public.inquiries disable trigger inquiries_updated_at;
    update public.inquiries
       set lead_stage = case status::text
                          when 'Closed'      then 'Closed'
                          when 'Spam'        then 'Lost'
                          when 'Contacted'   then 'Contacted'
                          when 'Scheduled'   then 'Viewing'
                          when 'In progress' then 'Negotiating'
                          else 'New'
                        end
     where status::text <> 'New';
    alter table public.inquiries enable trigger inquiries_updated_at;
  end if;
end $$;

alter table inquiries add column if not exists consent_followup boolean not null default false;
alter table inquiries add column if not exists consent_at       timestamptz;
alter table inquiries add column if not exists unsubscribed_at  timestamptz;
-- Volatile default: every existing row gets its own token when the column is added.
alter table inquiries add column if not exists unsub_token      uuid not null default gen_random_uuid();
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'inquiries_unsub_token_key'
                    and conrelid = 'public.inquiries'::regclass) then
    alter table public.inquiries add constraint inquiries_unsub_token_key unique (unsub_token);
  end if;
end $$;

create index if not exists inquiries_specialist_idx  on inquiries (specialist_id);
create index if not exists inquiries_email_lower_idx on inquiries (lower(email));

-- ========================================================================
-- inquiries: guards
-- ========================================================================
-- INSERT by anyone who is not staff (public forms post as anon through
-- PostgREST under the "anyone submits inquiry" with check (true) policy).
-- Assignment, stage, unsubscribe state, the unsubscribe token, follow-up
-- consent and the timestamps are never the caller's to choose: consent is
-- only recorded by the service-role intake functions (after the app's bot and
-- rate-limit checks), staff, or the server. Staff and server/definer contexts
-- (service_role, and create_*_inquiry running as the function owner) are
-- exempt, like the other guards.
create or replace function guard_inquiry_insert()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if current_user not in ('anon', 'authenticated') or is_staff() then
    return new;
  end if;

  new.specialist_id    := null;
  new.lead_stage       := 'New';
  new.unsubscribed_at  := null;
  new.unsub_token      := gen_random_uuid();
  new.consent_followup := false;
  new.consent_at       := null;
  -- Follow-up timing is computed from these; no back- or forward-dating.
  new.created_at       := now();
  new.updated_at       := now();
  return new;
end $$;

revoke execute on function guard_inquiry_insert() from public, anon, authenticated;

drop trigger if exists inquiries_guard_insert on inquiries;
create trigger inquiries_guard_insert before insert on inquiries
  for each row execute function guard_inquiry_insert();

-- UPDATE by anyone who is not staff (in practice: a specialist on their own
-- lead, the only non-staff UPDATE policy). Default-deny: the whole row is
-- compared except lead_stage, internal_notes and updated_at (which the
-- updated_at trigger sets anyway), so any column added later is locked too.
-- Fires before inquiries_updated_at (trigger names run alphabetically).
create or replace function guard_inquiry_update()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if current_user not in ('anon', 'authenticated') or is_staff() then
    return new;
  end if;

  if (to_jsonb(new) - 'lead_stage' - 'internal_notes' - 'updated_at')
     is distinct from
     (to_jsonb(old) - 'lead_stage' - 'internal_notes' - 'updated_at') then
    raise exception 'Only the lead stage and notes can be changed'
      using errcode = '42501';
  end if;

  if new.internal_notes is distinct from old.internal_notes
     and char_length(new.internal_notes) > 5000 then
    raise exception 'Notes are limited to 5000 characters'
      using errcode = '22001';
  end if;

  return new;
end $$;

revoke execute on function guard_inquiry_update() from public, anon, authenticated;

drop trigger if exists inquiries_guard_update on inquiries;
create trigger inquiries_guard_update before update on inquiries
  for each row execute function guard_inquiry_update();

-- ========================================================================
-- inquiries: specialist access (staff + public insert policies unchanged)
-- ========================================================================
-- Own leads only: unassigned leads (specialist_id null) and other
-- specialists' leads never match. No INSERT/DELETE policy for specialists
-- (an insert they make as a visitor is forced untagged by the guard above).
drop policy if exists "specialist reads own inquiries"   on inquiries;
drop policy if exists "specialist updates own inquiries" on inquiries;

create policy "specialist reads own inquiries" on inquiries
  for select to authenticated
  using (specialist_id = (select current_specialist_id()));
create policy "specialist updates own inquiries" on inquiries
  for update to authenticated
  using      (specialist_id = (select current_specialist_id()))
  with check (specialist_id = (select current_specialist_id()));

-- ========================================================================
-- Follow-up email tables
-- ========================================================================
create table if not exists email_templates (
  id           uuid primary key default gen_random_uuid(),
  template_key text not null unique
                 check (template_key ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  name         text not null check (char_length(name) between 1 and 120),
  subject      text not null check (char_length(subject) between 1 and 200),
  body         text not null check (char_length(body) <= 20000),
  delay_days   int  not null check (delay_days between 0 and 365),
  position     int  not null default 0,
  is_active    boolean not null default true,
  audience     text not null default 'lead' check (audience in ('lead', 'specialist')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists specialist_email_settings (
  specialist_id     uuid primary key references specialists (id) on delete cascade,
  personal_note     text check (personal_note is null or char_length(personal_note) <= 400),
  followups_enabled boolean not null default true,
  updated_at        timestamptz not null default now()
);

create table if not exists specialist_template_prefs (
  specialist_id uuid not null references specialists (id) on delete cascade,
  template_id   uuid not null references email_templates (id) on delete cascade,
  enabled       boolean not null,
  primary key (specialist_id, template_id)
);

-- template_id has no ON DELETE action on purpose (restrict): a template that
-- has been used keeps its send history. The admin UI must DEACTIVATE
-- (is_active = false) a used template, never delete it.
create table if not exists lead_email_sends (
  id                  uuid primary key default gen_random_uuid(),
  inquiry_id          uuid not null references inquiries (id) on delete cascade,
  template_id         uuid not null references email_templates (id),
  specialist_id       uuid references specialists (id) on delete set null,
  due_at              timestamptz not null,
  status              text not null default 'queued'
                        check (status in ('queued', 'sent', 'skipped', 'failed')),
  skip_reason         text check (skip_reason is null or char_length(skip_reason) <= 100),
  attempts            int  not null default 0 check (attempts >= 0),
  sent_at             timestamptz,
  provider_message_id text check (provider_message_id is null or char_length(provider_message_id) <= 200),
  last_error          text check (last_error is null or char_length(last_error) <= 500),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- Each template goes to a lead at most once, whatever retries/races happen.
  unique (inquiry_id, template_id)
);
create index if not exists lead_email_sends_status_due_idx on lead_email_sends (status, due_at);
create index if not exists lead_email_sends_specialist_idx on lead_email_sends (specialist_id);
create index if not exists lead_email_sends_template_idx   on lead_email_sends (template_id);

-- Global do-not-email list (unsubscribes, hard bounces). Staff only.
create table if not exists email_suppressions (
  email_lower text primary key check (email_lower = lower(email_lower) and char_length(email_lower) <= 254),
  reason      text check (reason is null or char_length(reason) <= 100),
  created_at  timestamptz not null default now()
);

drop trigger if exists email_templates_updated_at on email_templates;
create trigger email_templates_updated_at before update on email_templates
  for each row execute function set_updated_at();
drop trigger if exists specialist_email_settings_updated_at on specialist_email_settings;
create trigger specialist_email_settings_updated_at before update on specialist_email_settings
  for each row execute function set_updated_at();
drop trigger if exists lead_email_sends_updated_at on lead_email_sends;
create trigger lead_email_sends_updated_at before update on lead_email_sends
  for each row execute function set_updated_at();

-- ---------- grants ----------
-- Supabase's default privileges grant ALL (incl. TRUNCATE, which ignores RLS)
-- to anon/authenticated on new tables. Strip that: anon gets nothing; the
-- authenticated role gets plain DML that RLS then narrows; the server
-- (service_role) gets everything.
revoke all on email_templates, specialist_email_settings, specialist_template_prefs,
              lead_email_sends, email_suppressions
  from public, anon, authenticated;
grant select, insert, update, delete
   on email_templates, specialist_email_settings, specialist_template_prefs,
      lead_email_sends, email_suppressions
   to authenticated;
grant all
   on email_templates, specialist_email_settings, specialist_template_prefs,
      lead_email_sends, email_suppressions
   to service_role;

-- ---------- Row Level Security ----------
alter table email_templates           enable row level security;
alter table specialist_email_settings enable row level security;
alter table specialist_template_prefs enable row level security;
alter table lead_email_sends          enable row level security;
alter table email_suppressions        enable row level security;

drop policy if exists "staff manage email templates"       on email_templates;
drop policy if exists "specialist reads email templates"   on email_templates;
create policy "staff manage email templates" on email_templates
  for all using (is_staff()) with check (is_staff());
create policy "specialist reads email templates" on email_templates
  for select to authenticated using ((select current_specialist_id()) is not null);

drop policy if exists "staff manage specialist email settings"  on specialist_email_settings;
drop policy if exists "specialist reads own email settings"     on specialist_email_settings;
drop policy if exists "specialist inserts own email settings"   on specialist_email_settings;
drop policy if exists "specialist updates own email settings"   on specialist_email_settings;
create policy "staff manage specialist email settings" on specialist_email_settings
  for all using (is_staff()) with check (is_staff());
create policy "specialist reads own email settings" on specialist_email_settings
  for select to authenticated using (specialist_id = (select current_specialist_id()));
create policy "specialist inserts own email settings" on specialist_email_settings
  for insert to authenticated with check (specialist_id = (select current_specialist_id()));
create policy "specialist updates own email settings" on specialist_email_settings
  for update to authenticated
  using      (specialist_id = (select current_specialist_id()))
  with check (specialist_id = (select current_specialist_id()));

drop policy if exists "staff manage specialist template prefs" on specialist_template_prefs;
drop policy if exists "specialist reads own template prefs"    on specialist_template_prefs;
drop policy if exists "specialist inserts own template prefs"  on specialist_template_prefs;
drop policy if exists "specialist updates own template prefs"  on specialist_template_prefs;
drop policy if exists "specialist deletes own template prefs"  on specialist_template_prefs;
create policy "staff manage specialist template prefs" on specialist_template_prefs
  for all using (is_staff()) with check (is_staff());
create policy "specialist reads own template prefs" on specialist_template_prefs
  for select to authenticated using (specialist_id = (select current_specialist_id()));
create policy "specialist inserts own template prefs" on specialist_template_prefs
  for insert to authenticated with check (specialist_id = (select current_specialist_id()));
create policy "specialist updates own template prefs" on specialist_template_prefs
  for update to authenticated
  using      (specialist_id = (select current_specialist_id()))
  with check (specialist_id = (select current_specialist_id()));
create policy "specialist deletes own template prefs" on specialist_template_prefs
  for delete to authenticated using (specialist_id = (select current_specialist_id()));

drop policy if exists "staff manage lead email sends"   on lead_email_sends;
drop policy if exists "specialist reads own lead email sends" on lead_email_sends;
create policy "staff manage lead email sends" on lead_email_sends
  for all using (is_staff()) with check (is_staff());
-- Keyed on the lead's CURRENT owner (not the specialist recorded on the
-- send), so a reassigned lead's history moves with it.
create policy "specialist reads own lead email sends" on lead_email_sends
  for select to authenticated using (
    exists (select 1 from inquiries i
             where i.id = lead_email_sends.inquiry_id
               and i.specialist_id = (select current_specialist_id()))
  );

drop policy if exists "staff manage email suppressions" on email_suppressions;
create policy "staff manage email suppressions" on email_suppressions
  for all using (is_staff()) with check (is_staff());

-- ========================================================================
-- Public lead intake that may assign a specialist
-- ========================================================================
-- Shared input checks for the two functions below (same limits as
-- lib/leads/validate.ts). Raises 22023 with a visitor-safe message.
create or replace function _check_inquiry_input(
  p_name text, p_email text, p_phone text, p_message text, p_details jsonb
) returns void language plpgsql immutable set search_path = public, pg_temp as $$
begin
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 120 then
    raise exception 'A valid name is required.' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_email, ''))) > 254
     or btrim(coalesce(p_email, '')) !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'A valid email is required.' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_phone, ''))) not between 1 and 30 then
    raise exception 'A valid phone number is required.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_message, '')) > 4000 then
    raise exception 'The message is too long.' using errcode = '22023';
  end if;
  if p_details is not null
     and (jsonb_typeof(p_details) <> 'object' or octet_length(p_details::text) > 4000) then
    raise exception 'Invalid details.' using errcode = '22023';
  end if;
end $$;

revoke execute on function _check_inquiry_input(text, text, text, text, jsonb)
  from public, anon, authenticated;

-- Both intake functions are service_role-only (see grants): /api/leads
-- calls them with the service-role client after its own checks.
--
-- Microsite contact form. The specialist is resolved from the slug through
-- public_specialists — the exact rule the public directory uses (approved,
-- has a subdomain, visible). Hidden, suspended, pending and unknown slugs all
-- take the same single lookup and return NULL with nothing inserted, so the
-- caller learns only "listed or not", which /team already publishes; the app
-- then falls back to an ordinary untagged insert so the message is kept.
-- p_listing_id is kept only when that listing is publicly live AND owned by
-- this specialist; otherwise the lead is stored without a listing link.
-- Invalid input raises 22023.
create or replace function create_specialist_inquiry(
  p_specialist_slug  text,
  p_name             text,
  p_email            text,
  p_phone            text,
  p_message          text,
  p_listing_id       uuid    default null,
  p_consent_followup boolean default false,
  p_details          jsonb   default '{}'::jsonb
) returns uuid language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_spec    record;
  v_listing uuid;
  v_id      uuid;
  v_consent boolean := coalesce(p_consent_followup, false);
begin
  perform _check_inquiry_input(p_name, p_email, p_phone, p_message, p_details);

  select id, slug, display_name into v_spec
    from public_specialists
   where slug = p_specialist_slug;
  if not found then
    return null;
  end if;

  if p_listing_id is not null then
    select l.id into v_listing
      from listings l
     where l.id = p_listing_id
       and l.specialist_id = v_spec.id
       and l.status not in ('Draft', 'Archived')
       and l.approval_status = 'approved';
  end if;

  insert into inquiries (type, listing_id, name, email, phone, message, details,
                         specialist_id, consent_followup, consent_at)
  values ('inquiry', v_listing, btrim(p_name), btrim(p_email), btrim(p_phone),
          nullif(btrim(coalesce(p_message, '')), ''),
          (coalesce(p_details, '{}'::jsonb) - 'source' - 'specialistSlug' - 'specialistName')
            || jsonb_build_object('source', 'specialist-page',
                                  'specialistSlug', v_spec.slug,
                                  'specialistName', v_spec.display_name),
          v_spec.id, v_consent, case when v_consent then now() end)
  returning id into v_id;

  return v_id;
end $$;

revoke execute on function create_specialist_inquiry(text, text, text, text, text, uuid, boolean, jsonb)
  from public, anon, authenticated;
grant  execute on function create_specialist_inquiry(text, text, text, text, text, uuid, boolean, jsonb)
  to service_role;

-- Listing page inquiry / viewing request. The listing must be publicly live
-- (same rule as the "public reads live listings" policy); the lead is
-- assigned to the listing's owner when that owner is an approved specialist,
-- and stays a house lead otherwise. A HIDDEN (is_visible = false) but
-- approved specialist still gets leads on their own listings (owner ruling),
-- even though the public page shows the listing as a house listing;
-- create_specialist_inquiry, by contrast, treats a hidden slug as not found.
-- The caller never names a specialist, so
-- no one can attach a lead to a specialist through a listing they don't own.
-- A listing that is not live returns NULL with nothing inserted (the caller
-- learns only what the public listings already show); the app then falls back
-- to an ordinary untagged insert. Invalid input raises 22023.
create or replace function create_listing_inquiry(
  p_listing_id               uuid,
  p_name                     text,
  p_email                    text,
  p_phone                    text,
  p_message                  text,
  p_consent_followup         boolean default false,
  p_details                  jsonb   default '{}'::jsonb,
  p_type                     text    default 'inquiry',
  p_preferred_viewing_date   date    default null,
  p_preferred_contact_method text    default null
) returns uuid language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_listing record;
  v_id      uuid;
  v_consent boolean := coalesce(p_consent_followup, false);
begin
  perform _check_inquiry_input(p_name, p_email, p_phone, p_message, p_details);
  if coalesce(p_type, '') not in ('inquiry', 'viewing') then
    raise exception 'Invalid inquiry type.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_preferred_contact_method, '')) > 40 then
    raise exception 'Invalid contact method.' using errcode = '22023';
  end if;

  select l.id, s.id as specialist_id into v_listing
    from listings l
    left join specialists s on s.id = l.specialist_id and s.status = 'approved'
   where l.id = p_listing_id
     and l.status not in ('Draft', 'Archived')
     and l.approval_status = 'approved';
  if not found then
    return null;
  end if;

  insert into inquiries (type, listing_id, name, email, phone, message, details,
                         preferred_viewing_date, preferred_contact_method,
                         specialist_id, consent_followup, consent_at)
  values (p_type::inquiry_type, v_listing.id, btrim(p_name), btrim(p_email), btrim(p_phone),
          nullif(btrim(coalesce(p_message, '')), ''),
          coalesce(p_details, '{}'::jsonb) - 'source' - 'specialistSlug' - 'specialistName',
          case when p_preferred_viewing_date between current_date - 1 and current_date + 400
               then p_preferred_viewing_date end,
          nullif(btrim(coalesce(p_preferred_contact_method, '')), ''),
          v_listing.specialist_id, v_consent, case when v_consent then now() end)
  returning id into v_id;

  return v_id;
end $$;

revoke execute on function create_listing_inquiry(uuid, text, text, text, text, boolean, jsonb, text, date, text)
  from public, anon, authenticated;
grant  execute on function create_listing_inquiry(uuid, text, text, text, text, boolean, jsonb, text, date, text)
  to service_role;

-- ========================================================================
-- Unsubscribe
-- ========================================================================
-- Public (the link in every follow-up email). Returns true only when the
-- token matches a lead; false otherwise, and says nothing about other tokens.
-- Stops follow-ups to that email address everywhere: suppression row plus
-- every queued send for any lead with the same address.
create or replace function unsubscribe_lead(p_token uuid)
returns boolean language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_id    uuid;
  v_email text;
begin
  if p_token is null then
    return false;
  end if;

  select id, lower(btrim(email)) into v_id, v_email
    from inquiries where unsub_token = p_token;
  if v_id is null then
    return false;
  end if;

  update inquiries set unsubscribed_at = now()
   where id = v_id and unsubscribed_at is null;

  -- An over-long address (possible via an old direct insert) cannot satisfy
  -- the suppressions check; the lead itself is still unsubscribed above.
  if char_length(v_email) <= 254 then
    insert into email_suppressions (email_lower, reason)
    values (v_email, 'unsubscribed')
    on conflict (email_lower) do nothing;
  end if;

  update lead_email_sends
     set status = 'skipped', skip_reason = 'unsubscribed'
   where status = 'queued'
     and (inquiry_id = v_id
          or inquiry_id in (select id from inquiries where lower(btrim(email)) = v_email));

  return true;
end $$;

revoke execute on function unsubscribe_lead(uuid) from public;
grant  execute on function unsubscribe_lead(uuid) to anon, authenticated;

-- ========================================================================
-- Suspension / removal also releases leads and stops their follow-ups
-- ========================================================================
-- Re-issued in full from 20261020100000_specialists.sql. Unchanged: staff
-- only, listing handling, subdomain kept, grants. New: queued follow-ups of
-- the leads this specialist currently owns are skipped, then those leads
-- become house leads (specialist_id null). Sends are matched through the
-- lead, so a lead already reassigned to someone else is untouched.
create or replace function suspend_specialist(p_specialist uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_staff() then
    raise exception 'Staff access required' using errcode = '42501';
  end if;

  update specialists set status = 'suspended' where id = p_specialist;
  if not found then
    raise exception 'Specialist not found' using errcode = 'P0002';
  end if;

  update listings
     set specialist_id   = null,
         status          = case when approval_status = 'approved' then status else 'Draft' end,
         approval_status = 'approved'
   where specialist_id = p_specialist;

  update lead_email_sends
     set status = 'skipped', skip_reason = 'specialist_removed'
   where status = 'queued'
     and inquiry_id in (select id from inquiries where specialist_id = p_specialist);

  update inquiries set specialist_id = null where specialist_id = p_specialist;
end $$;

revoke execute on function suspend_specialist(uuid) from public, anon;
grant  execute on function suspend_specialist(uuid) to authenticated;

-- Before-delete trigger (staff delete, or FK cascade from auth.users). Runs
-- before the FK nulls inquiries.specialist_id, so the leads can still be found.
create or replace function release_specialist_listings()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update listings
     set specialist_id   = null,
         status          = case when approval_status = 'approved' then status else 'Draft' end,
         approval_status = 'approved'
   where specialist_id = old.id;

  update lead_email_sends
     set status = 'skipped', skip_reason = 'specialist_removed'
   where status = 'queued'
     and inquiry_id in (select id from inquiries where specialist_id = old.id);

  update inquiries set specialist_id = null where specialist_id = old.id;
  return old;
end $$;

revoke execute on function release_specialist_listings() from public, anon, authenticated;

drop trigger if exists specialists_release_listings on specialists;
create trigger specialists_release_listings before delete on specialists
  for each row execute function release_specialist_listings();

-- ========================================================================
-- Stop rule: progressed or unsubscribed leads get no more follow-ups
-- ========================================================================
-- AFTER UPDATE so it sees the final row, whoever made the change (staff, a
-- specialist session, unsubscribe_lead()). SECURITY DEFINER because a
-- specialist has no write access to lead_email_sends.
create or replace function stop_lead_followups()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.lead_stage in ('Viewing', 'Negotiating', 'Closed', 'Lost')
     and new.lead_stage is distinct from old.lead_stage then
    update lead_email_sends
       set status = 'skipped', skip_reason = 'stage_changed'
     where inquiry_id = new.id and status = 'queued';
  end if;
  if new.unsubscribed_at is not null and old.unsubscribed_at is null then
    update lead_email_sends
       set status = 'skipped', skip_reason = 'unsubscribed'
     where inquiry_id = new.id and status = 'queued';
  end if;
  return null;
end $$;

revoke execute on function stop_lead_followups() from public, anon, authenticated;

drop trigger if exists inquiries_stop_followups on inquiries;
create trigger inquiries_stop_followups after update of lead_stage, unsubscribed_at on inquiries
  for each row execute function stop_lead_followups();

-- ========================================================================
-- Automation registry row for the sender cron (/api/cron/send-lead-followups)
-- ========================================================================
insert into automation_rules (code, name, description, trigger_type, trigger_config, action_type, action_config) values
  ('send_lead_followups',
   'Send Lead Follow-up Emails',
   'Send due follow-up emails to leads who opted in; skips unsubscribed or suppressed addresses, removed specialists and disabled templates.',
   'schedule',
   '{"cron": "0 1 * * *", "timezone": "UTC"}',
   'send_email',
   '{"per_run_cap": 100, "max_attempts": 3}'
  )
on conflict (code) do nothing;
