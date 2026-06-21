# Prestige Architectural Design

## Brand & Style
The design system embodies a "Modern Corporate" aesthetic that leans heavily into luxury real estate and architectural excellence. It evokes a sense of stability, high-end craftsmanship, and trustworthiness. 

The visual language is characterized by precision and structural integrity. By combining a deep, authoritative navy with a refined brass accent, the system targets a discerning audience looking for professional property solutions. The style utilizes significant whitespace, crisp geometric lines, and a deliberate absence of unnecessary decorative elements to maintain a sophisticated and premium feel.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy on desktop to mirror the structured nature of blueprints and architectural planning. 

- **Desktop:** A 12-column grid with a 1280px maximum container width. Margins are generous (64px) to emphasize luxury through whitespace.
- **Tablet:** 8-column grid with 32px margins.
- **Mobile:** 4-column grid with 16px margins. 

Spacing follows a strict 4px base unit. Component internal padding should favor larger increments (16px, 24px, 32px) to prevent the UI from feeling "cramped" or "budget."

## Elevation & Depth
This design system avoids heavy drop shadows in favor of **Tonal Layers** and **Refined Outlines**. 

Hierarchy is established through color value shifts. In light mode, elevated elements (like cards) use a pure white background against the Tertiary Cream surface, defined by a subtle 1px border in a muted navy tint. 

In dark mode, depth is created by "lifting" surfaces with slightly lighter navy shades (Surface +1, Surface +2). Shadows, when used for high-importance modals, are ultra-diffused navy-tinted shadows with no spread, mimicking ambient light in a physical space.

## Components
- **Buttons:** Primary buttons are solid Navy with white text. Secondary buttons use the Brass color for the label with a transparent background and a thin Brass border.
- **Inputs:** High-contrast fields with a 1px Navy border that transitions to a 2px Brass border on focus. Labels always use the `label-caps` typography style.
- **Cards:** Flat design with a subtle border. No shadows. The card header should often feature a Brass accent line (2px height) to denote premium content.
- **Chips/Tags:** Used for property status (e.g., "Exclusive," "Sold"). These should use the Navy background with Brass text for a high-end, "badge-like" appearance.
- **Dividers:** Use the Brass color at 30% opacity for horizontal rules to subtly tie the branding into the content structure without distracting the eye.