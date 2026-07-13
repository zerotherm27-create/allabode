-- Quotation e-signature workflow. A fourth sibling of the PM agreement
-- (0020-0022), tenancy (0023), and parking (0024) signing flows, but
-- deliberately lighter-weight: a quotation is a commercial price proposal
-- (unit furnishing, repairs/improvement, renovation/fit-out), not a
-- notarized legal contract, so there is no ID upload, no notarial
-- acknowledgement page, and no portal account provisioning on completion.
-- The recipient is free-text (name/email/phone/address) since they may be
-- a prospect with no existing owner/tenant record.
--
-- Signing order is reversed from the other three sibling flows: the company
-- representative (staff signatory, in-dashboard or via a remote pre-sign
-- link to a colleague) signs FIRST while the quotation is still a draft, so
-- staff never send a price out the door without sign-off. The recipient
-- signs LAST and their signature is what completes the quotation, so they
-- can download it immediately. The token eagerness therefore follows the
-- sibling-flow convention keyed to *signing order*: the first signer's
-- token (company) is eager, the second signer's (recipient) is lazy.
--
-- Depends on: set_updated_at(), is_staff() (0001), units (0003),
-- users.is_signatory (0020).

create type quotation_status as enum
  ('draft', 'company_signed', 'sent', 'completed', 'voided');

create sequence quotation_seq;

create or replace function generate_quotation_number()
  returns text language sql security definer set search_path = public as $$
  select 'Q-' || to_char(now() at time zone 'Asia/Manila', 'YYYY') || '-' || lpad(nextval('quotation_seq')::text, 5, '0');
$$;

create table quotations (
  id                        uuid primary key default gen_random_uuid(),
  status                    quotation_status not null default 'draft',
  quotation_number          text not null unique,

  -- Company-representative signing link (first signer) — eager, always
  -- issued at creation, so a remote pre-sign link can be sent to a
  -- colleague signatory at any point while still a draft.
  company_access_token      uuid not null unique default gen_random_uuid(),
  company_token_expires_at  timestamptz,
  company_email             text, -- where the remote pre-sign link is sent; optional if a signatory will sign in-dashboard instead
  company_name_hint         text,

  -- Recipient signing link (last signer) — lazy, issued only once the
  -- company representative has signed and staff choose to send it, so one
  -- party's credential can never reach the other party's signing RPCs.
  access_token              uuid unique,

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

  -- [{category:'furnishing'|'repairs'|'others', pricingMode:'unit'|'lump_sum',
  --   description, quantity, unit, unitPrice, amount, notes}]
  line_items                jsonb not null default '[]',

  scope_of_work             text,
  notes                     text, -- printed on the PDF, client-visible

  payment_terms_type        text check (payment_terms_type is null or payment_terms_type in ('cash', 'progress_billing')),
  payment_terms_notes       text, -- free text for the 'cash' case
  -- [{description, percentageOrAmount, triggerCondition}]
  progress_milestones       jsonb not null default '[]',

  -- Terms & Conditions — formal boilerplate clauses, distinct from the
  -- operational payment_terms_* above (which describe *how* payment is
  -- structured, not the legal terms around it).
  terms_payment             text,
  terms_completion          text,
  terms_warranty            text,
  terms_validity            text,

  -- Signatures — company (first) and recipient (last)
  company_typed_name        text,
  company_signature_data    text, -- base64 PNG from canvas
  company_signed_at         timestamptz,
  company_signed_ip         text,
  company_signed_via        text check (company_signed_via is null or company_signed_via in ('remote', 'countersign')),
  signatory_user_id         uuid references auth.users(id) on delete set null,

  recipient_typed_name      text,
  recipient_signature_data  text,
  recipient_signed_at       timestamptz,
  recipient_signed_ip       text,

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

-- ── Company-rep-side RPCs (first signer) ────────────────────────────────────

create or replace function get_quotation_by_company_token(p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
begin
  -- 'draft' (pre-signing) or 'completed' (so the signatory can revisit their
  -- link afterward to download their copy) — deliberately excludes the
  -- intermediate 'company_signed'/'sent' states and 'voided', where the
  -- token must not be usable at all.
  select to_jsonb(q) - 'access_token' into v
  from quotations q
  where q.company_access_token = p_token
    and q.status in ('draft', 'completed')
    and (q.company_token_expires_at is null or q.company_token_expires_at > now());
  return v; -- null if not found/expired — caller renders a "link invalid" state
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
  -- countersigned in-dashboard while the colleague had the remote page open.
  select * into q from quotations
  where company_access_token = p_token
    and status = 'draft'
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
      company_signed_via = 'remote',
      status = 'company_signed'
  where id = q.id;
end;
$$;

-- ── Recipient-side RPCs (last signer — completes the quotation) ────────────

create or replace function get_quotation_by_token(p_token uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
begin
  select to_jsonb(q) - 'company_access_token' into v
  from quotations q
  where q.access_token = p_token
    and q.status in ('sent', 'completed');
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
      recipient_signed_ip = p_ip
  where id = q.id;
  -- Status stays 'sent' — the caller runs the completion pipeline (PDF
  -- render + storage) and flips the status to 'completed'; if that fails
  -- the signature is durable and staff retry via "Finalize".
end;
$$;
