# Current Handoff - 2026-07-10

This file previously described an older Hallmark redesign pass. Current continuation notes are now:

- `memory.md` — local project memory with latest task details.
- `CODEX_HANDOFF.md` — main tracked Codex handoff.

## Current Repo State

- Workspace: `/Users/jojo/allabode`
- Branch: `main`
- Latest pushed/deployed commit:
  - `ec185a6 support dual-market listings`
- Production alias:
  - https://allabodeph.com
- Latest production deployment:
  - `dpl_2jrgGfj5RR384PeFJmjrVSQVLhYA`
  - https://allabode-n4pb57ix6-zerotherm27-8336s-projects.vercel.app

## Current Uncommitted Work

Owner/property delete fix:

- `app/admin/pm-actions.ts` now redirects after shared deletes and handles FK-blocked deletes with a friendly list-page warning.
- `/admin/owners` and `/admin/properties` render those warnings.
- Added `lib/admin/delete-errors.ts`.
- Added `tests/admin-delete-errors.test.mjs`.

Tenancy agreement occupant fix:

- `lib/pm/tenancy-clauses.ts` no longer pads clause 5 occupants to four PDF lines.
- Occupant clause renders only named occupants, or one blank line when none are named.
- `lib/tenancy/admin-form.ts` adds `adminOccupantsForAgreement()`.
- Admin and tenant signing Add occupant buttons now use functional state updates.
- Added/updated `tests/tenancy-admin-form.test.mjs` and `tests/tenancy-occupants.test.mjs`.

## Verification Already Run

- `node --test tests/*.test.mjs` — 15/15 passed.
- `npm run lint` — passed with existing warnings only.
- `NODE_OPTIONS=--max-old-space-size=6144 npm run build` — passed.

## Next Steps

1. Run `git status -sb` before staging.
2. If shipping current fixes, stage the intended product/test/docs files only, rerun verification, commit, push `main`, then deploy/inspect Vercel production.
3. Do not print or commit `.env.local` secrets.
4. If editing Next.js app code, follow `AGENTS.md` and read the relevant docs under `node_modules/next/dist/docs/`.

---

# Historical Handoff: Hallmark redesign (modern-minimal) — All Abode marketing site

Written for continuation in Codex. Read this first, then `CLAUDE.md` and `AGENTS.md`
at the repo root for standing project conventions (those still apply unchanged).

## Where things stand

Branch `main`, on top of commit `812443c`. **Nothing from this redesign is committed
or pushed yet** — 28 files modified, working tree only, no untracked files. The user
has not yet given the go-ahead to ship; get explicit confirmation before committing.

```
git status --short   # 28 files, all " M" (modified), zero untracked
git diff --stat       # +679 / -505 across the list below
```

Modified files:
```
app/(marketing)/about/page.tsx
app/(marketing)/listings/[id]/page.tsx
app/(marketing)/listings/page.tsx
app/(marketing)/page.tsx
app/(marketing)/privacy-policy/page.tsx
app/(marketing)/property-solutions/brokerage/page.tsx
app/(marketing)/property-solutions/documentation-assistance/page.tsx
app/(marketing)/property-solutions/leasing/page.tsx
app/(marketing)/property-solutions/page.tsx
app/(marketing)/property-solutions/property-management/page.tsx
app/(marketing)/resources/page.tsx
app/(marketing)/terms-of-service/page.tsx
app/(marketing)/valuation/page.tsx
app/globals.css
app/layout.tsx
app/manifest.ts
components/faq.tsx
components/forms/lead-forms.tsx
components/icon.tsx
components/listing-nearby-places.tsx
components/listings-browser.tsx
components/listings-category.tsx
components/property-card.tsx
components/sections.tsx
components/site-footer.tsx
components/site-header.tsx
components/ui.tsx
design/DESIGN-TOKENS.md
```

## What this was

A design-skill-driven ("Hallmark") audit + redesign of the whole public marketing
site, per explicit user request: *"audit the complete site make the design not
traditional website make it modern and minimalist... use proper svg icons. fixed
everything that need fixing, SEO, Navigation, colors etc."*

The audit found 4 critical / 4 major / 1 minor issues, dominated by structural
"AI slop" tells: generic sticky nav, 4-col-links-plus-social footer, and the same
icon-in-a-box → heading → body card grid repeated 6× across 3 pages. Zero real
photography exists anywhere (gradient placeholders throughout — intentionally
untouched, see "Not done" below). The user was asked and explicitly approved:

1. **Revise the palette/type system** (not just structural fixes) — this
   *intentionally supersedes* the older "design system LOCKED" note that used to be
   in `CLAUDE.md`'s design-system section. Treat this session's new system as the
   current locked system going forward.
2. **Imagery**: wire up the existing settings-driven hero-image system correctly,
   leave the CSS-gradient as fallback, no AI/placeholder photography generated.
3. **Icons**: migrate the whole site from Material Symbols (ligature font) to
   `lucide-react` (was an installed-but-unused dependency).

## What was actually done (all complete, all verified)

**Design system**
- New OKLCH palette in `app/globals.css` `@theme` — single navy/ink dark anchor
  (was two: navy + ink), single gold accent (`--color-gold`), plus a new
  **`--color-gold-ink`** token added late in the pass (see Contrast fix below).
  Full value table is in `design/DESIGN-TOKENS.md` (already synced).
- Type: `Montserrat` → `Inter Tight` (display) + kept `Inter` (body). Changed in
  `app/layout.tsx` (font import + `--font-inter-tight` var) and the `--font-display`
  token in `globals.css`.
- Nav: `components/site-header.tsx` rewritten to a floating rounded bar (N5
  Floating Pill archetype) instead of the old full-width bordered sticky header.
- Footer: `components/site-footer.tsx` rewritten to a flowing mast + inline link
  groups + single-line contact row, replacing the old 4-column-links-plus-social-row
  grid. The centered copyright/legal-disclosure bottom bar (from an earlier session)
  was preserved as-is.

**Icons**
- `components/icon.tsx` fully rewritten: 139 named `lucide-react` icons in an
  `ICONS: Record<string, LucideIcon>` lookup table, keyed by the *old* Material
  Symbols string names (`"search"`, `"local_parking"`, etc.) so all ~100+
  `<Icon name="..." />` call sites across the codebase needed **zero changes**.
  Public API (`name`, `className`, `size`, `fill`, `weight`, `aria-hidden`)
  unchanged. `HelpCircle` is the fallback for unmapped names.
- Material Symbols `@import` and its CSS block removed from `globals.css`. Grepped
  clean — no `material-symbols` references remain anywhere except two explanatory
  comments in `icon.tsx` itself.

**Structural — broke the repeated icon-box-grid pattern**
- Home (`app/(marketing)/page.tsx`): "Action cards" → slim inline row; "What We Do"
  (5 services) → numbered list (`grid-cols-[3rem_1fr_auto]` rows, index numbers,
  divide-y); "Who We Help" → flowing typographic list on navy band, icons dropped;
  "Why Choose" → single-column divided list; "How It Works" → numbered inline
  timeline. Added the `metadata` export that was previously missing entirely.
- Solution pages (`property-solutions/{brokerage,leasing,documentation-assistance}`)
  and `valuation`: each "Services"/"Types" section converted from a 3–4 col
  icon-box grid to either the same numbered-list pattern or `FeatureItem` horizontal
  rows (deliberately alternated for variety). `property-management` was read and
  confirmed to already use `FeatureItem` + a legitimate pricing-tier grid — no
  change needed there structurally.
- `/property-solutions` overview (`app/(marketing)/property-solutions/page.tsx`):
  rebuilt as an **Index-First** macrostructure — a clickable numbered list of the
  5 service destinations, full-width rows, hover reveals an arrow. Was a 2-col
  icon-box card grid before.
- `/resources`: de-boxed the icon badges on category cards (removed the
  `bg-navy/5` square, icon now sits inline before the label) — lighter, more
  editorial index feel.
- Listings: `components/property-card.tsx` polished (removed a radial-gradient
  "glow" overlay on the image, "View Details" changed from a full-width bordered
  button to a text link + arrow). `components/listings-browser.tsx`, the category
  page wrapper (`components/listings-category.tsx`), and the detail page
  (`app/(marketing)/listings/[id]/page.tsx`) were already structurally sound
  (token-driven, no anti-pattern grid) — inherited the new palette automatically,
  no structural rewrite needed beyond the contrast fix below.
- About/Contact/FAQ/Legal pages: read and confirmed already good macrostructures
  (Split Studio, Conversational FAQ, Long Document) — no structural rewrite,
  contrast-fix-only changes (below).

**Mechanical fixes**
- Added `description` to the `generateMetadata` "Listing not found" fallback in
  `app/(marketing)/listings/[id]/page.tsx` (was title-only before).
- `design/DESIGN-TOKENS.md` fully rewritten to match the new `globals.css` values
  (was still describing the old Stitch-export "Prestige Architectural Design"
  system and stale hex values).

**Contrast fix — found during verification, not in the original plan**

The new lighter `--color-gold` (`oklch(70% 0.13 85)`) reads well on navy
backgrounds (6.7:1) but only hits **2.63:1 on cream/surface** — far under the
4.5:1 floor `CLAUDE.md` requires — and it was used for eyebrow labels, checklist
icons, and hover-links on light backgrounds sitewide (this is exactly the kind
of thing step 4 of the plan's own verification checklist — "contrast-check the
new ink/paper/accent combinations" — exists to catch).

Fix: added a new token `--color-gold-ink: oklch(46% 0.13 85)` (same hue,
darkened — 6.4–7.0:1 on cream/surface/surface-gray) and swapped every
light-background gold text/icon/link instance to it across ~25 files, while
leaving every confirmed navy-band gold instance untouched (still the light
`--color-gold`, still correct there). Also:
- `components/sections.tsx` — `SectionHeading`'s eyebrow is now conditional on
  its existing `invert` prop (`gold` when inverted/navy, `gold-ink` otherwise);
  it was verified via grep that `SectionHeading` is never actually called on a
  navy background in the current codebase, so this is a safe blanket fix.
  `FounderSection` (currently unused/dead code, kept for future use) fixed too.
- `components/ui.tsx` — the `secondary` Button variant (border+text gold) changed
  to `gold-ink` by default since its one light-bg usage (home page) outnumbers its
  one navy-bg usage (about page); the about-page navy usage was given an explicit
  `!border-gold !text-gold hover:!bg-gold hover:!text-navy` className override to
  restore the correct light-gold look in that one navy context.
- Left `--color-gold`, `--color-gold-bright`, `--color-gold-soft` themselves
  **unchanged** deliberately — they're already correct for their existing
  navy-context uses in the admin/dashboard panels (out of scope, not audited this
  pass) and in the hero/footer/PageHero navy bands. Only additive risk taken.

Verified via a canvas-based WCAG contrast calculator run in the live browser
preview (not eyeballed) — see the numbers above.

## Verification already done

- `npx tsc --noEmit` — clean, zero errors, full project.
- `npx eslint .` — zero errors; only pre-existing warnings in unrelated admin files
  (`app/admin/(panel)/setup/page.tsx`, `app/admin/soa-actions.ts`,
  `lib/pdf/payment-receipt.tsx`) that predate this session and aren't touched by it.
- Grepped clean: no `material-symbols` / `Montserrat` references left anywhere
  except explanatory comments.
- Browser-verified in the live dev preview (not just code review) at 320 / 375 /
  414 / 768 / 1280px on: home, `/property-solutions`, `/property-solutions/brokerage`,
  `/listings`, `/listings/for-rent`, a listing detail page, `/about`, `/contact`,
  `/faq`, `/privacy-policy`, `/resources`, `/thank-you` — no horizontal scroll
  anywhere, no two-line CTAs, mobile nav drawer opens/closes correctly, footer
  collapses cleanly.
- Admin login page (`/admin/login`) smoke-tested after the contrast-fix token
  addition — renders fine, no console errors, no regression (the fix was additive
  only, didn't touch any token admin already depends on).
- Contrast re-verified in-browser after the fix: 6.39–7.05:1 gold-ink-on-light,
  6.70:1 gold-on-navy — both comfortably above the 4.5:1 floor.

## Explicitly NOT done / out of scope (by design, not oversight)

- **Admin panel, portals, dashboards, e-signature flows, PDFs** — none of
  `app/admin/**`, `app/dashboard/**`, `app/portal/**`, `app/sign/**`, `lib/pdf/**`
  were touched, per the plan's stated scope. They inherit the new base tokens
  automatically (shared CSS custom properties) but were not audited or
  restructured, and still contain their own raw-hex usages in places (e.g.
  statement tables) that were never in scope.
- **No new photography** — real photos were explicitly ruled out this pass (see
  scope decision #2 above). The `PageHero`/settings-driven image system already
  works correctly; it just needs real URLs set via `/admin/settings` whenever the
  business has photography. A per-page shot list was verbally advised earlier in
  the conversation but not written to a file — worth writing down if useful:
  Home (skyline/signature property, wide), Brokerage (agent+client or sold sign),
  Leasing (apartment interior), Property Management (building exterior),
  Documentation (workspace/paperwork), Valuation (exterior + clipboard/tablet),
  About (team/founder portrait). Listings intentionally left on gradient — real
  per-listing photos already flow through the existing admin upload UI.
- **`openGraph.images`** in `app/layout.tsx` — still pending a real 1200×630 brand
  asset; flagged, not blocked on.
- **Listing/property CMS fields, filters, DB schema** — unchanged.
- **Not committed, not pushed, not deployed.** Ship only after explicit user
  sign-off, per this session's established working pattern with this user.

## Suggested next steps in Codex

1. Skim the diff yourself (`git diff` per file above) to build your own mental
   model rather than trusting this doc blindly — it's a summary, not a substitute.
2. If the user wants to keep iterating on the redesign before shipping: the design
   system is now the *new* locked system (superseding the old note in `CLAUDE.md`'s
   design-system section, which should probably be updated to reflect that next
   time someone touches it — it wasn't updated this pass, only `design/DESIGN-TOKENS.md`
   was).
3. If the user wants to ship: `git add` the 28 files above (all intentional, no
   stray files), commit, and push per this repo's normal flow — Vercel auto-deploys
   `main`. Get explicit confirmation before pushing, this user has been consistent
   about wanting that checkpoint.
4. If you want to re-verify visually yourself: `npm run dev` and check the pages
   listed in "Verification already done" above — this repo's own `CLAUDE.md` notes
   the sandbox this session ran in can't bind a dev server or run `next build`
   (environment limitation, not a code issue), so if your Codex environment *can*
   run it, that's strictly better verification than what was possible here.
