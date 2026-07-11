---
name: All Abode Property Solutions
description: Modern minimal real estate platform — navy anchor, sparing brass accent, architectural sharpness
colors:
  all-abode-navy: "#0a2540"
  navy-deep: "#0c2f52"
  navy-link: "#0d518c"
  navy-tint: "#1a4d7c"
  warm-brass: "oklch(69% 0.087 85)"
  warm-brass-deep: "oklch(60% 0.10 85)"
  warm-brass-soft: "oklch(85% 0.06 85)"
  warm-brass-ink: "oklch(54% 0.087 85)"
  near-black-ink: "#16202c"
  muted-slate: "#5b6573"
  slate-soft: "oklch(58% 0.015 250)"
  hairline: "oklch(90% 0.006 250)"
  hairline-strong: "oklch(82% 0.01 250)"
  barely-warm-white: "oklch(99% 0.004 90)"
  surface: "oklch(99.5% 0.002 95)"
  surface-alt: "oklch(96% 0.006 90)"
  status-available: "#10b981"
  status-reserved: "#f59e0b"
  status-sold: "#ba1a1a"
  status-success: "#0f9d58"
  status-error: "#ba1a1a"
  status-error-bg: "#fdecea"
  focus-ring: "#0d518c"
typography:
  display:
    fontFamily: "Inter Tight, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter Tight, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter Tight, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.25
  lead:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.12em"
rounded:
  sm: "0.125rem"
  md: "0.25rem"
  lg: "0.5rem"
  xl: "0.75rem"
  2xl: "1rem"
  full: "9999px"
spacing:
  gutter: "1.5rem"
  stack-sm: "0.5rem"
  stack-md: "1rem"
  stack-lg: "2rem"
  section: "5rem"
  section-lg: "7rem"
components:
  button-primary:
    backgroundColor: "{colors.all-abode-navy}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.navy-deep}"
  button-gold:
    backgroundColor: "{colors.warm-brass}"
    textColor: "{colors.all-abode-navy}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  button-gold-hover:
    backgroundColor: "{colors.warm-brass-deep}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.all-abode-navy}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  card:
    backgroundColor: "{colors.surface}"
    padding: "24px"
    rounded: "0px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.near-black-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
---

# Design System: All Abode Property Solutions

## 1. Overview

**Creative North Star: "The Brass Anchor"**

All Abode Navy is the anchor — the color that carries the site's weight and reads
as stability and licensed credibility. Warm Brass is the one accent that marks the
moments that matter: a primary CTA, an active state, a credential badge. It never
carpets a page; its rarity is what makes it read as considered rather than
decorative. Around that pairing sits generous whitespace, near-white surfaces, and
sharp, architectural corners on the working surfaces (cards, inputs) — softened
only where the system deliberately signals "interactive and premium" (the floating
pill nav, pill-shaped CTAs). The voice is modern, warm, and professional: precise
enough to read as a licensed operator, warm enough to invite a first-time property
owner in.

This system explicitly rejects the generic, interchangeable real-estate-listing
template (stock hero carousels, no distinct identity), the informal individual
broker's Facebook-marketplace feel, and — on the portal/admin side specifically —
the bolted-on corporate-SaaS-dashboard cliché (gradient hero-metric cards,
disconnected visual language). Every surface, marketing or portal, is the same
brand at the same register.

**Key Characteristics:**
- Navy-anchored, brass-accented — one warm color, used sparingly and only with intent.
- Sharp/architectural radius by default; rounded-full/2xl reserved for the floating nav and pill CTAs.
- Flat-at-rest surfaces; shadow is a hover/lift response, never a resting-state default.
- Single font lineage (Inter Tight + Inter) — genuinely distinct optical cuts, one loading footprint.
- Dashboards and marketing share one token system; neither reads as a separate product.

## 2. Colors

Navy-anchored and restrained: one dominant brand navy, one warm brass accent used at low frequency, and a near-white (not saturated-cream) neutral scale underneath.

### Primary
- **All Abode Navy** (#0a2540): Primary brand color — hero bands, primary button fills, dark branded surfaces, the floating nav bar when scrolled.
- **Navy Deep** (#0c2f52): Hover/pressed state for navy fills, subtle gradients.
- **Navy Link** (#0d518c): Links, focus rings, secondary emphasis, active nav item underline.
- **Navy Tint** (#1a4d7c): Tertiary navy accent, used sparingly for tint variation.

### Secondary
- **Warm Brass** (oklch(69% 0.087 85)): The single accent color — CTAs (`gold` button variant), credential badges, on-dark text/icon use. Meets AA contrast on navy surfaces only.
- **Warm Brass Deep** (oklch(60% 0.10 85)): Hover/pressed state for brass fills.
- **Warm Brass Soft** (oklch(85% 0.06 85)): Light brass tint for badges on navy.
- **Warm Brass Ink** (oklch(54% 0.087 85)): Same brass hue, darkened for 4.5:1 contrast — use for brass text, links, and icons on light (cream/surface) backgrounds. Never use raw Warm Brass for text on light surfaces; it fails contrast there.

### Neutral
- **Near-Black Ink** (#16202c): Primary body text on light surfaces — deliberately distinct from the brand navy so text and brand color never get confused.
- **Muted Slate** (#5b6573): Secondary body text, captions.
- **Slate Soft** (oklch(58% 0.015 250)): Placeholder text, lowest-emphasis labels.
- **Hairline** (oklch(90% 0.006 250)): Default border/divider color — the resting-state boundary treatment for cards, sections, dropdowns.
- **Hairline Strong** (oklch(82% 0.01 250)): Emphasized borders, default input outlines.
- **Barely-Warm White** (oklch(99% 0.004 90)): Page background. Deliberately near-white with only a trace of warmth — not a saturated cream/sand surface.
- **Surface** (oklch(99.5% 0.002 95)): Cards, elevated panels, inputs — allowed to run near-pure-white.
- **Surface Alt** (oklch(96% 0.006 90)): Alternating section bands, muted fills.

### Status
- **Available** (#10b981), **Reserved** (#f59e0b), **Sold** (#ba1a1a): Listing status pills.
- **Success** (#0f9d58), **Error** (#ba1a1a) / **Error Background** (#fdecea): Form validation states.
- **Focus Ring** (#0d518c): `:focus-visible` ring color across all interactive elements — same value as Navy Link, applied consistently.

### Named Rules
**The Single-Accent Rule.** Warm Brass appears only on the highest-priority CTA, active/selected states, and credential emphasis — never as a background wash, never carpeted across a section. If more than one element on a screen uses brass as a fill, that's a violation.

**The Text-Safe Brass Rule.** Raw Warm Brass is for on-navy use only. On any light surface (cream, surface, surface-alt), brass text/icons/borders always use Warm Brass Ink instead — the same hue, darkened to hold 4.5:1 contrast.

## 3. Typography

**Display Font:** Inter Tight (with ui-sans-serif, system-ui fallback)
**Body Font:** Inter (with ui-sans-serif, system-ui fallback)

**Character:** A single-family lineage split across two optically distinct cuts — Inter Tight's tighter tracking and heavier weights carry headlines with geometric confidence; Inter's more neutral, workhorse forms carry body copy without competing for attention. Warm and inviting in feel, never severe.

### Hierarchy
- **Display** (700, 3.5rem/56px, line-height 1.05, letter-spacing -0.02em): Hero headlines only, one per page.
- **Headline** (700, 3rem/48px, line-height 1.1, letter-spacing -0.02em): Section-level page titles.
- **Title** (600, 2rem/32px, line-height 1.25): Sub-section headings, card group titles.
- **Lead** (400, 1.125rem/18px, line-height 1.6): Intro paragraphs directly under a headline.
- **Body** (400, 1rem/16px, line-height 1.65): Default running copy. Cap prose measure at 65–75ch.
- **Label** (600, 0.75rem/12px, line-height 1, letter-spacing 0.12em, uppercase): Eyebrows, micro-labels, button text, form field labels — the `label-caps` utility.

### Named Rules
**The Label-Caps Rule.** Every eyebrow, micro-label, button label, and form-field label uses the same `label-caps` treatment (uppercase, 0.12em tracking, 600 weight, 12px) — no ad hoc uppercase styling elsewhere in the system.

## 4. Elevation

Flat-at-rest, tonal on interaction. Surfaces default to a hairline border (Hairline / Hairline Strong) with no shadow; shadow is introduced only as a response to state — hover on a card, or lift on a floating/overlay surface (dropdown panel, mobile nav drawer, modal). There is no ambient resting-state shadow anywhere in the system.

### Shadow Vocabulary
- **Card** (`0 1px 2px rgba(10,37,64,0.04), 0 8px 24px -12px rgba(10,37,64,0.12)`): Property card and similar content-card hover state only.
- **Lift** (`0 12px 32px -12px rgba(10,37,64,0.22)`): Mobile nav drawer, header dropdown panels, modals — surfaces that float above the page.

### Named Rules
**The Flat-at-Rest Rule.** Every surface is flat (hairline border, no shadow) by default. Shadow is exclusively a hover or lift response, never a resting-state decoration.

## 5. Components

Warm and inviting in hand: generous internal padding, confident solid fills on primary actions, and softened pill shapes exactly where the system wants to signal "touch this" (nav, top-priority CTAs) — while cards and inputs stay sharp and precise.

### Buttons
- **Shape:** `rounded-lg` (8px) by default; `rounded-full` reserved for the floating-nav-embedded CTA and select pill-shaped promotional buttons.
- **Primary:** Solid All Abode Navy fill, white label, hover to Navy Deep. The workhorse CTA.
- **Gold:** Solid Warm Brass fill, navy label, hover to Warm Brass Deep. Reserved for the single highest-priority action per page (e.g. "List Your Property") — never a second gold button on the same screen.
- **Secondary:** Transparent fill, Warm Brass Ink border + label, hover fills to Warm Brass Ink with white label.
- **Ghost:** Transparent fill, navy border + label, hover fills to navy with white label.
- **Ghost-Light:** White/10 fill + white/30 border + backdrop-blur, for use over photographic or dark hero backgrounds.
- **White:** Solid white fill, navy label, navy/25 drop shadow — for CTAs over photographic hero backgrounds needing more contrast than Ghost-Light.
- **Navy-Glass:** Navy/65 fill + backdrop-blur + white/60 border — a stronger glass treatment for busy photographic backgrounds where a plain outline is too faint.
- **Padding:** `md` = 12px/24px; `lg` = 16px/32px. Label always uses the Label type role.
- **States:** `active:scale(0.98)` on press; `:focus-visible` gets a 2px outline with 2px offset (never animated); `:disabled` drops to 50% opacity with pointer-events removed.

### Cards
- **Corner Style:** Sharp — no border-radius. The Property Card and similar content cards are square-cornered by design (see Named Rule below).
- **Background:** Surface (near-pure-white).
- **Border:** 1px Hairline at rest.
- **Shadow Strategy:** Flat at rest; Card shadow only on hover (see Elevation).
- **Internal Padding:** 24px.
- **Signature behavior:** image band (4:3) scales to 105% on hover over 700ms; status pill (rounded-full) sits top-left on the image; a circular navy/70 + backdrop-blur icon button sits top-right.

### Inputs
- **Style:** `rounded-md` (4px), 1px Hairline Strong border, Surface background.
- **Focus:** Border shifts to Navy Link, 2px ring at 15% opacity (`focus:ring-navy-700/15`).
- **Error:** Border and ring shift to the Error color at the same 15% ring opacity; paired with a `label-caps` label above the field.

### Navigation (N5 Floating Pill — signature component)
- **Style:** Fixed floating bar, not a full-width bordered header. `rounded-2xl`, backdrop-blur-md. At page top: cream/85 background, Hairline/70 border. Once scrolled: navy/95 background, white/10 border — the bar itself changes register to match what's beneath it.
- **Dropdowns:** Rounded-lg surface panels, Hairline border, Lift shadow.
- **Mobile:** Full-height drawer sliding in at 82% width, cream background, Lift shadow.

### Footer (Ft2/Ft5 hybrid)
- **Style:** A flowing mast plus inline link groups and a single-line contact row — deliberately not a 4-column links-plus-social-row grid.

### Named Rules
**The Sharp-Unless-Floating Rule.** Corners are sharp (0–4px) on every working surface — cards, inputs, dropdown panels — by default. `rounded-full` / `rounded-2xl` are reserved exclusively for the floating nav bar and pill-shaped CTAs; using a soft radius anywhere else breaks the architectural discipline.

## 6. Do's and Don'ts

### Do:
- **Do** anchor every surface in All Abode Navy as the dominant brand color, with Warm Brass appearing only on the single highest-priority action or credential moment per screen.
- **Do** keep corners sharp (0–4px radius) on cards, inputs, and panels — reserve `rounded-full` / `rounded-2xl` exclusively for the floating nav and pill CTAs (see The Sharp-Unless-Floating Rule).
- **Do** keep every surface flat-at-rest; introduce shadow only as a hover or lift response (see The Flat-at-Rest Rule).
- **Do** use Warm Brass Ink, never raw Warm Brass, for brass text/icons/borders on any light (cream/surface) background.
- **Do** apply the same `label-caps` treatment to every eyebrow, button label, and form-field label (see The Label-Caps Rule).
- **Do** keep dashboards and portals on the same navy/brass/sharp-corner system as the marketing site — one company, one visual language.

### Don't:
- **Don't** let any page read as a generic, interchangeable real-estate-listing template — no stock hero carousels, no templated "browse-everything" look with no distinct identity.
- **Don't** let any surface read like an informal individual broker's Facebook-marketplace page. Every surface reinforces "licensed firm," not "individual agent."
- **Don't** bolt a generic corporate-SaaS-dashboard look onto the portal/admin side — no gradient hero-metric cards, no visual language that breaks from the marketing brand.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe anywhere in the system.
- **Don't** use gradient text (`background-clip: text` with a gradient) for emphasis; emphasis comes from weight, size, or the Label role.
- **Don't** let Warm Brass carry more than one element's fill on a given screen — its rarity is the point (see The Single-Accent Rule).
