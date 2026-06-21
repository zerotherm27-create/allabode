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

**NOT DONE — next phase (start here when continuing):**
1. ~~Connect Supabase~~ ✅ done (env + migration applied + verified). Still optional:
   run `supabase gen types typescript` and thread the `Database` generic through the
   clients (inserts/reads are currently untyped).
2. ~~Listings from DB~~ ✅ done. `lib/listings.ts` (`getListings`/`getFeaturedListings`/
   `getListing`) fetches via a public anon client and maps DB rows → the UI `Listing`
   shape, with **automatic fallback to the `lib/data.ts` mock** when Supabase is
   unconfigured/empty/errors. Home, listings, listings/[id], leasing, buy-sell are now
   async server components reading from it. **Remaining manual step:** run
   `supabase/seed.sql` in the SQL editor to load the 6 sample listings + widen the
   public-read RLS policy (live listings = everything except Draft/Archived). Until then
   the site shows the identical mock data.
3. **`/admin` dashboard + auth.** Login-gated. Listing manager (CRUD, publish, feature,
   archive, photo upload/reorder), inquiry manager, appraisal-request manager,
   property-management-lead manager, overview summary cards. Use a `(admin)` route group
   or `app/admin/` with its own auth-guarded layout. Add Supabase auth middleware.
4. **Real owner/tenant portals.** The dashboards are UI shells only — wire auth + data.
5. **Logo:** `components/logo.tsx` (Image-based) exists but the header/footer currently
   use a wordmark. Swap to the real logo (`public/logo/logo-primary.png`) if desired.

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
