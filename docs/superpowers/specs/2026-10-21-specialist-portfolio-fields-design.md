# Specialist portfolio fields: design

Status: draft for owner review. Not built. Build after the portfolio page redesign ships.

## Intent

The redesigned specialist page reads like a real portfolio, but a profile today only holds a name, tagline, bio, areas, specialties, languages, years and a photo. A real portfolio also shows **client testimonials, past closed deals, social links and an intro video**. This adds those four things, with the owner keeping control of anything that makes a claim under the All Abode brand.

## Goals

- A property specialist can add and edit testimonials, closed deals, social links and an intro video from their dashboard.
- The public profile (`allabodeph.com/team/<name>` and `<name>.allabodeph.com`) shows only approved content, in the portfolio design.
- The owner can approve, reject or remove any testimonial or deal, and can remove social links and video.
- Nothing private reaches the public (client contact details, exact addresses, prices unless the owner later allows them).

## Non-goals (v1)

- Photos on closed deals, ratings/stars, review import from Google or Facebook, a public "leave a review" form for clients.
- Specialists writing their own HTML or embedding arbitrary iframes.
- Analytics on views or clicks.

## Anti-goals (a failure even if it works)

- Fabricated or unverifiable testimonials appearing under the All Abode name without the owner's review.
- A video or social link that loads third-party trackers on every profile view.
- Client names, phone numbers, addresses or other personal data published by mistake.
- Links that lead visitors to unsafe or unrelated sites.

## The four fields

**1. Testimonials** (several per specialist, max 12)
- Fields: client display name (first name and last initial, e.g. "Maria S."), a short label (e.g. "Tenant, Makati"), quote (max 500 characters), month and year.
- A required checkbox: "I have this client's permission to share this."
- Needs owner approval before it shows publicly.

**2. Closed deals** (several, max 24)
- Fields: type (sold, leased, or property management), property type (condo, house and lot, commercial, lot, and so on), area (city or district only), year, optional one-line note (max 160 characters).
- No client names, no street addresses, no prices in v1.
- Needs owner approval before it shows publicly. The public page shows a "closed deals" count and a short list.

**3. Social links** (live as soon as saved)
- One URL each for Facebook, Instagram, LinkedIn, TikTok and YouTube. Only profile or page URLs on those exact domains are accepted; anything else is rejected with a clear message.
- Rendered as icon links that open in a new tab with `rel="noopener noreferrer"`.

**4. Intro video** (live as soon as saved)
- One YouTube or Vimeo link. The site stores only the provider and video id and rebuilds the embed itself.
- The video shows as a poster with a play button; the third-party player only loads after the visitor clicks, so profile views set no tracking cookies.

## Approval model (the one open question)

My recommendation: testimonials and closed deals need the owner's approval, because they are claims made under the firm's brand. Social links and the video go live immediately, because they are constrained (allow-listed domains, fixed embed) and easy to remove. This matches the earlier rule that profile edits go live without re-review, with the exception of things that make claims.

## How it is built

- **Database** (one new migration you run in the Supabase SQL editor): two tables, `specialist_testimonials` and `specialist_deals`, each with `specialist_id`, the fields above, `status` (`pending`, `approved`, `rejected`), `rejection_note`, timestamps. Two new columns on `specialists`: `social_links` (json, validated) and `intro_video` (provider + id). Row-level rules mirror the existing ones: a specialist can only touch their own rows, can never set `status` to approved, and editing an approved item sends it back to `pending`. Staff can do everything.
- **Public window:** the existing `public_specialists` view gains social links and the video; two new views expose only approved testimonials and deals (no ids that leak private data).
- **Dashboard:** a new **Portfolio** page under `/dashboard/specialist` with four sections, add/edit/delete, counts against the limits, and a status badge on each item (Pending review, Approved, Needs changes).
- **Owner:** a **Portfolio review** queue in the admin (like the listing approval queue) with approve, reject with a note, and remove. The Overview page shows "N portfolio items awaiting review".
- **Public page:** new sections on the redesigned profile render only when approved content exists: "What clients say", "Recent closed deals", social icons in the hero, and the video block.
- **Reuse:** the existing specialist action pattern (staff-check first, session client, status-guarded updates), the listing approval panel pattern, `revalidatePath` on `/team/[slug]` after any change.

## Plan (4 tasks, built one at a time)

1. **Database and rules:** migration, row-level rules, triggers, public views, rule checks.
2. **Specialist dashboard:** the Portfolio page with the four editors and validation (URL allow-list, video id parsing, length limits).
3. **Public rendering:** the profile sections, the click-to-load video, structured copy, empty states.
4. **Owner review:** the approval queue, takedown, and the Overview pointer.

## Decided by me (change if you disagree)

- Testimonial names are shortened to first name plus last initial.
- Edits to an approved testimonial or deal send it back for review.
- Limits: 12 testimonials, 24 deals.
- Prices and photos on deals are left out of v1.
- The video loads only after a click.
