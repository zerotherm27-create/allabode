// Pure, import-free (unit tested directly via tests/helpers/load-ts.mjs).
//
// The specialist microsite's page layouts. A layout only decides the hero and
// the order of the sections under it; every section is the same component in
// all three, so they stay one design on the same tokens.

export const MICROSITE_LAYOUT_KEYS = ["signature", "editorial", "listings"] as const;
export type MicrositeLayout = (typeof MICROSITE_LAYOUT_KEYS)[number];

export const DEFAULT_LAYOUT: MicrositeLayout = "signature";

export const MICROSITE_LAYOUTS: Record<MicrositeLayout, { name: string; description: string }> = {
  signature: {
    name: "Signature",
    description: "Your portrait across the full page with your name over it, and one-tap contact links.",
  },
  editorial: {
    name: "Editorial",
    description: "The same full-width portrait on a light page. Calm and personal.",
  },
  listings: {
    name: "Listings first",
    description: "A compact introduction, then your properties straight away.",
  },
};

/** A stored or requested layout key; anything unknown (or a missing column) is the default. */
export function parseLayout(value: unknown): MicrositeLayout {
  return typeof value === "string" && (MICROSITE_LAYOUT_KEYS as readonly string[]).includes(value)
    ? (value as MicrositeLayout)
    : DEFAULT_LAYOUT;
}

/** True only for an exact known key (used to 404 a malformed preview URL). */
export function isMicrositeLayout(value: unknown): value is MicrositeLayout {
  return typeof value === "string" && (MICROSITE_LAYOUT_KEYS as readonly string[]).includes(value);
}
