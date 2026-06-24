# Codex Handoff — All Abode Property Solutions

Production property management platform for **All Abode Property Solutions** (PRC-licensed Philippine real estate firm). Live at https://allabode.vercel.app.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16.2.9 — App Router, Turbopack |
| Language | TypeScript, React 19 |
| Styling | Tailwind CSS v4 (tokens only — `app/globals.css` `@theme`) |
| Database | Supabase Postgres (project ref `volzvgrvrgqygtodkwau`, region Sydney) |
| Auth | Supabase Auth via `@supabase/ssr` |
| AI | OpenAI `gpt-4.1-mini` (structured outputs) |
| PDF | `@react-pdf/renderer` |
| Email | Resend |
| Payments | Maya or Xendit (adapter pattern) |
| Drive | Google Drive API (service account) |
| Hosting | Vercel (project `prj_z8Qe4yhmIpbBPqocCJEoavT7VsFp`, team `team_I6jgfHPrez0G1ZvYMOkNQhRn`) |
| Repo | `github.com/zerotherm27-create/allabode` (private) — pushes to `main` auto-deploy |

---

## Repository Layout

```
app/
  (marketing)/          Public site — layout adds SiteHeader + SiteFooter
  admin/
    (panel)/            Admin CRUD pages — layout adds DashboardShell (admin variant)
    login/page.tsx      Admin login (client component, signs out existing session first)
    *-actions.ts        Server actions per domain (pm-actions, invoice-actions, etc.)
  dashboard/
    owner/              Owner portal pages
    tenant/             Tenant portal pages
  portal/               Login/signup for portal users
  api/                  Route handlers (leads, payments, cron, portal)
  auth/callback/        PKCE code exchange + link_portal_account RPC
  layout.tsx            Root layout (fonts, metadata — no header/footer)

lib/
  supabase/
    client.ts           createBrowserClient (client components)
    server.ts           createServerClient via cookies (server components, actions)
    middleware.ts       Session refresh + route guards
    admin.ts            (kept for reference but service-role pattern not used)
  auth/role.ts          getCurrentRole() — returns 'staff' | 'owner' | 'tenant' | null
  ai/                   OpenAI client, receipt extraction, SOA summary
  finance/              Deterministic validation, ledger, SOA computation
  payments/             Maya + Xendit adapters (MayaProvider, XenditProvider)
  pdf/soa.tsx           @react-pdf/renderer SOA PDF
  gdrive.ts             Google Drive helpers (initDriveClient, ensureFolder, uploadPdf)
  archive.ts            archiveOwnerSoaToDrive / archiveTenantSoaToDrive
  audit.ts              createAuditEntry
  notify.ts             createNotification
  email.ts              sendEmail (Resend)
  tickets.ts            SLA helpers
  cron.ts               Cron utilities

components/
  ui/                   Container, Button (href-polymorphic)
  icon/                 <Icon name="material_symbol" /> — Material Symbols ligatures
  sections/             PageHero, SectionHeading, FeatureItem, CtaBand
  forms/fields/         Field, Input, Textarea, Select primitives
  forms/lead-forms/     5 marketing lead forms → POST /api/leads
  admin/
    shell.tsx           DashboardShell (sidebar nav grouped into 5 sections)
    data-table.tsx      Responsive table — real <table> at md+, stacked cards below
    pm-forms.tsx        OwnerForm, TenantForm, PropertyForm, UnitForm, LeaseForm, VendorForm
    form-kit.tsx        Form primitives for admin
    document-list.tsx   Upload widget + signed-URL delivery
    invoice-form.tsx    InvoiceForm client component (supports defaultLeaseId prop)
  dashboard/
    shell.tsx           Portal DashboardShell
    notification-bell.tsx Real-time unread badge
  property-card.tsx     Listing card
  listings-browser/     Client search/filter/sort for /listings
  faq/                  Accessible accordion
  pwa-register.tsx      Service worker registration
  install-prompt.tsx    PWA install banner

supabase/migrations/    Applied in order 0001→0013. NOT yet applied: 0012, 0013.
public/sw.js            Hand-rolled service worker (Serwist needs webpack; project uses Turbopack)
vercel.json             2 cron entries (Hobby plan limit)
```

---

## Supabase — Critical Rules

**The Supabase project is on a SEPARATE account from any MCP connection.** You cannot run SQL via Supabase MCP. All schema changes go through the **Supabase dashboard SQL editor** at supabase.com → project `volzvgrvrgqygtodkwau`.

### Auth client pattern

Always use `await createClient()` from `lib/supabase/server.ts` in server components and server actions. It reads cookies via `next/headers` and forwards the user's JWT to Supabase, so RLS fires as the correct user.

Never use a service-role client for regular data access — the project was refactored away from that pattern. Use SECURITY DEFINER RPCs when you need RLS bypass for specific trusted operations.

### RLS architecture

- `is_staff()` — returns true if `auth.uid()` exists in `public.users`. Staff have full access to all tables.
- `current_owner_id()` — returns the owner UUID linked to the current portal user.
- `current_tenant_id()` — returns the tenant UUID linked to the current portal user.
- `link_portal_account()` — idempotent RPC that links `auth.users.email` → owner/tenant record. Called on portal index on every load.

**Admin user setup** (must be done once per Supabase project):
```sql
insert into users (id, name, email, role)
values ('<auth-user-uuid>', 'Admin', '<admin-email>', 'staff')
on conflict (id) do nothing;
```
The admin's UUID comes from: `select id, email from auth.users`.

### Known RLS gotcha — infinite recursion

The `"owner reads units"` policy on `units` references the `leases` table, and `"owner reads leases"` on `leases` references `units`. PostgreSQL evaluates all permissive policies in parallel, which causes a recursive loop and silently returns 0 rows — **even for staff users** — because the loop fires before the staff policy can short-circuit it.

**Fix** (run in SQL editor if units/leases list pages show empty despite rows existing):
```sql
CREATE OR REPLACE FUNCTION unit_ids_for_owner(p_owner_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id FROM units u
  JOIN properties p ON p.id = u.property_id
  WHERE p.owner_id = p_owner_id;
$$;

CREATE OR REPLACE FUNCTION unit_id_for_tenant(p_tenant_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT unit_id FROM leases WHERE tenant_id = p_tenant_id;
$$;

DROP POLICY IF EXISTS "owner reads leases"    ON leases;
DROP POLICY IF EXISTS "tenant reads own unit" ON units;

CREATE POLICY "owner reads leases" ON leases FOR SELECT
  USING (unit_id IN (SELECT unit_ids_for_owner(current_owner_id())));

CREATE POLICY "tenant reads own unit" ON units FOR SELECT
  USING (id IN (SELECT unit_id_for_tenant(current_tenant_id())));
```

### Known session gotcha — admin vs portal

Admin and portal users share the same Supabase auth cookie (same project). If a portal user (owner/tenant) is logged in and you visit `/admin`, the middleware passes (it only checks `!user`), but all SELECT queries return empty because the portal user isn't in `public.users` → `is_staff()` = false.

The admin login page (`app/admin/login/page.tsx`) now calls `supabase.auth.signOut()` before `signInWithPassword()` to clear any portal session. If admin pages show empty despite data existing, the user should clear browser cookies and log in fresh at `/admin/login`.

---

## Migrations — Applied vs Pending

| File | Status |
|---|---|
| 0001_init.sql | ✅ Applied |
| 0002_site_settings.sql | ✅ Applied |
| 0003_property_management.sql | ✅ Applied (see RLS gotcha above) |
| 0004_invoices.sql | ✅ Applied |
| 0005_tickets.sql | ✅ Applied |
| 0006_documents.sql | ✅ Applied |
| 0007_notifications.sql | ✅ Applied |
| 0008_maintenance.sql | ✅ Applied |
| 0009_automation.sql | ✅ Applied |
| 0010_payments_gateway.sql | ✅ Applied |
| 0011_page_hero_images.sql | ✅ Applied |
| 0012_billing_templates.sql | ❌ NOT YET RUN — adds charge_templates table, lease_type/mgmt_fee_pct/vat_pct on leases, payout columns on statements_of_account |
| 0013_gdrive.sql | ❌ NOT YET RUN — adds gdrive_file_id + gdrive_folder_url on statements_of_account |

Run 0012 then 0013 in the SQL editor in that order.

---

## SOA (Statement of Account) — How Income Gets In

The owner SOA (`computeOwnerSoaByLease` in `lib/finance/soa.ts`) derives income from the `payments` table:

```
payments WHERE lease_id = ? AND status IN ('recorded','verified') AND received_at BETWEEN period_start AND period_end
```

**If no payments exist for the period**, income is pre-filled from `lease.rent_amount` as a single "Monthly Rent" line so the SOA is never blank. Admin can adjust in the review step.

### How to record a payment (the right flow)

Go to **Admin → Leases → [lease] → Edit**. The page has three sections:

1. **Lease form** — edit lease details
2. **Invoices** — list all invoices for this lease with status; link to invoice detail; void button
3. **Payments received** — record a payment directly (no invoice needed):
   - Amount defaults to `rent_amount`
   - Method: cash / bank transfer / GCash / Maya / check / other
   - Date received, reference, notes
   - Submit → inserts into `payments` with `status: verified`
   - Delete button removes a payment row

Payment recorded here → shows as income on next SOA generation for that period.

Alternatively: create an invoice (`/admin/invoices/new?lease_id=<id>` pre-selects the lease) → mark it paid → payment row is created automatically.

### Server actions for payments (`app/admin/invoice-actions.ts`)

| Action | What it does |
|---|---|
| `recordPaymentOnLease(leaseId, fd)` | Insert verified payment directly against a lease |
| `deletePayment(paymentId, leaseId)` | Hard-delete a payment row |
| `recordPaymentOnInvoice(invoiceId, fd)` | Record payment via invoice (updates invoice status too) |
| `voidInvoice(invoiceId)` | Mark invoice voided |
| `createInvoice(fd)` | Create draft invoice from a lease |

---

## SOA Detail Page (`app/admin/(panel)/statements/[id]/page.tsx`)

- **Header card**: All Abode logo (letterhead strip) + eyebrow label + H1 = owner/tenant name + contact info + property/unit context + formatted period + lease type badge + status badge
- **Review form** (status = generated, lease-based): editable deduction amounts, add one-time expenses, payout meta (due date, adjustments, prev SOA ref)
- **Read-only view** (approved/published/voided): income lines, deduction lines, summary card
- **Payout panel**: payout status lifecycle (pending → processing → paid), bank slip upload
- **Workflow buttons**: Submit for review → Approve → Publish → Void; Download PDF; View in Drive / Owner folder

**SOA generation errors** (e.g. duplicate) redirect to `/admin/statements?genError=…` and render an inline alert — they never crash the page.

---

## Environment Variables

```bash
# Required (already set on Vercel)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Required for AI features
OPENAI_API_KEY=

# Required for email notifications
RESEND_API_KEY=

# Required for payment gateway (pick one provider)
PAYMENT_PROVIDER=maya          # or xendit
MAYA_SECRET_KEY=               # if PAYMENT_PROVIDER=maya
XENDIT_SECRET_KEY=             # if PAYMENT_PROVIDER=xendit
XENDIT_WEBHOOK_TOKEN=          # if PAYMENT_PROVIDER=xendit
NEXT_PUBLIC_PAYMENT_PROVIDER=  # shown in tenant pay UI

# Required for Vercel Cron authentication
CRON_SECRET=

# Optional — Google Drive SOA archive
GOOGLE_SERVICE_ACCOUNT_KEY=    # full JSON key file content (stringified, single line)
GOOGLE_DRIVE_ROOT_FOLDER_ID=   # ID from Drive folder URL (.../folders/<ID>)
```

---

## One-Time Setup SQL (Supabase)

Besides running migrations in order, you need:

```sql
-- 1. Storage buckets (run supabase/setup-storage.sql in SQL editor)
--    Creates: receipts (private), finance-docs (private), site-assets (public)

-- 2. Admin user row (replace with real values from auth.users)
insert into users (id, name, email, role)
values ('5de7f4e7-b31b-4ad3-87b2-af2b8c8546f2', 'Admin', 'zerotherm27@gmail.com', 'staff')
on conflict (id) do nothing;

-- 3. Auth redirect URLs — add in Supabase → Auth → URL Configuration:
--    https://allabode.vercel.app/auth/callback
--    http://localhost:3000/auth/callback
```

---

## Vercel Cron (vercel.json)

Hobby plan allows 2 cron jobs max. Currently configured:
- `0 1 * * *` → `/api/cron/generate-invoices`
- `0 2 * * *` → `/api/cron/generate-owner-soa`

All cron routes verify `Authorization: Bearer <CRON_SECRET>` before running.

---

## Design System (LOCKED)

Visual system = **"Prestige Architectural Design"** exported from Stitch. Do not deviate.

- All colours via `@theme` tokens: `navy`, `navy-700`, `gold`, `gold-bright`, `ink`, `slate`, `cream`, `surface`, `surface-gray`, status colours.
- Fonts: `font-display` = Montserrat 600/700, `font-body` = Inter 400/500/600.
- Never inline hex, oklch, or raw `font-family`.
- Icons: `<Icon name="material_symbol_name" />` from `@/components/icon` — NOT lucide-react (installed but unused).
- Layout: `Container` + `Button` from `@/components/ui`. `Button` renders `<Link>` when `href` is set.
- Section sections: `PageHero`, `SectionHeading`, `FeatureItem`, `CtaBand` from `@/components/sections`.

---

## Coding Conventions

- Server actions: `"use server"` at top of `*-actions.ts` files. All admin actions use `await createClient()` (SSR, not service role).
- Admin CRUD pattern: `insertRow(table, row, listPath)` / `updateRow(...)` / `deleteRow(...)` in `app/admin/pm-actions.ts`.
- After insert/update/delete: `revalidatePath(path)` then `redirect(path)`.
- Error handling: server actions throw on Supabase error; the error propagates to Next.js error boundary. For user-visible non-fatal errors (e.g. duplicate SOA), use `redirect("/path?genError=message")` + inline alert on the page — do NOT throw.
- Supabase SELECT errors are returned as `{ data: null, error }` — always destructure both and handle the error case. Ignoring `error` causes silent empty lists.
- Forms: `noValidate` + validate on blur, errors below field with `role="alert"`. All 8 interactive states required.
- TypeScript: strict mode. Run `npx tsc --noEmit` and `npx eslint .` before committing — both must pass clean.

---

## What's NOT Built (Deferred)

- Vendor portal (vendors as authenticated portal users)
- Accounting export (CSV/XLSX ledger)
- SMS/WhatsApp notifications (Resend does email only)
- Tenant-uploaded ticket attachments (schema ready in 0005; upload UI not built)
- Admin consolidated payouts view per owner (`/admin/owners/[id]/payouts`)

---

## Immediate Pending Actions

1. **Run migrations 0012 and 0013** in Supabase SQL editor (in that order).
2. **Run the RLS infinite-recursion fix** (see above) to ensure units and leases list pages work for the owner portal.
3. **Set env vars** not yet configured: `RESEND_API_KEY`, `CRON_SECRET`, `PAYMENT_PROVIDER` + keys, `NEXT_PUBLIC_PAYMENT_PROVIDER`, `OPENAI_API_KEY`, optionally `GOOGLE_SERVICE_ACCOUNT_KEY` + `GOOGLE_DRIVE_ROOT_FOLDER_ID`.
4. **Google Drive setup**: Cloud Console → enable Drive API → service account → JSON key → share root folder → set env vars.
5. **Test portal flows** end-to-end: create `owner@allabode.test` and `tenant@allabode.test` as confirmed Supabase Auth users, link them via `link_portal_account()`.
