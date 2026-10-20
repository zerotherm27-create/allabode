# Specialist Program, Phase 1: Accounts and Listings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Specialists can apply, be approved by the owner, manage their own listings (published only after owner approval), and appear on the public site ("Listed by" on listings, a basic `/team` team directory and minimal specialist profile).

**Architecture:** A new `specialists` table (never a row in `users`, so `is_staff()` never applies to specialists) with its own RLS helpers, linked to `auth.users` by an RPC modelled on `link_portal_account`. Specialist screens live under `app/dashboard/specialist/*` so they reuse `DashboardShell` and the existing `/dashboard` sign-in guard. Listings gain `specialist_id` and `approval_status`; the public read policy additionally requires `approval_status = 'approved'`. Public pages read specialists only through a `public_specialists` view.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (`@supabase/ssr`), Tailwind v4 tokens, node:test (`tests/*.test.mjs`).

**Spec:** `/Users/jojo/.claude/plans/let-s-brainstorm-how-should-ticklish-perlis.md` (Phase 1 of 4). Phases 2 (specialist pages, subdomains), 3 (lead routing, email automation) and 4 (owner overview) are separate plans.

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code (AGENTS.md: this Next.js has breaking changes).
- Files with `"use server"` may only export async functions. Pure helpers go in `lib/**`, never in an action file.
- Supabase: use `await createClient()` from `@/lib/supabase/server`. `createAdminClient()` is not used in this phase. Cross-RLS operations are `SECURITY DEFINER` RPCs.
- Schema changes are a migration file `supabase/migrations/20261020100000_specialists.sql`; the user runs it in the Supabase SQL editor. Give the SQL as a raw `sql` block in chat when done. Storage policy changes go in `supabase/setup-storage.sql` (idempotent) and are also given as raw SQL.
- Design tokens only (`navy`, `gold`, `cream`, `surface`, `font-display`, `container-site`, `py-section`); no inline hex or raw font-family. Icons via `<Icon name="..." />`; grep `components/icon.tsx` for the name first (unmapped names render a help-circle). Mapped names that fit: `groups`, `person_add`, `home_work`.
- Copy: sentence case; verb-first buttons; no "please", no "successfully".
- Licence line wording (from the spec): own licence → `PRC License No. <no>`; accredited → `Accredited under <broker name>, PRC Lic. No. <broker no>`. Broker name default `Aremchel M. Cruzado`. Licence number comes from settings, never hardcoded.
- Specialist photo: portrait 4:5, exactly 800×1000 JPEG after the crop tool.
- Subdomain/slug: 3–30 chars, `a-z 0-9 -`, no leading/trailing hyphen, not reserved (`www admin api app mail portal dashboard specialist specialists ftp smtp static assets cdn dev staging test blog help support login signup`).
- Commits: do not add a `Co-Authored-By` trailer (project CLAUDE.md rule).
- Gate before every commit: `npx tsc --noEmit`, `npx eslint .`, `node --test tests/*.test.mjs`.

## Review Focus

1. A specialist posts a listing form that includes `is_featured=on`, `approval_status=approved`, or another specialist's `specialist_id` → all ignored/overridden server-side and by the database trigger (Task 2 test, Task 3 SQL check).
2. Specialist A updates or deletes Specialist B's listing → zero rows affected and a loud error, not a silent success (Task 3 SQL check, Task 8).
3. A pending, rejected or suspended specialist opens `/dashboard/specialist/listings/new` → blocked with an explanation (Task 7).
4. Subdomain input with uppercase, spaces, unicode, leading hyphen, 2 characters, or a reserved word → rejected with a specific message (Task 1 tests).
5. Suspending a specialist: their listings become house listings (visible, no "Listed by"), their profile 404s, and they cannot sign in to the specialist area (Task 3 SQL check, Task 6, Task 10).

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/team/subdomain.ts` | `RESERVED_SUBDOMAINS`, `validateSubdomain` (pure) |
| `lib/team/license.ts` | `licenseLine` (pure) |
| `lib/team/photo.ts` | `computeCenterCrop`, `jpegDimensions`, `PHOTO_W/H` (pure) |
| `lib/team/broker.ts` | `getBroker()` reads `site_settings` |
| `lib/team/queries.ts` | `getPublicSpecialists()`, `getPublicSpecialist(slug)`, `specialistPhotoUrl(path)` |
| `lib/admin/listing-row.ts` | pure form parsing extracted from `app/admin/actions.ts`: `listingRow`, `specialistListingRow` |
| `supabase/migrations/20261020100000_specialists.sql` | schema, RLS, triggers, RPCs, view |
| `lib/auth/role.ts`, `destination.ts`, `pending-signups.ts` | `specialist` role |
| `app/(marketing)/team/*` | `/team` directory, `/team/join`, `/team/[slug]` |
| `app/dashboard/specialist/*` | specialist layout, overview, profile, listings |
| `app/dashboard/specialist/actions.ts` | specialist server actions |
| `app/admin/(panel)/specialists/*`, `app/admin/specialist-actions.ts` | owner approval and listing approval |
| `components/team/*` | `PhotoCropper`, `SpecialistCard`, `ListedBy` |
| `tests/helpers/load-ts.mjs` | shared helper to import a `.ts` file in node:test (same technique as `tests/pending-signups.test.mjs`) |

---

### Task 1: Pure specialist logic with tests

**Files:**
- Create: `tests/helpers/load-ts.mjs`, `lib/team/subdomain.ts`, `lib/team/license.ts`, `lib/team/photo.ts`
- Test: `tests/specialist-subdomain.test.mjs`, `tests/specialist-license.test.mjs`, `tests/specialist-photo.test.mjs`

**Interfaces:**
- Produces:
  - `loadTs(relPath: string): Promise<Record<string, any>>` (transpile with `typescript`, import via data URL; resolves from repo root)
  - `validateSubdomain(input: string): { ok: true; value: string } | { ok: false; error: string }`; trims and lowercases first
  - `licenseLine(specialist: { licenseMode: "own" | "accredited"; licenseNo: string | null }, broker: { name: string; licenseNo: string } | null): string | null` (null when required data is missing)
  - `PHOTO_W = 800`, `PHOTO_H = 1000`
  - `computeCenterCrop(srcW: number, srcH: number): { x: number; y: number; width: number; height: number }` (largest centered 4:5 rectangle, integer values)
  - `jpegDimensions(buf: Uint8Array): { width: number; height: number } | null` (scan segment markers for SOF0–SOF15 excluding DHT/JPG/DAC; null if not a JPEG)

- [ ] **Step 1: Write failing tests**
  - Subdomain: `"ram"` ok; `" Ram "` → value `"ram"`; `"ab"` fails (too short); `"-ram"`, `"ram-"`, `"r am"`, `"rám"`, `"a".repeat(31)` fail; each of `www`, `admin`, `api`, `portal` fails with an error naming it as reserved.
  - License: own + `"123456"` → `"PRC License No. 123456"`; own with null no → null; accredited + broker `{name:"Aremchel M. Cruzado", licenseNo:"0001234"}` → `"Accredited under Aremchel M. Cruzado, PRC Lic. No. 0001234"`; accredited with null broker → null.
  - Photo: `computeCenterCrop(1600,1000)` → `{x:350,y:0,width:800,height:1000}`; `computeCenterCrop(800,2000)` → `{x:0,y:400,width:800,height:1000}`; a 1×1 white JPEG fixture built in-test from a known byte array → dims `{1,1}`; `jpegDimensions(new Uint8Array([1,2,3]))` → null.
- [ ] **Step 2: Run** `node --test tests/specialist-subdomain.test.mjs tests/specialist-license.test.mjs tests/specialist-photo.test.mjs`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** the three modules and the helper per the signatures above.
- [ ] **Step 4: Run the same command.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(specialists): pure subdomain, licence-line and photo helpers`.

---

### Task 2: Extract and harden listing form parsing

**Files:**
- Create: `lib/admin/listing-row.ts`
- Modify: `app/admin/actions.ts` (remove local `s`, `n`, `date`, `slugify`, `listingRow`; import from the new file; behaviour must not change for staff)
- Test: `tests/listing-row.test.mjs`

**Interfaces:**
- Produces:
  - `listingRow(fd: FormData)`: exact current behaviour of the function in `app/admin/actions.ts`
  - `specialistListingRow(fd: FormData)`: same result as `listingRow` minus `is_featured`, `unit_id`, `status` outside the specialist-allowed set; it never includes `specialist_id` or `approval_status`
  - `SPECIALIST_STATUSES = ["Draft","Available","Reserved","Leased","Sold","Archived"] as const` (specialists never choose `Published`; a non-listed value falls back to `"Draft"`)
  - `slugify(v: string): string`
  - Consumed later by Tasks 6 and 8.

- [ ] **Step 1: Write failing tests** (use `loadTs("lib/admin/listing-row.ts")`):
  - `listingRow` with `amenities="Pool, Gym ,"` → `["Pool","Gym"]`; `availability_date="2026-13-45"` → `null`; `is_featured=on` → `true`.
  - `specialistListingRow` given a form containing `is_featured=on`, `specialist_id=other`, `approval_status=approved`, `unit_id=x`, `status=Published` → result has no `is_featured`, `specialist_id`, `approval_status`, `unit_id` keys and `status === "Draft"`.
  - `specialistListingRow` with `status=Sold` → `"Sold"`; empty title → `"Untitled"` and slug `"untitled"`.
- [ ] **Step 2: Run** `node --test tests/listing-row.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Move the code** (keep the admin file's imports tidy) and add `specialistListingRow`.
- [ ] **Step 4: Run** `node --test tests/*.test.mjs` plus `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `refactor(listings): extract pure form parsing; add specialist-safe variant`.

---

### Task 3: Database migration and RLS verification

**Files:**
- Create: `supabase/migrations/20261020100000_specialists.sql`
- Modify: `supabase/setup-storage.sql`

**Interfaces:**
- Produces (SQL objects later tasks call):
  - Table `specialists(id uuid pk default gen_random_uuid(), auth_user_id uuid unique references auth.users on delete cascade, email text not null, display_name text not null, phone text, status text not null default 'pending' check in ('pending','approved','rejected','suspended'), requested_subdomain text, subdomain text unique, tagline text, bio text, areas text[] default '{}', specialties text[] default '{}', languages text[] default '{}', years_experience int, photo_path text, license_mode text not null default 'accredited' check in ('own','accredited'), license_no text, license_expiry date, created_at, updated_at)` with `updated_at` trigger like other tables.
  - `listings.specialist_id uuid references specialists(id) on delete set null`, `listings.approval_status text not null default 'approved' check in ('draft','submitted','approved','rejected')`, `listings.rejection_note text`. Existing rows keep `'approved'`.
  - `current_specialist_id() returns uuid` and `is_specialist() returns boolean`: `SECURITY DEFINER STABLE`, match `auth.uid()`, status `approved` only.
  - `link_specialist_account() returns text`: `SECURITY DEFINER`; no-op returning `null` unless the caller's `auth.users.raw_user_meta_data->>'specialist_application' = 'true'`; otherwise inserts a `pending` specialist (display_name from `full_name`, phone, `requested_subdomain`, `license_mode`, `license_no` from metadata) if none exists, and returns the specialist's `status`.
  - `suspend_specialist(p_specialist uuid) returns void`: `SECURITY DEFINER`, staff only (`is_staff()`), sets status `suspended`, `subdomain` kept, and `update listings set specialist_id = null where specialist_id = p_specialist`.
  - View `public_specialists` (owner-run, so it bypasses `specialists` RLS): `id, subdomain as slug, display_name, tagline, bio, areas, specialties, languages, years_experience, photo_path, license_mode, license_no` where `status = 'approved' and subdomain is not null`; `grant select` to `anon, authenticated`.
  - Policies: `specialists` staff all; specialist select/update own row. Trigger `guard_specialist_update` (non-staff cannot change `status`, `subdomain`, `auth_user_id`, `email`). `listings`: public read policy replaced by `status not in ('Draft','Archived') and approval_status = 'approved'` (same change for `listing_images`); specialist select/insert/update/delete where `specialist_id = current_specialist_id()`; trigger `guard_specialist_listing` for non-staff: on insert force `approval_status='draft'`, `is_featured=false`, `specialist_id=current_specialist_id()`; on update keep `specialist_id` and `is_featured`, and allow `approval_status` changes only `draft|rejected → submitted`. `listing_images` specialist policies via the parent listing's `specialist_id`.
  - `site_settings` seed (on conflict do nothing): `broker_name = 'Aremchel M. Cruzado'`, `broker_prc_license = ''`, `broker_prc_expiry = ''`, group `broker`.
  - `setup-storage.sql`: public bucket `specialist-photos` (public read; insert/update/delete for authenticated users whose first folder equals their own `specialists.id`; staff all) and specialist insert/delete policies on `listing-images` where the first folder is the id of a listing they own.
- Consumes: `is_staff()`, the `updated_at` trigger function used in `0001_init.sql`.

- [ ] **Step 1: Read** `0001_init.sql` (policy names at lines 188–208, the `updated_at` trigger) and `0002_site_settings.sql` so names and idioms match. Write the migration to the interface above. Make it idempotent where cheap (`if not exists`, `drop policy if exists`).
- [ ] **Step 2: Prepare the RLS checks** (give them to the user in chat as raw SQL; no file is committed). Checks to run in the SQL editor (set `request.jwt.claims` to simulate each user), then report the results:
  - specialist A inserts a listing with `approval_status='approved'` and `is_featured=true` → stored as `draft`/`false`.
  - specialist A updates specialist B's listing → 0 rows.
  - anon selects a `draft`, a `submitted` and an `approved` specialist listing → only the approved one.
  - specialist A sets `status='approved'` on their own `specialists` row → unchanged.
  - `select * from specialists` as anon → denied/empty; `select * from public_specialists` → approved only, no email column.
  - `select suspend_specialist(<id>)` as staff → listings' `specialist_id` null, status `suspended`; as specialist → error.
- [ ] **Step 3: Hand the SQL to the user** as a raw `sql` block and wait for them to confirm they ran it before Task 4 relies on it (code can be written earlier; end-to-end verification needs it).
- [ ] **Step 4: Commit** `feat(specialists): schema, RLS, triggers, RPCs`.

---

### Task 4: `specialist` role in auth

**Files:**
- Modify: `lib/auth/role.ts`, `lib/auth/destination.ts`, `lib/auth/pending-signups.ts`, `app/admin/(panel)/pending-signups/page.tsx` (pass specialists into the builder)
- Test: extend `tests/pending-signups.test.mjs`; create `tests/auth-destination.test.mjs`

**Interfaces:**
- Produces:
  - `PortalRole = "staff" | "owner" | "tenant" | "specialist"`; `RoleContext` gains `specialistId: string | null`.
  - `getCurrentRole()` and `linkAndGetPortalRole()`: after the tenant checks and before the staff fallback, call `link_specialist_account` RPC (the latter only), then look up `specialists` by `auth_user_id`; if found return role `"specialist"` with redirect `/dashboard/specialist`. (Pending/rejected/suspended specialists still get the role; the specialist layout shows the state.)
  - `homeForRole("specialist") === "/dashboard/specialist"`.
  - `resolvePostAuthRedirect`: specialist may `next` any path starting `/dashboard/specialist`.
  - `buildPendingSignups({ authUsers, owners, tenants, staff, specialists })`: `specialists` is `LinkedRecord[]`; specialist applicants are excluded from the pending list.
- Consumes: `link_specialist_account()` from Task 3.

- [ ] **Step 1: Write failing tests:** pending-signups excludes a user matched by an `specialists` record; destination allows `/dashboard/specialist/listings` for specialist and rejects `/admin` for specialist; `homeForRole("specialist")`.
- [ ] **Step 2: Run** `node --test tests/pending-signups.test.mjs tests/auth-destination.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** the role changes. The pending-signups page selects `id,email,auth_user_id` from `specialists` using the existing staff client.
- [ ] **Step 4: Run** full gate. Expected: PASS.
- [ ] **Step 5: Commit** `feat(auth): specialist role`.

---

### Task 5: Specialist application and login entry points

**Files:**
- Create: `app/(marketing)/team/join/page.tsx` and a client form `app/(marketing)/team/join/join-form.tsx`
- Modify: `lib/site.ts` (footer links), `components/site-footer.tsx` only if footer links are not driven from `footerNav` (check first)

**Interfaces:**
- Consumes: `validateSubdomain` (Task 1), `createClient()` from `@/lib/supabase/client`, `getAuthCallbackUrl()` from `@/lib/url`, field primitives from `@/components/forms/fields`, the structure of `app/portal/signup/page.tsx` (confirmation-required flow).
- Produces: a public page `/team/join`: full name, email, password, mobile, requested subdomain (live-validated, hint `<name>.allabodeph.com`), licence mode radio (own PRC licence / accredited under broker) and licence number field (required only for "own"). Submit calls `supabase.auth.signUp` with `options.data = { specialist_application: true, full_name, phone, requested_subdomain, license_mode, license_no }` and `emailRedirectTo: getAuthCallbackUrl()`; shows the same "check your email" confirmation state as portal signup. Existing signed-in users see a message to use a different email.
- Footer gets "Become a property specialist" (`/team/join`) and "Property specialist login" (`/portal/login`).

- [ ] **Step 1:** Read `app/portal/signup/page.tsx` fully and mirror its states (loading, error `role="alert"`, confirmation). All 8 interactive states, validate on blur.
- [ ] **Step 2:** Build the page and form; add footer links.
- [ ] **Step 3: Verify** (needs Task 3 SQL applied): `npm run dev`, apply with a fresh email, confirm the email, land on `/dashboard/specialist` (404 until Task 7 is done; for now confirm an `specialists` row exists with status `pending` and the requested subdomain). Check 320 and 375 px widths for no horizontal scroll.
- [ ] **Step 4: Commit** `feat(specialists): public application page`.

---

### Task 6: Owner approval, broker settings, suspend

**Files:**
- Create: `lib/team/broker.ts`, `app/admin/specialist-actions.ts`, `app/admin/(panel)/specialists/page.tsx`, `app/admin/(panel)/specialists/[id]/page.tsx`
- Modify: `lib/admin/nav-groups.ts` (Marketing group: `{ label: "Specialists", icon: "groups", href: "/admin/specialists" }`), the settings page to include the broker group (read `app/admin/(panel)/settings/page.tsx` first; it already renders `site_settings` groups through `updateSettingsGroup`, so seeded `broker_*` rows with `group_name = 'broker'` may appear automatically; add a group title if needed)

**Interfaces:**
- Produces:
  - `getBroker(): Promise<{ name: string; licenseNo: string } | null>`: reads `broker_name` and `broker_prc_license` from `site_settings` (public-readable); null when licence number is empty.
  - Server actions (staff only, `createClient()`): `approveSpecialist(fd)` (fields `specialist_id`, `subdomain`; runs `validateSubdomain`, checks uniqueness, sets `status='approved'`, `subdomain`), `rejectSpecialist(fd)`, `suspendSpecialistAction(specialistId: string)` (calls RPC `suspend_specialist`), `reinstateSpecialist(specialistId: string)` (status `approved`; listings stay house). All return `{ ok: boolean; message: string }` for use with `useActionState`, and `revalidatePath("/admin/specialists")`, `/team`, `/listings`.
- Admin list shows name, email, status, requested subdomain, licence mode; detail page shows the application, a subdomain field prefilled from the request, and Approve / Reject / Suspend / Reinstate buttons.

- [ ] **Step 1:** Read an existing admin list/detail pair (for example `owners`) and follow its layout and components (`DataTable`, form-kit).
- [ ] **Step 2:** Build the actions and pages. Approving with an invalid or taken subdomain returns a message and changes nothing.
- [ ] **Step 3: Verify:** approve the Task 5 applicant with subdomain `ram`; confirm `public_specialists` returns the row; suspend and confirm it disappears. Try approving `www` and a duplicate; both rejected with clear messages.
- [ ] **Step 4: Commit** `feat(admin): specialist approval, suspension and broker settings`.

---

### Task 7: Specialist dashboard shell, profile, photo

**Files:**
- Modify: `components/dashboard/shell.tsx` (`role` prop accepts `"Specialist"`; account link for specialists → `/dashboard/specialist/profile`; keep existing Owner/Tenant behaviour)
- Create: `app/dashboard/specialist/layout.tsx`, `app/dashboard/specialist/page.tsx`, `app/dashboard/specialist/profile/page.tsx`, `app/dashboard/specialist/actions.ts`, `components/team/photo-cropper.tsx`

**Interfaces:**
- Produces:
  - `layout.tsx`: server component; `getCurrentRole()`; role must be `"specialist"` else `redirect(homeForRole(role))`; loads the specialist row; if `status !== 'approved'` renders a state card (pending: "We're reviewing your application"; rejected; suspended) and no nav; otherwise `DashboardShell role="Specialist"` with nav Overview / My listings / Profile.
  - Overview: counts of own listings by `approval_status`, link to create a listing.
  - Profile page + client form fields: display name, tagline, bio, areas, specialties, languages (comma-separated inputs stored as arrays), years of experience, phone, licence mode and number, licence preview via `licenseLine`, photo.
  - Actions (`"use server"`): `updateSpecialistProfile(_prev, fd): Promise<{ ok: boolean; message: string }>` (updates only own row; edits go live immediately); `uploadSpecialistPhoto(_prev, fd): Promise<{ ok: boolean; message: string }>` (accepts one JPEG ≤ 1.5 MB, `jpegDimensions` must be exactly 800×1000, uploads to `specialist-photos/{specialistId}/portrait.jpg` with upsert, stores `photo_path`).
  - `PhotoCropper` (client): props `{ onCropped: (blob: Blob) => void }`; file input → canvas preview with fixed 4:5 frame, drag to reposition, zoom slider, output 800×1000 JPEG via `computeCenterCrop` as the initial framing. Minimum source size 800×1000, otherwise inline error "Choose a larger photo (at least 800 × 1000 px)".
- Photo guidance text on the page: plain background, good light, head and shoulders.

- [ ] **Step 1:** Read `app/dashboard/owner` layout/page for the established pattern and `components/dashboard/shell.tsx`; follow them.
- [ ] **Step 2:** Implement shell change, layout, overview, profile, actions, cropper.
- [ ] **Step 3: Verify:** pending specialist sees the pending card only; after approval sees the shell. Upload a non-JPEG and a wrong-size file via the action (curl or a form tweak) → rejected. Upload a good photo → stored and shown. Check mobile widths.
- [ ] **Step 4: Commit** `feat(specialists): dashboard shell, profile and portrait upload`.

---

### Task 8: Specialist listings (create, edit, submit)

**Files:**
- Modify: `components/admin/listing-form.tsx` (add `variant?: "staff" | "specialist"` and `actions` props), image manager if it hardcodes admin paths
- Create: `app/dashboard/specialist/listings/page.tsx`, `app/dashboard/specialist/listings/new/page.tsx`, `app/dashboard/specialist/listings/[id]/edit/page.tsx`; extend `app/dashboard/specialist/actions.ts`

**Interfaces:**
- Produces (in `app/dashboard/specialist/actions.ts`):
  - `createSpecialistListing(fd: FormData): Promise<void>`: builds the row with `specialistListingRow`, sets `specialist_id` from `current_specialist_id()` (RPC call), `approval_status: 'draft'`, redirects to the edit page.
  - `updateSpecialistListing(id: string, fd: FormData): Promise<void>`: update with `.select("id")`; zero rows → throw "The listing wasn't updated, so it may have been removed or isn't yours."
  - `submitListingForApproval(id: string): Promise<void>`: sets `approval_status = 'submitted'` only when currently `draft` or `rejected`.
  - `deleteSpecialistListing(id: string): Promise<void>` (same zero-row check).
  - All revalidate `/dashboard/specialist/listings`; and `revalidatePublicListingPaths` equivalent for the public list (extract that function into `lib/admin/revalidate.ts` as part of this task, used by both).
- `ListingForm variant="specialist"`: hides `is_featured`, the PM unit picker and the "Published" status option; keeps seller/internal notes fields (private); shows approval badge and rejection note; adds "Save draft" and "Submit for approval" buttons; the AI description/SEO helpers stay.
- Image upload reuses `uploadListingImages`, `deleteListingImage`, `reorderListingImages` from `app/admin/actions.ts` (they use the session client, so the specialist storage policy from Task 3 applies). If the image manager links to admin paths, make the base path a prop.

- [ ] **Step 1:** Read all of `components/admin/listing-form.tsx` and `listing-images-manager.tsx`; list what to hide for specialists.
- [ ] **Step 2:** Implement variant, actions, pages. Listing list page shows title, status, approval badge, and edit/delete.
- [ ] **Step 3: Verify (as an approved specialist):** create a draft with photos → not visible on `/listings`; submit → still not visible; confirm RLS: editing another specialist's id via a crafted request fails; `is_featured` in a crafted form stays false (check DB).
- [ ] **Step 4: Commit** `feat(specialists): specialist listing management`.

---

### Task 9: Owner listing approval queue

**Files:**
- Modify: `app/admin/(panel)/listings/page.tsx` (add Specialist column and an approval-status filter; default shows `submitted` first), `app/admin/specialist-actions.ts`
- Create: `app/admin/(panel)/listings/[id]/edit` already exists; add an approval panel to it for specialist-owned listings (approve / reject with note)

**Interfaces:**
- Produces: `approveListing(id: string): Promise<void>` (staff; sets `approval_status='approved'`, and `status` to `Available` if it was `Draft`), `rejectListing(id: string, note: string): Promise<void>` (sets `rejected` and `rejection_note`). Both throw on zero rows and revalidate admin and public listing paths.
- Staff can still edit and feature any listing. Reassigning a listing to a different specialist has no UI in this phase.

- [ ] **Step 1:** Read the listings admin page and the edit page.
- [ ] **Step 2:** Implement filter, column, panel, actions.
- [ ] **Step 3: Verify:** approve the submitted listing → appears on `/listings` within the revalidation window or immediately after revalidate; reject → specialist sees the note on the edit page.
- [ ] **Step 4: Commit** `feat(admin): approve or reject specialist listings`.

---

### Task 10: "Listed by" on public listings

**Files:**
- Modify: `lib/data.ts` (`Listing.specialist?: { slug: string; name: string; photoUrl: string | null }`), `lib/listings.ts` (`COLS` adds `specialist_id`; after mapping, one batched `public_specialists` query by ids attaches `specialist`; suspended specialists already have `specialist_id` null), `components/property-card.tsx`, `app/(marketing)/listings/[id]/page.tsx`
- Create: `components/team/listed-by.tsx`, `lib/team/queries.ts` (`specialistPhotoUrl(path)` builds the public bucket URL)

**Interfaces:**
- Produces: `<ListedBy specialist={listing.specialist} size="sm" | "lg" />` rendering "Listed by <name>" with a small circular portrait (initials fallback), linking to `/team/<slug>`; house listings render nothing on the card and "All Abode Property Solutions" on the detail page. The detail page also shows the licence line via `licenseLine` + `getBroker()`.
- Consumes: `getBroker`, `licenseLine`.

- [ ] **Step 1:** Add the data plumbing; keep the mock-data fallback working (no `specialist` on mock rows).
- [ ] **Step 2:** Add `ListedBy` to the card footer and detail page.
- [ ] **Step 3: Verify:** an approved specialist listing shows "Listed by"; a house listing doesn't; suspend the specialist → the line disappears and the listing stays; confirm the card layout is unchanged at 320 px. Inquiries from specialist listings still go to the admin inbox (lead routing is Phase 3).
- [ ] **Step 4: Commit** `feat(listings): show listing specialist on cards and detail`.

---

### Task 11: `/team` directory, minimal profile, navigation

**Files:**
- Create: `app/(marketing)/team/page.tsx`, `app/(marketing)/team/[slug]/page.tsx`, `components/team/specialist-card.tsx`
- Modify: `lib/site.ts` (`mainNav`: replace the `About` item with `{ label: "About", children: [{ label: "About us", href: "/about" }, { label: "Our team", href: "/team" }] }`), `app/sitemap.ts` (add `/team` and approved specialist slugs)

**Interfaces:**
- Consumes: `getPublicSpecialists(): Promise<PublicSpecialist[]>`, `getPublicSpecialist(slug: string): Promise<PublicSpecialist | null>` (from `public_specialists`), `getBroker`, `licenseLine`, `getListings` (filter by `listing.specialist?.slug`).
- Produces: `/team`: `SectionHeading`, broker block first ("Licensed broker" + name), then a responsive grid of `SpecialistCard` (4:5 portrait, name, tagline, areas, a Call/Inquire link), random order per request with the broker pinned first (so the page is dynamic; no static caching). `/team/[slug]`: minimal profile (portrait, name, tagline, bio, licence line, their listings with `PropertyCard`, "More from All Abode" links to property management and valuation); unknown or non-approved slug → `notFound()`; `generateMetadata` and a canonical of `https://allabodeph.com/team/<slug>`.

- [ ] **Step 1:** Read `app/(marketing)/about/page.tsx` and a listings page for the section primitives in use.
- [ ] **Step 2:** Build the pages and card; update nav and sitemap.
- [ ] **Step 3: Verify:** directory shows approved specialists only; hidden after suspension; `/team/ram` renders with licence line and listings; nav dropdown works on desktop and mobile; 320/375/414/768 px: no horizontal scroll, no two-line buttons.
- [ ] **Step 4: Commit** `feat(specialists): team directory and profile page`.

---

### Task 12: End-to-end check and project notes

**Files:**
- Modify: `/Users/jojo/allabode/CLAUDE.md` (Build status: add a "DONE: Specialist accounts and listings (Phase 1)" entry; include the manual steps: run the migration, run `setup-storage.sql`, set the broker licence number in Settings, approve the first specialist)

- [ ] **Step 1:** Run the full gate: `npx tsc --noEmit`, `npx eslint .`, `node --test tests/*.test.mjs`. All clean.
- [ ] **Step 2:** Walk the flow with `npm run dev`: apply as specialist → confirm email → pending state → owner approves with subdomain → specialist completes profile and photo → specialist creates listing with photos and submits → owner approves → listing on `/listings` with "Listed by" → `/team` and `/team/<slug>` render → owner suspends → specialist's listing stays as house, profile 404s, specialist area shows suspended state.
- [ ] **Step 3:** Run each RLS check from Task 3 and record the result.
- [ ] **Step 4:** Update `CLAUDE.md`; commit `docs: record specialist Phase 1`.
