# All Abode Property Solutions — Design Tokens

Extracted from the Stitch project "All Abode Responsive Website"
(design system: **Prestige Architectural Design**) and the brand logo files.

## Brand Identity

- **Company name:** All Abode Property Solutions
- **Tagline:** "Complete Property Support, All Under One Roof."
- **Aesthetic:** Modern Corporate — luxury real estate / architectural. Stability,
  high-end craftsmanship, trustworthiness. Deep authoritative navy + refined brass
  accent, generous whitespace, crisp geometric lines, minimal decoration.

## Core Brand Colors (from logo + design system)

| Token        | Hex       | Usage |
|--------------|-----------|-------|
| Deep Navy    | `#0A1F44` / `#003A69` | Primary brand, headings, primary buttons |
| Brand Blue   | `#0D518C` | Secondary navy / links / primary-container |
| Warm Gold/Brass | `#B4975A` | Accent, secondary button text/border, dividers, premium chips |
| Gold (bright) | `#E9C349` / `#CCA730` | Tertiary accent highlights |
| Soft Gray    | `#94A3B8` | Muted text, captions |
| Charcoal     | `#1A1C1E` | Body text on light |
| Cream/Off-white | `#F9F9FC` / `#F8F9FF` | Page background / surface |
| White        | `#FFFFFF` | Cards, surface-lowest |
| Status: Available | `#10B981` | Listing available |
| Status: Reserved  | `#F59E0B` | Listing reserved |
| Error        | `#BA1A1A` | Errors |

## Typography

- **Headings:** Montserrat SemiBold (geometric sans, strong)
- **Body:** Inter Regular (highly readable)
- **Labels:** `label-caps` style — uppercase, letter-spaced

## Layout & Spacing

- **Grid:** Fixed 12-col desktop, max container **1280px**, 64px margins.
  Tablet 8-col / 32px. Mobile 4-col / 16px.
- **Spacing base unit:** 4px. Favor 16 / 24 / 32px internal padding.

## Elevation

- Avoid heavy drop shadows. Use **tonal layers** + **1px refined outlines**.
- Light mode: white cards on cream surface, subtle muted-navy 1px border.
- Cards: flat, subtle border, optional 2px brass accent line on header.

## Components

- **Buttons:** Primary = solid Navy + white text. Secondary = Brass label,
  transparent bg, thin Brass border.
- **Inputs:** 1px Navy border → 2px Brass border on focus. `label-caps` labels.
- **Chips/Tags (status):** Navy bg + Brass text (badge-like). E.g. "Exclusive", "Sold".
- **Dividers:** Brass @ 30% opacity horizontal rules.

## Notes

The full Material Design 3 token set (all `surface-*`, `on-*` roles) is embedded in
each screen's `tailwind.config` inside `design/code/<screen>/index.html`. The raw
design-system payload is at `design/code/design-system/design-system.json`.
