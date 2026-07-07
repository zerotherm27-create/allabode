# All Abode Property Solutions — Design Tokens

Design system: **Modern Minimal** (Hallmark redesign, superseding the original
"Prestige Architectural Design" Stitch export). Token *names* were kept stable
across the redesign; token *values* now keep a clear separation between All
Abode's recognizable brand navy and the darker ink used for text. Source of truth
is the `@theme` block in `app/globals.css` — this file is a human-readable mirror
of it.

## Brand Identity

- **Company name:** All Abode Property Solutions
- **Operating entity:** All Abode Brokerage and Valuation OPC
- **Aesthetic:** Modern minimal — light, geometric-sans, warm. Generous whitespace,
  refined hairline borders, pill CTAs, a visible All Abode navy brand anchor,
  separate dark ink for text, and one gold accent used sparingly (CTAs, active
  states, and warm emphasis — never carpeted across a page).

## Core Palette (`app/globals.css` `@theme`)

| Token | Value | Usage |
|---|---|---|
| `--color-navy` | `#0a2540` | Primary All Abode brand navy — hero bands, primary buttons, dark branded surfaces |
| `--color-navy-800` | `#0c2f52` | Darker brand navy variant for hover states and subtle gradients |
| `--color-navy-700` | `#0d518c` | Brand blue for links, focus rings, and secondary emphasis |
| `--color-navy-600` | `#1a4d7c` | Tertiary navy tint |
| `--color-gold` | `oklch(69% 0.087 85)` | True brand brass — CTAs and text/icons on navy bands |
| `--color-gold-bright` | `oklch(60% 0.10 85)` | Deeper brass for hover/pressed state |
| `--color-gold-soft` | `oklch(85% 0.06 85)` | Accent tint (badges, subtle fills) |
| `--color-gold-ink` | `oklch(54% 0.087 85)` | Same hue, darkened for gold text/icons/borders on light backgrounds — `--color-gold` itself only meets AA contrast on dark (navy) surfaces; use `gold-ink` for eyebrows, links, and icons on cream/surface |
| `--color-ink` | `#16202c` | Primary text on light surfaces — deliberately separate from brand navy |
| `--color-slate` | `#5b6573` | Muted body text / captions |
| `--color-slate-soft` | `oklch(58% 0.015 250)` | Placeholder / lowest-emphasis text |
| `--color-line` | `oklch(90% 0.006 250)` | Hairline borders / dividers |
| `--color-line-strong` | `oklch(82% 0.01 250)` | Emphasized borders, input outlines |
| `--color-cream` | `oklch(99% 0.004 90)` | Page background — near-white, barely warm |
| `--color-surface` | `oklch(99.5% 0.002 95)` | Cards / elevated surfaces — allowed near-pure-white |
| `--color-surface-gray` | `oklch(96% 0.006 90)` | Alt section band |
| `--color-focus` | `#0d518c` | `:focus-visible` ring — brand blue |

## Status Colors

| Token | Value | Usage |
|---|---|---|
| `--color-available` | `#10b981` | Listing available |
| `--color-reserved` | `#f59e0b` | Listing reserved |
| `--color-sold` | `#ba1a1a` | Listing sold |
| `--color-success` | `#0f9d58` | Form success state |
| `--color-error` | `#ba1a1a` | Form / validation errors |
| `--color-error-bg` | `#fdecea` | Error banner background |

## Typography

- **Display (`--font-display`):** Inter Tight, 600/700 — tight tracking, geometric.
  Loaded via `next/font/google` as `--font-inter-tight` in `app/layout.tsx`.
- **Body (`--font-body`):** Inter, 400/500/600. Loaded as `--font-inter`.
- Single-family lineage (Inter Tight + Inter) by design — genuinely distinct
  optical cuts while sharing one font-loading footprint.
- **Labels:** `.label-caps` — uppercase, letter-spaced, used for eyebrows and
  micro-labels throughout.

## Layout & Spacing

- **Container:** `.container-site`, max **1280px** (`--container-site`), responsive
  gutters.
- **Section rhythm:** `py-section` (5rem) for standard sections, `py-section-lg`
  (7rem) for hero-scale sections.
- **Radius:** Small/sharp by default on cards and inputs; `rounded-full` / `rounded-2xl`
  reserved for the floating nav bar and pill CTAs (N5 Floating Pill archetype).

## Elevation

- `--shadow-card`: `0 1px 2px rgba(15,20,30,0.04), 0 8px 24px -12px rgba(15,20,30,0.12)`
  — hover state on cards.
- `--shadow-lift`: `0 12px 32px -12px rgba(15,20,30,0.22)` — mobile nav drawer, modals.
- Prefer hairline `border-line` outlines over heavy drop shadows; shadows are a
  hover/lift accent, not a resting-state default.

## Components

- **Buttons:** `primary` = solid brand navy + white text. `gold` = solid gold, used for
  the header/footer CTA only (single-accent discipline). `ghost` / `ghost-light` =
  bordered, transparent bg.
- **Icons:** `lucide-react` SVG components via `<Icon name="..." />`
  (`components/icon.tsx`) — replaced the legacy Material Symbols ligature font.
  Call-site API (`name` strings) unchanged from the old system.
- **Inputs:** 1px `border-line-strong` → gold border + `--color-focus` ring on focus.
  `label-caps` labels above each field.
- **Nav:** N5 Floating Pill — sticky floating rounded bar, not a full-width bordered
  header.
- **Footer:** Ft2/Ft5 hybrid — flowing mast + inline link groups + single-line
  contact row, not a 4-column-links-plus-social-row grid.

## Notes

The original Stitch HTML exports (`design/code/*/index.html`) and screenshots
(`design/screenshots/*.png`) remain as historical reference for content/structure
only — their token values are superseded by this file and `app/globals.css`.
