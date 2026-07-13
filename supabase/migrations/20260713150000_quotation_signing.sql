-- Quotation e-signature workflow. A fourth sibling of the PM agreement
-- (0020-0022), tenancy (0023), and parking (0024) signing flows, but
-- deliberately lighter-weight: a quotation is a commercial price proposal
-- (unit furnishing, repairs/improvement, renovation/fit-out), not a
-- notarized legal contract, so there is no ID upload, no notarial
-- acknowledgement page, and no portal account provisioning on completion.
-- The recipient is free-text (name/email/phone/address) since they may be
-- a prospect with no existing owner/tenant record.
-- Depends on: set_updated_at(), is_staff() (0001), units (0003),
-- users.is_signatory (0020).

create type quotation_status as enum
  ('draft', 'sent', 'recipient_signed', 'completed', 'voided');

create sequence quotation_seq;

create or replace function generate_quotation_number()
  returns text language sql security definer set search_path = public as $$
  select 'Q-' || to_char(now() at time zone 'Asia/Manila', 'YYYY') || '-' || lpad(nextval('quotation_seq')::text, 5, '0');
$$;

create table quotations (
  id                        uuid primary key default gen_random_uuid(),
  status                    quotation_status not null default 'draft',
  quotation_number          text not null unique,

  -- Recipient signing link.
  access_token              uuid not null unique default gen_random_uuid(),

  -- Company-representative signing link — issued only after the recipient
  -- has signed, mirroring the landlord/second-party token pattern so one
  -- party's credential can never reach the other party's signing RPCs.
  company_access_token      uuid unique,
  company_token_expires_at  timestamptz,
  company_email             text, -- where the remote signing link is sent; optional if staff will countersign instead
  company_name_hint         text,

  created_by                uuid references auth.users(id) on delete set null,

  -- Free-text recipient — never an FK, since this may go to a prospect
  -- with no owner/tenant record at all.
  recipient_email           text not null,
  recipient_name_hint       text,
  recipient_phone_hint      text,
  recipient_address_hint    text,
  recipient_details         jsonb not null default '{}', -- recipient-confirmed/edited copy: {name,email,phone,address}

  quotation_date            date,
  valid_until               date,
  title                     text,
  property_reference        text,
  unit_id                   uuid references units(id) on delete set null,

  -- [{category:'furnishing'|'repairs'|'others', description, quantity, unit, unit_price, amount, notes}]
  line_items                jsonb not null default '[]',

  scope_of_work             text,

  payment_terms_type        text check (payment_terms_type is null or payment_terms_type in ('cash', 'progress_billing')),
  payment_terms_notes       text, -- free text for the 'cash' case
  -- [{description, percentageOrAmount, triggerCondition}]
  progress_milestones       jsonb not null default '[]',

  -- Signatures
  recipient_typed_name      text,
  recipient_signature_data  text, -- base64 PNG from canvas
  recipient_signed_at       timestamptz,
  recipient_signed_ip       text,

  company_typed_name        text,
  company_signature_data    text,
  company_signed_at         timestamptz,
  company_signed_ip         text,
  company_signed_via        text check (company_signed_via is null or company_signed_via in ('remote', 'countersign')),
  signatory_user_id         uuid references auth.users(id) on delete set null,

  pdf_path                  text, -- 'agreements' bucket, quotations/{id}/... prefix

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create trigger quotations_updated_at before update on quotations
  for each row execute function set_updated_at();

alter table quotations enable row level security;

create policy "staff all quotations" on quotations
  for all using (is_staff()) with check (is_staff());

-- No anon/portal RLS policies — public access goes only through the
-- SECURITY DEFINER RPCs below, which validate their own token and never
-- expose the other party's token.

-- ── Recipient-side RPCs ──────────────────────────────────────────────────────

create or replace function get_quotation_by_token(p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
begin
  select to_jsonb(q) - 'company_access_token' into v
  from quotations q
  where q.access_token = p_token
    and q.status in ('sent', 'recipient_signed', 'completed');
  return v; -- null if not found — caller renders a "link invalid" state
end;
$$;

create or replace function save_quotation_recipient_details(
  p_token uuid,
  p_recipient_details jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  update quotations
  set recipient_details = p_recipient_details
  where access_token = p_token
    and status = 'sent'; -- locked once the recipient has signed
end;
$$;

create or replace function submit_quotation_recipient_signature(
  p_token uuid,
  p_typed_name text,
  p_signature_data text,
  p_ip text
) returns void language plpgsql security definer set search_path = public as $$
declare
  q quotations;
begin
  select * into q from quotations
  where access_token = p_token
    and status = 'sent';

  if q.id is null then
    raise exception 'quotation not found or not signable';
  end if;

  update quotations
  set recipient_typed_name = p_typed_name,
      recipient_signature_data = p_signature_data,
      recipient_signed_at = now(),
      recipient_signed_ip = p_ip,
      status = 'recipient_signed'
  where id = q.id;
end;
$$;

-- ── Company-rep-side RPCs ────────────────────────────────────────────────────

create or replace function get_quotation_by_company_token(p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
begin
  select to_jsonb(q) - 'access_token' into v
  from quotations q
  where q.company_access_token = p_token
    and q.status in ('recipient_signed', 'completed')
    and (q.company_token_expires_at is null or q.company_token_expires_at > now());
  return v;
end;
$$;

create or replace function submit_quotation_company_signature(
  p_token uuid,
  p_typed_name text,
  p_signature_data text,
  p_ip text
) returns void language plpgsql security definer set search_path = public as $$
declare
  q quotations;
begin
  -- company_signature_data guard blocks the race where a staff signatory
  -- countersigned while the company rep had the remote page open.
  select * into q from quotations
  where company_access_token = p_token
    and status = 'recipient_signed'
    and company_signature_data is null
    and (company_token_expires_at is null or company_token_expires_at > now());

  if q.id is null then
    raise exception 'quotation not found or not signable';
  end if;

  update quotations
  set company_typed_name = p_typed_name,
      company_signature_data = p_signature_data,
      company_signed_at = now(),
      company_signed_ip = p_ip,
      company_signed_via = 'remote'
  where id = q.id;
  -- Status stays 'recipient_signed' — the caller runs the completion
  -- pipeline (PDF render + storage) and flips the status to 'completed';
  -- if that fails the signature is durable and staff retry via "Finalize".
end;
$$;
