import type { ReactNode } from "react";

/**
 * Extension point for portfolio fields that do not exist yet. Each key maps to
 * one future section; add the field to `public_specialists` + PublicSpecialist,
 * pass it through `extras`, and give it a renderer below. Until then every
 * renderer returns null, so nothing shows on the page.
 *
 * Rules for whoever fills these in: only real, specialist-supplied data (no
 * sample testimonials or invented deal counts), plain text (no HTML), and the
 * same locked tokens and section rhythm as components/team/profile-*.tsx.
 */
export type PortfolioExtras = {
  /** Client quotes the specialist has permission to publish. */
  testimonials?: { quote: string; author: string; context?: string }[];
  /** Closed transactions, shown as a list of past properties. */
  closedDeals?: { title: string; location: string; kind: "leased" | "sold" }[];
  /** Public professional profiles (e.g. LinkedIn, Facebook page). */
  socialLinks?: { label: string; href: string }[];
  /** Short intro video (hosted URL). */
  introVideoUrl?: string;
};

const renderers: { [K in keyof PortfolioExtras]-?: (value: NonNullable<PortfolioExtras[K]>) => ReactNode } = {
  testimonials: () => null,
  closedDeals: () => null,
  socialLinks: () => null,
  introVideoUrl: () => null,
};

/** Renders whichever future sections have data. Today: always nothing. */
export function ProfileExtras({ extras }: { extras?: PortfolioExtras }) {
  if (!extras) return null;
  const keys = Object.keys(renderers) as (keyof PortfolioExtras)[];
  const sections = keys.flatMap((k) => {
    const value = extras[k];
    if (value == null || (Array.isArray(value) && value.length === 0)) return [];
    const node = (renderers[k] as (v: typeof value) => ReactNode)(value);
    return node == null ? [] : [<div key={k}>{node}</div>];
  });
  return sections.length > 0 ? <>{sections}</> : null;
}
