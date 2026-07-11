---
target: app/(marketing)/page.tsx
total_score: 30
p0_count: 0
p1_count: 0
timestamp: 2026-07-10T20-40-04Z
slug: app-marketing-page-tsx
---
Method: dual-agent (A: critique-assessment-a-r2 · B: critique-assessment-b-r2) — **re-critique**, following the prior 29/40 run and its 5 fixes.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Hover/active states solid; the property-card "Save listing" heart button gives zero feedback because it has no handler at all |
| 2 | Match System / Real World | 3 | Domain language correct; hero's 3 CTAs don't match PRODUCT.md's documented primary/secondary model — Contact never appears in the hero |
| 3 | User Control and Freedom | 3 | Mobile drawer has explicit close + click-outside; no Escape-key handler anywhere in site-header.tsx |
| 4 | Consistency and Standards | 3 | `label-caps` used uniformly; but DESIGN.md's own Single-Accent Rule is now broken — 3 simultaneously-reachable gold "List My Property" buttons (header pill, hero, final band) |
| 5 | Error Prevention | 3 | No destructive actions on this page |
| 6 | Recognition Rather Than Recall | 4 | Every icon has a text label; no icon-only nav |
| 7 | Flexibility and Efficiency | 2 | No shortcuts; no working save/favorite |
| 8 | Aesthetic and Minimalist Design | 3 | Restrained system with real anti-card-grid effort, but the page is ~6,200px tall with 3-button decision points at both bookends |
| 9 | Error Recovery | 3 | No reachable error states on this static page |
| 10 | Help and Documentation | 3 | FAQ preview (first item pre-opened) + persistent chat bubble |
| **Total** | | **30/40** | **Good — up from 29/40. All 5 original P1/P2 issues resolved; severity ceiling dropped from P1 to P2 even though the raw score barely moved** |

**The more meaningful signal than the +1 point:** the previous run had 2 P1s and 3 P2/P3s. This run has **zero P1s** — every remaining issue is P2 or P3. The score is nearly flat because fixing the old issues surfaced new ones (some as direct byproducts of the fixes themselves), not because the fixes didn't work.

## Anti-Patterns Verdict

**LLM assessment: No, this does not read as AI-generated.** Confirmed avoidance of nearly every bound pattern — no card grids, no gradient text, no side-stripe borders, no hero-metric template. The one numbered sequence (How It Works, 1–5) is a real process. Eyebrow-above-heading now appears on only 2 of 9 sections, well under the tell threshold. The one soft tell is structural: "List My Property" now repeats as a solid gold fill in 3 places on one page (header, hero, final band) — less a visual AI-tell, more a not-fully-committed CTA hierarchy.

**Deterministic scan: clean.** `detect.mjs` returned exit code 0, zero findings across all 6 scanned files — the 3 prior `design-system-font-size` violations are fully resolved (verified: `2.25rem` and `10px` no longer appear anywhere in the scanned files; `text-display-sm` and `text-caps` are in place). One near-miss worth noting: the hero CTA button text (`text-[0.72rem]`) sits only 0.02px under the detector's tolerance threshold for the `label` token — not a violation, but the closest a value gets without becoming one.

**Live overlay: 5 of 6 prior findings persist, plus 2 new ones surfaced by the fixes themselves.**
- `gpt-thin-border-wide-shadow` (nav, dropdown), `overused-font` (Inter, single-lineage), `image-hover-transform` (×3, one per card) — all still present, all still DESIGN.md-documented deliberate patterns, still not issues.
- `cramped-padding` on the quick-paths section persists (item count dropped 4→2 as intended, but the flush-padding treatment itself was never touched).
- **New:** the testimonial byline ("Paul David, OFW, Property Owner" / "Paula Lee Nacionales, OFW, Property Owner") reuses the `label-caps` class, which is styled correctly per DESIGN.md's Label-Caps Rule — but at 31 and 41 characters, all-caps rendering degrades readability, the same concern already flagged on the hero eyebrow. This is a direct side effect of the testimonial fix added this round.
- **New:** the footer's legal disclaimer paragraph runs ~112 characters/line — a real, previously-undetected violation of DESIGN.md's own "cap prose measure at 65–75ch" rule, unrelated to anything touched this round.

## Overall Impression

Genuine progress: all 5 previously-flagged issues are verifiably fixed (CTA-gold-to-the-right-label, CTA-count reduction, credential/testimonial proof, token drift, mobile contrast/jargon), and the severity ceiling dropped from P1 to P2 — the page no longer has anything urgent. But fixing "the final band's gold went to the wrong button" surfaced a subtler problem the first critique didn't have visibility into: gold now marks the *right* CTA in 3 different places at once, which breaks DESIGN.md's own single-accent discipline just as much as the original inversion did, just in the other direction. Combined with a dead "Save listing" button and trust content (license numbers, testimonials) still buried 7 sections down on a 6,200px page, the page's next round of work is less about correctness and more about editorial discipline — deciding what to cut, not what to fix.

## What's Working

1. **All 5 prior fixes verified in place and correct** — CLI scan is clean, CTA order is right, credentials/testimonials render with the real license numbers and quotes, mobile scrim and jargon gloss both present.
2. **Motion is accessibility-correct.** Every reveal/stagger collapses to instant under `prefers-reduced-motion`, verified directly in `components/motion/index.tsx` — content is never gated behind a class-triggered transition.
3. **Resilient data layer.** `getFeaturedListings`/`getSettings` fall back cleanly to mock data/defaults on any Supabase failure — the homepage can't render broken or blank.

## Priority Issues

**[P2] DESIGN.md's own Single-Accent Rule is now broken — 3 simultaneously-visible gold "List My Property" buttons**
- **Why it matters:** The fixed header pill, the hero CTA, and the final-band CTA are all solid-gold "List My Property" — and because the header is `position: fixed`, at least two are on-screen at every scroll position. This directly contradicts DESIGN.md's named rule ("never a second gold button on the same screen") and undercuts the "brass rarity = considered, not decorative" positioning the whole system is built around. This is the direct flip side of the original CTA-inversion fix: correcting *which* label gets gold multiplied how *often* gold appears.
- **Fix:** Keep the header pill as the documented floating-nav exception. Drop the hero and/or final-band repeat to a non-gold treatment (e.g. navy solid or ghost) so gold reads as singular again.
- **Suggested command:** `/impeccable polish`

**[P2] Hero still offers 3 co-equal actions, and Contact never appears in the hero at all**
- **Why it matters:** PRODUCT.md specifies primary = List Your Property, secondary = Contact. The hero instead offers List / Find a Property / Request Valuation — Contact is absent from the hero entirely, and the final band's 3-button spread (2 of them identical `ghost-light` weight) dilutes the closing ask the same way the pre-fix version did, just with fewer total redundant links site-wide.
- **Fix:** Hero: keep "List My Property" as the sole gold CTA, collapse Find/Valuation into one secondary link or a lighter-weight pairing. Final band: List (gold) + Contact (the actual documented secondary) — drop the third repeat.
- **Suggested command:** `/impeccable distill`

**[P2] "Save listing" heart button on every property card is a dead affordance**
- **Why it matters:** Fully styled, hover-responsive, `aria-label="Save listing"` — verified via runtime DOM inspection to have no `onClick` and no bound listener at all. It looks like a working feature until clicked, then does nothing with zero feedback. For a business whose positioning claims "real systems, not spreadsheets," a visibly broken interactive element on the homepage's featured listings undercuts that exact claim.
- **Fix:** Wire it to a real save/favorite mechanism, or remove it until one exists.
- **Suggested command:** `/impeccable harden`

**[P3] Trust content (license numbers, testimonials) sits 7th of 10 sections on a ~6,200px page**
- **Why it matters:** The credentials and testimonials added this round are genuinely the strongest trust signal on the page — real license numbers paired with a matching "OFW, Property Owner" testimonial — but a first-time visitor, especially the OFW-abroad persona the testimonials themselves represent, must scroll past 5 general-marketing sections to reach them. No in-page anchors exist to shortcut there.
- **Fix:** Either add lightweight in-page anchor navigation, or move general sections ("Who We Help," parts of "How It Works") to dedicated pages and pull credentials/testimonials higher.
- **Suggested command:** `/impeccable distill`

**[P3] Footer legal paragraph exceeds DESIGN.md's own measure rule; testimonial bylines are long all-caps runs**
- **Why it matters:** Two small, unrelated drifts the deeper scan caught: the footer disclaimer runs ~112 characters/line against DESIGN.md's documented 65–75ch cap, and the new testimonial bylines (31/41 characters) reuse `label-caps` correctly per the styling rule but are long enough that all-caps hurts legibility — the same concern already flagged on the hero eyebrow, just newly introduced by this round's testimonial addition.
- **Fix:** Wrap/narrow the footer disclaimer to the documented measure; consider sentence case (or just the name, dropping the redundant "Property Owner" role text) for testimonial bylines.
- **Suggested command:** `/impeccable typeset`

## Persona Red Flags

**Jordan (First-Timer):** Faces 3 differently-styled hero buttons (gold/white/glass) and has to parse which applies before doing anything. If Jordan clicks the "Save listing" heart, nothing happens — no confirmation, no error, no state change — and has no way to know if it worked.

**Riley (Stress Tester):** The dead "Save listing" button is exactly Riley's red-flag category — "features that appear to work but silently fail." Would also credit the Supabase-empty fallback path (mock listings) as genuinely well-handled, no broken empty state there.

**Casey (Mobile):** Thumb targets are correctly sized (verified 56px tall stacked hero buttons at 375px), but the primary CTA sits upper-middle of a tall hero, not the bottom thumb zone, and the page is long enough that Casey — easily interrupted, low patience — is likely to bounce before reaching "Licensed and Trusted" (7th of 10 sections). The floating chat bubble is a genuine win for Casey.

**"Marisol," OFW Property Owner Abroad (project-specific — both testimonials are literally labeled "OFW, Property Owner," directly evidencing this persona):** The SEC/PRC license numbers — PRODUCT.md's belief-ladder step 1 — don't appear until the 7th of 10 sections, and the testimonials that match her exactly sit even further down. The site's own settings schema stores WhatsApp/Viber URLs (channels an OFW audience actually uses) but neither is surfaced anywhere on the homepage.

## Minor Observations

- Two sections still reuse the eyebrow pattern ("What We Do," "Our Process") — not a violation, well under the tell threshold, but worth not extending further.
- Testimonials render in a 2-column `divide-x` grid with exactly 2 items; adding a third later would leave an unbalanced lone item in a second row.
- The hero's third CTA uses the `navy-glass` variant next to `white` and `gold` variants in the same row — three distinct button treatments for one decision point, even though each is individually a legitimate documented variant.
- FAQ's first item defaults open, a nice touch avoiding an empty-looking accordion on first paint.
- No `Escape`-key handler on the mobile drawer or login dropdown — a standard convention keyboard users expect.
- Console logged a "Failed to fetch RSC payload... Falling back to browser navigation" message during scroll navigation in both critique sessions — very likely a dev/sandbox artifact given this project's documented environment limitations, not a product bug, but noted for completeness.

## Questions to Consider

1. If the primary CTA really is "List Your Property," why does the hero spend equal visual weight on "Find a Property" and "Request Valuation" — is this a homepage for owners, or one still trying to serve five personas equally in the very first fold?
2. The PRC/SEC license numbers are this firm's single biggest differentiator over an informal broker — why do they live 7 sections down instead of near the hero, where the belief-ladder says they need to land first?
3. Does the "Save listing" heart need to ship now, or would removing it until it's real do more for the "we run on real systems" positioning than a dead button in front of every visitor?
