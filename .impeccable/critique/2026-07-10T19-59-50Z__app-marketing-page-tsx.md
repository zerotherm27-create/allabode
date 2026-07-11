---
target: app/(marketing)/page.tsx
total_score: 29
p0_count: 0
p1_count: 2
timestamp: 2026-07-10T19-59-50Z
slug: app-marketing-page-tsx
---
Method: dual-agent (A: critique-assessment-a · B: critique-assessment-b)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | FAQ accordion, chat widget, nav active-states all give clear feedback |
| 2 | Match System / Real World | 3 | Correct PH real-estate vocabulary throughout; "bedspace leasing" is unexplained local jargon |
| 3 | User Control and Freedom | 3 | Mobile drawer closes via backdrop/X; no Escape-key handler |
| 4 | Consistency and Standards | 2 | Same action ("List My Property") gets two different visual priorities on one page — violates the design system's own Single-Accent Rule |
| 5 | Error Prevention | 3 | No destructive actions on this page |
| 6 | Recognition Rather Than Recall | 4 | Every icon ships with a text label; no icon-only nav |
| 7 | Flexibility and Efficiency | 2 | No shortcuts/power paths — expected for a marketing homepage |
| 8 | Aesthetic and Minimalist Design | 3 | Generally restrained; docked for a 7-link CTA pile-up in the first fold-and-a-half |
| 9 | Error Recovery | 3 | Chat widget has a plain-language retry message; nothing else can error |
| 10 | Help and Documentation | 3 | FAQ preview + "View All FAQs" + chat assistant, all contextual |
| **Total** | | **29/40** | **Good — solid foundation, address Consistency and the CTA pile-up** |

## Anti-Patterns Verdict

**LLM assessment (mostly pass, one real tell):** The page actively resists the standard tells — "What We Do" is a numbered list with an arrow, not an icon-card grid; "How it works" is a connected timeline; "Who We Help" is a flowing divided list. Code comments confirm this was deliberate. No side-stripe borders, gradient text, hero-metric template, or identical card grids. Only two eyebrow labels remain, matching the earlier audit fix.

One real tell: the "What We Do" section numbers services `01–05` (page.tsx:187-211) — but Brokerage/Leasing/Property Management/Valuation/Documentation is a flat services menu, not a sequence. This is the numbered-scaffold reflex applied to non-sequential content, sitting right next to "Our Process," which shows correct usage of the same pattern by contrast.

**Deterministic scan:** `detect.mjs` returned exit code 2 with 3 confirmed findings, all real (cross-checked against DESIGN.md's type ramp and app/globals.css, none are false positives):
- `app/(marketing)/page.tsx:110` — hero H1 uses arbitrary `text-[2.25rem]` (not a documented token step)
- `components/sections.tsx:118` — the shared `PageHero` component's H1 uses the same arbitrary `text-[2.25rem]`
- `components/property-card.tsx:36` — status pill uses `text-[10px]`, below the smallest documented type step (0.75rem/12px)

The live browser overlay additionally flagged: `gpt-thin-border-wide-shadow` (×2: header nav, dropdown menu), `all-caps-body` (the hero eyebrow, 39 characters of uppercase text), `cramped-padding` (a `border-b` section), `overused-font` (Inter at 64% of text), and `image-hover-transform` (property card image zoom).

**Reconciling the overlay hits:** `overused-font` and `image-hover-transform` are not issues — DESIGN.md documents the single Inter Tight + Inter lineage and the 105% card-image hover zoom as deliberate signature behaviors. The dropdown's `shadow-lift` is explicitly specified in DESIGN.md's Elevation section (floating surfaces get Lift shadow) — also a non-issue. The header nav's persistent shadow is arguably legitimate too (it's a permanently-floating pill nav, never truly "at rest" against the page), but flagging it here since the generic rule doesn't know the design intent — worth a quick gut-check, not a fix. `cramped-padding` and the 39-character all-caps eyebrow are genuinely new, previously-unflagged findings the detector caught that the design review didn't — both are minor and listed below.

## Overall Impression

Solid foundation with real craft: the page consistently resists AI-slop reflexes (numbered-list-not-cards, single-accent gold discipline, reduced-motion done correctly) and scores "Good" on Nielsen's heuristics. But the page's own primary conversion goal is undermined by its own closing moment — the final CTA band spotlights the *secondary* action in gold while the *primary* action (the entire reason PRODUCT.md exists) sits in a faint outline — and diluted by a 7-link CTA pile-up before any real content appears. Meanwhile, the trust-building proof PRODUCT.md explicitly calls out as available (PRC license, testimonials, portfolio) never actually appears on the one page built to establish that trust. Add three confirmed off-token type-size instances from the automated scan, and this reads as a page with genuine design discipline that's tripping over its own CTA hierarchy and leaving real trust assets on the table.

## What's Working

1. **Consistent rejection of the card-grid default.** "What We Do," "Who We Help," and "How it works" each deliberately use a numbered list, a flowing divided-list, and a connected timeline instead of icon-card grids — intentional, documented in code comments.
2. **Single-Accent gold rule enforced almost everywhere.** Across hero, quick-paths, services, trust points, process, and FAQ, gold appears once per section on the highest-priority element only (the one lapse is flagged below).
3. **Token and motion discipline.** No inline hex found anywhere; all `Reveal`/`Stagger` motion collapses to instant under `prefers-reduced-motion` rather than gating visibility behind a class-triggered transition — a detail most AI-generated sites get wrong.

## Priority Issues

**[P1] Gold accent inverted at the page's closing CTA, undermining the stated conversion goal**
- **Why it matters:** PRODUCT.md's belief ladder names "List Your Property" as the primary CTA and "Contact" as the secondary fallback. The Final CTA band does the opposite — gold goes to "Contact All Abode" while "List My Property" is downgraded to a faint `ghost-light` outline — at the exact moment (peak-end) a persuaded visitor is most likely to act.
- **Fix:** Swap variants in `page.tsx:372-378` — `gold` on "List My Property," `ghost-light` on "Contact All Abode" and "Request Valuation."
- **Suggested command:** `/impeccable polish`

**[P1] Redundant CTA sets create a 7-option decision wall before any real content**
- **Why it matters:** 3 hero buttons + a 4-item quick-paths strip (3 of them verbatim duplicates of the hero buttons) present 7 near-identical options one screen apart, well past the ≤4-item working-memory ceiling, diluting the one action the business most wants.
- **Fix:** Pick one CTA taxonomy — either drop the quick-paths strip's overlap with the hero (keep only "Get Property Management," the one non-duplicate), or trim the hero to primary + one secondary and let quick-paths carry full wayfinding.
- **Suggested command:** `/impeccable distill`

**[P2] No licensing/credential proof anywhere on the homepage**
- **Why it matters:** The entire market position ("only PRC-licensed firm…") and PRODUCT.md's own "Proof on hand" strategy depend on visible credentials — none appear. "Why work with All Abode" is five prose bullets asserting licensure with no badge, number, verification link, testimonial, or team photo. For a first-time owner comparing All Abode against an informal Facebook-marketplace broker (the named anti-reference), an assertion alone doesn't close that trust gap.
- **Fix:** Add a license badge/number or verification link near the trust-points section; add at least one testimonial or logo strip once assets exist (`.impeccable/assets/proof/`).
- **Suggested command:** `/impeccable clarify`

**[P2] Design-system drift: non-sequential numbering plus three off-token type sizes**
- **Why it matters:** Two related but distinct drifts. First, the "01–05" numbering on the flat services menu is the exact numbered-scaffold pattern SKILL.md bans, applied where "Our Process" right below it shows the *correct* use of the same device for a real sequence. Second, the automated scan confirmed three arbitrary font sizes with no home in DESIGN.md's type ramp: the hero H1 and the shared `PageHero` component both use `text-[2.25rem]` (between the documented `title` (2rem) and `headline` (3rem) steps), and the property-card status pill uses `text-[10px]` (below the smallest documented step, 0.75rem). Because the 2.25rem value is used consistently in two places, this may actually be a missing token rather than a one-off mistake.
- **Fix:** Drop the `01–05` markers on the services list (an icon or the existing divider rule already carries the visual rhythm). For the type sizes: either fold `2.25rem` back to the nearest real step, or promote it to a documented token if the fluid hero scale genuinely needs an intermediate size; bump the status-pill text to the nearest real step (0.75rem) or confirm 10px is an accepted micro-label exception.
- **Suggested command:** `/impeccable typeset`

**[P3] Hero mobile contrast risk and unexplained local jargon**
- **Why it matters:** The hero's `bg-cover bg-center` re-crops the same photo on narrow viewports so the gold subheading can land over the photo's brightest region, visibly reducing contrast versus the desktop crop. Separately, "bedspace leasing" in the Leasing service blurb is unexplained PH-specific rental jargon that could confuse first-time or non-Filipino visitors.
- **Fix:** Add a stronger scrim behind hero copy specifically on narrow viewports; gloss "bedspace leasing" inline once.
- **Suggested command:** `/impeccable harden`

## Persona Red Flags

**Jordan (Confused First-Timer):** Sees "List My Property" as a gold pill in the hero, then "List My Property" again as a plain text link seconds later — nothing distinguishes them, so Jordan can't tell if they lead to the same place. Hits "bedspace leasing" with zero definition. Is trying to answer "is this a licensed, real company" and finds only a prose sentence, no badge or number to confirm it in a 5-second scan.

**Riley (Deliberate Stress Tester):** Flags the hero-vs-final-CTA inconsistency immediately — identical destination, two wildly different visual treatments in two sections of the same page, a textbook "inconsistent behavior for the same action" red flag. Would test the zero-featured-listings edge case; nothing in the code shows a fallback message if featured listings return empty.

**Casey (Distracted Mobile User):** On a 375px screen, the hero alone is eyebrow + 3-line headline + subheading + body paragraph + 3 full-width stacked buttons before anything else. Immediately after reaching the CTAs, the quick-paths strip repeats 2 of the same 3 labels — wasted thumb-scroll distance. The hero photo-crop contrast issue lands worst here, in Casey's exact context (outdoor light, quick glance).

**Project-specific — "Nora," a first-time Philippine property owner deciding whether to list** (derived from PRODUCT.md's Users section, explicitly contrasted against "an informal individual broker's Facebook-marketplace page"): The one page built to answer "can I trust this firm" never shows a license number, certificate, or verification link — only prose asserting it. Zero testimonials, client logos, or team/office photos, despite PRODUCT.md naming these as "proof on hand." When she's finally ready to act, the page's spotlighted gold button says "Contact All Abode," not "List My Property" — an unnecessary detour from her actual intent at the exact moment she'd convert.

## Minor Observations

- The three CTA zones (hero: 3 items, quick-paths: 4, final CTA: 3) don't share the same set — "Get Property Management" only appears in quick-paths, "Contact" only in the final band — signaling the CTA taxonomy was never fully rationalized as one system.
- `hero_image` defaults to an empty string in the settings schema; if that admin setting is ever cleared, the hero ships with zero imagery on a brand-register page. Worth a hard-coded fallback image at the code level.
- Mobile drawer has no Escape-to-close handler, only backdrop-click and the X button.
- The chat widget and PWA install banner both anchor to the bottom of the viewport — worth a manual check they don't collide on a small phone when both are present.
- The hero eyebrow ("Real estate services in the Philippines," 39 characters) is a long run of uppercase text — all-caps readability degrades at length; consider sentence case or a shorter label for this specific instance.
- A `border-b` section was flagged for cramped padding against its border/background combo — worth a quick visual check, not confirmed as a real problem.
- **Unconfirmed tooling caveat:** Assessment A observed a translucent gray-blue haze over the hero at 375px/768px (making CTAs look disabled) that didn't reproduce at 1280px across two loads, with no matching DOM overlay found — flagged as possible browser-preview sandbox flakiness rather than a confirmed bug. Worth a two-minute manual check on a real phone or Chrome DevTools device mode before treating it as real.

## Questions to Consider

1. If a visitor only remembers one button today, the site wants it to say "List My Property" — so why does the page's own closing moment hand the gold spotlight to "Contact" instead?
2. The page offers 7 way-finding links before the first real content block — what would this homepage look like with exactly one clear next step per zone?
3. PRODUCT.md names PRC license, testimonials, and portfolio as the "proof on hand" for trust — why does none of that proof actually appear on the one page built to answer "can I trust this firm"?
