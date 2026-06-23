# All Abode Property Solutions — Website

Production marketing + operations website for **All Abode Property Solutions**, a
PRC-licensed Philippine real estate firm (leasing, brokerage, property management,
appraisal). Domain: `allabodeph.com`.

## Stack

- **Next.js 16** (App Router, Turbopack) · TypeScript · React 19
- **Tailwind CSS v4** (tokens in `app/globals.css` `@theme`, no config file)
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`, installed) — Postgres data
  layer, **connected**. Project ref `volzvgrvrgqygtodkwau` (region Sydney); URL + anon
  key in `.env.local` (gitignored). Migration `supabase/migrations/0001_init.sql` has
  been **applied** (all 6 tables + RLS verified live via REST). Clients in
  `lib/supabase/{client,server}.ts` (`server.ts` also exports `isSupabaseConfigured()`).
  The DB project lives on a separate Supabase account (not the MCP-connected one), so
  schema changes / type-gen are done via the dashboard SQL editor, not the Supabase MCP.
- **lucide-react** installed but **not used** — icons go through the Material Symbols
  `Icon` component instead (matches the Stitch source design).
- **Deployed:** Vercel project `allabode` (scope `zerotherm27-8336s-projects`), live at
  https://allabode.vercel.app. GitHub repo (private):
  `github.com/zerotherm27-create/allabode` — **connected to Vercel, so pushes to `main`
  auto-deploy**. Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY`) are set on
  Vercel for Production. `.env.local` is gitignored; `.env.example` is committed.

## Design system (LOCKED — do not improvise)

The visual system is **"Prestige Architectural Design"**, exported from the Stitch
project and treated as the locked design system. Pages **share** this system; they do
not diversify. All design assets and the token reference live in `design/`:
- `design/DESIGN-TOKENS.md` — colours, type, spacing, components
- `design/screenshots/*.png` — full-res renders of each page (visual target)
- `design/code/*/index.html` — Stitch HTML exports (content + structure reference)

**Token rules (enforced):**
- Every colour and font references a named token from `app/globals.css` `@theme`.
  Never inline hex/oklch or raw `font-family` in components.
- Colours: `navy` (#0a2540 primary), `navy-700` (#0d518c links), `gold` (#b4975a
  brass accent), `gold-bright`, `ink`, `slate`, `cream` (page bg), `surface` (cards),
  `surface-gray` (alt band), status `available`/`reserved`/`sold`.
- Fonts: `font-display` = Montserrat (600/700), `font-body` = Inter (400/500/600).
- Spacing: `py-section` (5rem), `py-section-lg` (7rem). Radius is small/sharp
  (architectural). Container: `.container-site` (max 1280px, responsive gutters).
- Motion: `--ease-out/-in/-in-out`, `--dur-fast/-mid`. Animate transform/opacity only.
  `prefers-reduced-motion` handled globally in `globals.css`.

## Conventions

- **Layout primitives:** `Container` + `Button` from `@/components/ui` (the `Button` is
  href-polymorphic — renders `<Link>` when `href` is set, `<button>` otherwise; variants
  `primary` / `secondary` / `ghost` / `ghost-light`).
- **Icons:** `<Icon name="..." />` from `@/components/icon` (Material Symbols ligature
  names, e.g. `home_work`, `verified`). Loaded via `@import` in `globals.css`.
- **Section building blocks:** `PageHero`, `SectionHeading`, `FeatureItem`, `CtaBand`
  from `@/components/sections`. `PageHero` accepts `subtitle` **or** `lead` (aliases)
  plus optional `crumbs`. (There is only ONE PageHero — the old `components/page-hero.tsx`
  was removed during reconciliation; do not re-create it.)
- **Eyebrows:** stacked `label-caps` (uppercase, letter-spaced) above headings, never the
  tag-left/heading-right two-column pattern.
- **FAQ:** `<Faq items={[{q,a}]} />` from `@/components/faq` (accessible accordion).
- **Content data:** shared in `lib/data.ts` (services, listings, trustPoints, statusStyles).
  Site config + nav in `lib/site.ts` (`site`, `mainNav`, `footerNav`).
- **Property cards:** `<PropertyCard listing={...} />` from `@/components/property-card`.
  Listings filtering UI is `@/components/listings-browser` (client; search/filter/sort).
- **Forms:** field primitives in `@/components/forms/fields` (`Field`, `Input`,
  `Textarea`, `Select`); the 5 lead forms (`InquiryForm`, `AppraisalForm`,
  `PropertyManagementForm`, `ContactForm`, `ListPropertyForm`) in
  `@/components/forms/lead-forms`. All POST to `/api/leads`. Every interactive element
  ships all 8 states; validate on blur; errors below the field with `role="alert"`;
  loading + success states on submit.
- **Dashboards:** `@/components/dashboard/shell` exports `DashboardShell` (sidebar +
  topbar), `StatCard`, `Panel`. Dashboard pages live in `app/dashboard/*` (NOT in the
  marketing group) so they get portal chrome, not the site header/footer.
- **Admin shell:** `components/admin/shell.tsx` — sidebar nav is grouped into 5 sections
  (Overview · Property Management · Finance · Marketing · System) via a `navGroups` array;
  section labels render as small `text-white/40` uppercase caps between items.

## Route groups

- `app/(marketing)/` — public pages; its `layout.tsx` adds `SiteHeader` + `SiteFooter`
  + skip link. Route group is invisible in URLs (home is `app/(marketing)/page.tsx` → `/`).
- `app/dashboard/` — portal pages; no marketing chrome (each page renders `DashboardShell`).
- `app/layout.tsx` is the slim root (html/body, fonts, metadata only — no header/footer).
- `app/api/` — route handlers (`/api/leads`).

## Accessibility / responsive floor (non-negotiable)

- Contrast ≥ 4.5:1, visible `:focus-visible` ring (never animated), skip link in layout.
- Touch targets ≥ 44px. No emoji as icons.
- Verified at 320 / 375 / 414 / 768px: no horizontal scroll, no two-line buttons,
  headings wrap long words, single-column collapse on mobile.

## Build status (updated — resume here)

**DONE — PWA + mobile parity:**
- Installable PWA via native `app/manifest.ts` (navy theme, standalone) + icons generated
  from `public/logo/favicon.png` with `sips` (`public/icon-{192,512}.png` + `-maskable`,
  `app/apple-icon.png`). `app/layout.tsx` has `viewport` (theme-color, viewportFit cover) +
  `appleWebApp`; mounts `components/{pwa-register,install-prompt}.tsx`.
- **Hand-rolled** service worker `public/sw.js` (Serwist needs webpack; project is Turbopack):
  network-only for `/api`,`/admin`,`/dashboard`,Supabase (never caches private data);
  cache-first static; network-first public nav → `app/offline/page.tsx`. SW is production-only.
- `next.config.ts` adds `/sw.js` headers (no-store, `Service-Worker-Allowed`) + security headers.
- `components/admin/data-table.tsx` — responsive list (real `<table>` at `md`+, stacked cards
  below). All admin tables use it (PM lists + `listings`); inquiries/appraisals/leads were
  already card-based.

**DONE — Property Management platform (Foundation + AI Finance), single-tenant:**
- Migration `supabase/migrations/0003_property_management.sql` (18 tables: owners,
  tenants, properties, units, leases, payments, vendors, the receipt→expense→ledger→
  SOA finance chain, audit_log) + RLS (staff full; owner/tenant scoped read-only;
  unpublished SOAs hidden) + helpers `current_owner_id()` / `current_tenant_id()` /
  `link_portal_account()` + `users.finance_role`. **User must run it in the SQL editor.**
- Portal auth: `/portal/{login,signup}` + `/portal` (role redirect / "pending"),
  `lib/auth/role.ts`, self-signup links by email via the RPC (no service_role key),
  middleware guards `/dashboard/*` + `/portal/*`.
  - `app/auth/callback/route.ts` — PKCE code exchange + `link_portal_account` RPC;
    required for email-confirmation flow to work.
  - Portal index calls `linkPortalAccount()` on every load (idempotent) so users
    who arrive via email-confirmation link without hitting the login form are linked.
  - Login page wraps in `<Suspense>` (required for `useSearchParams` in App Router).
- Admin CRUD (`app/admin/(panel)/{owners,tenants,properties,units,leases,vendors}`)
  via `app/admin/pm-actions.ts` + `components/admin/pm-forms.tsx` + `form-kit.tsx`.
- Owner & tenant dashboards (`app/dashboard/*`) now read live data scoped by RLS.
- AI finance: `lib/ai/{client,receipts,soa-summary}.ts` (OpenAI `gpt-4.1-mini`,
  Structured Outputs), `lib/finance/{validation,ledger,soa}.ts` (deterministic),
  `lib/pdf/soa.tsx` (@react-pdf/renderer), `lib/audit.ts`, `lib/storage.ts`.
  Workflow: `app/admin/finance-actions.ts` (upload→extract→validate→review→approve→
  post→ledger, maker-checker) + `app/admin/soa-actions.ts` (generate→review→approve
  w/ recalc gate→publish PDF→portal). Admin UI: `/admin/{receipts,expenses,statements,audit}`.
  Portal PDF download: `app/api/portal/soa/[id]/route.ts` (signed URL, ownership-checked).
  `uploadReceipt` uses `useActionState` pattern — returns `{ error }` instead of throwing,
  so upload failures render inline in `app/admin/(panel)/receipts/new/upload-form.tsx`.
- **Manual setup to activate:**
  1. Run migration `0003` in the SQL editor.
  2. Run `supabase/setup-storage.sql` in the SQL editor — creates 3 buckets
     (**private** `receipts` + `finance-docs`, **public** `site-assets`) + all RLS
     policies in one shot (idempotent; safe to re-run).
  3. Set `OPENAI_API_KEY` (server-only) in `.env.local` + Vercel.
  4. Create Supabase Auth users matching seeded `owner@allabode.test` /
     `tenant@allabode.test` with **confirmed** emails to test portals.
  5. Add `{siteUrl}/auth/callback` + `http://localhost:3000/auth/callback` to
     Supabase → Auth → URL Configuration → Redirect URLs.
- **All 7 operational phases now built — see below.**

**DONE — public marketing site (brief "first-version scope"), all on the locked tokens:**
- `/` home · `/about` · `/leasing` · `/buy-sell` · `/property-management` · `/appraisal`
  · `/contact` · `/list-your-property`
- `/listings` (working search/filter/sort) + `/listings/[id]` (detail + on-page inquiry form)
- 5 lead forms → `/api/leads` (validates shape, returns ok; **not yet persisted**)
- `/dashboard/owner` + `/dashboard/tenant` — **static previews only** (mock data, no auth)

**DONE — Supabase data-layer foundation (local only, no cloud project yet):**
- `supabase/migrations/0001_init.sql` — all 6 tables (`users`, `listings`,
  `listing_images`, `inquiries`, `appraisal_requests`, `property_management_leads`),
  enums, `updated_at` triggers, and RLS (anon may insert leads + read published
  listings; staff get full access via `is_staff()`).
- `/api/leads` now inserts into the right table per `type` (appraisal →
  `appraisal_requests`, property-management → `property_management_leads`, everything
  else → `inquiries` with extras in a `details` jsonb). Falls back to log-only +
  `{ok:true,persisted:false}` when env vars are absent.

**DONE — Full Blueprint (7 Operational Phases):**

1. ~~Connect Supabase~~ ✅ done.
2. ~~Listings from DB~~ ✅ done. Fallback to `lib/data.ts` mock when Supabase empty.
3. ~~Admin dashboard + auth~~ ✅ done.
4. ~~Real owner/tenant portals~~ ✅ done.
5. ~~Logo~~ ✅ done.
6. ~~Phase 1 — Invoices & Billing~~ ✅ done (`0004_invoices.sql`).
   - `invoice_seq` + `generate_invoice_number()` RPC, invoices + invoice_lines tables
   - `app/admin/invoice-actions.ts` + `/admin/invoices` CRUD + tenant portal `/invoices`
7. ~~Phase 2 — Ticketing~~ ✅ done (`0005_tickets.sql`).
   - `ticket_seq`, tickets + ticket_comments + ticket_attachments, SLA machine
   - `lib/tickets.ts`, `app/admin/ticket-actions.ts`, admin queue + detail + assign
   - Tenant: submit / view / reply. Owner: read-only list.
8. ~~Phase 3 — Documents~~ ✅ done (`0006_documents.sql`).
   - documents table (entity-attached, visibility levels, signed/immutable)
   - `components/admin/document-list.tsx` (upload widget, mark-signed, delete)
   - `/api/portal/documents/[id]` signed-URL delivery; tenant + owner portal pages
9. ~~Phase 4 — Notices & Notifications~~ ✅ done (`0007_notifications.sql`).
   - notices board + notifications inbox tables
   - `lib/email.ts` (Resend), `lib/notify.ts` (createNotification)
   - `components/dashboard/notification-bell.tsx` — real-time unread badge + dropdown
   - `/admin/notices` CRUD, tenant/owner notice board pages
10. ~~Phase 5 — Preventive Maintenance & Work Orders~~ ✅ done (`0008_maintenance.sql`).
    - maintenance_plans (frequency, next_due_at auto-calc) + work_orders (status machine)
    - `/admin/maintenance` + `/admin/work-orders` queue + detail
11. ~~Phase 6 — Automation Rules & Cron~~ ✅ done (`0009_automation.sql`).
    - automation_rules + automation_run_log; 5 seeded default rules
    - `lib/cron.ts`, Vercel cron routes: `/api/cron/{generate-invoices,check-lease-expiry,
      check-ticket-slas,check-maintenance-due,generate-owner-soa}`
    - `vercel.json` cron schedules; `/admin/automation` dashboard + run log
12. ~~Phase 7 — Payment Gateway~~ ✅ done (`0010_payments_gateway.sql`).
    - payment_intents table; Maya + Xendit adapters (`lib/payments/`)
    - `/api/payments/create` + `/api/payments/webhook/{maya,xendit}`
    - Tenant: "Pay now" → `/dashboard/tenant/invoices/[id]/pay` → provider checkout → return page

**Manual steps to activate new phases:**
- Run `0004` through `0010` in Supabase SQL Editor (in order).
- Create private `documents` bucket in Supabase Storage.
- Set env vars:
  - `RESEND_API_KEY` — email notifications
  - `PAYMENT_PROVIDER` = `maya` or `xendit`
  - `MAYA_SECRET_KEY` or `XENDIT_SECRET_KEY` + `XENDIT_WEBHOOK_TOKEN`
  - `NEXT_PUBLIC_PAYMENT_PROVIDER` — shown on pay page
  - `CRON_SECRET` — secures Vercel Cron endpoints
- Add webhook URLs in Maya/Xendit dashboard:
  - Maya: `{siteUrl}/api/payments/webhook/maya`
  - Xendit: `{siteUrl}/api/payments/webhook/xendit`

**Remaining deferred items (not built):**
- Vendor portal (vendors as authenticated portal users)
- Accounting export (CSV/XLSX ledger export)
- PDF receipt rasterization for AI (PDFs → manual entry now)
- SMS/WhatsApp notifications (Resend does email only)
- Tenant-uploaded ticket attachments (schema ready; S3 upload UI not built)

## Verification

- `npx tsc --noEmit` and `npx eslint .` both pass clean — use these as the primary gate.
- **This sandbox cannot run the app:** the dev server reaches "Ready" but is reaped and
  never binds (HTTP 000 on every route), and `next build` SIGBUS-crashes (exit 138) on
  both Turbopack and `--webpack`. These are environment limits, not code bugs — the app
  builds/runs normally on a normal machine and on Vercel. **Run `npm run dev` locally to
  verify visually.** Visual target is `design/screenshots/`.
- Company name is **All Abode Property Solutions** (not "Allabode Realty" — that string in
  older Stitch copy is stale). lucide-react is installed but unused (icons = Material Symbols).

<!-- Original create-next-app guidance retained below -->
@AGENTS.md
