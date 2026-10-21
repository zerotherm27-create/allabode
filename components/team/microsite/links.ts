import { footerNav, site } from "@/lib/site";

/**
 * On <name>.allabodeph.com the proxy 307-redirects every path except the
 * profile itself, so every microsite link is either an in-page anchor or an
 * absolute URL on the main site built from this one origin.
 */
export const APEX_ORIGIN = `https://${site.domain}`;

export function apexUrl(path: string): string {
  return `${APEX_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export const MICROSITE_NAV = [
  { label: "Home", href: "#top" },
  { label: "Properties", href: "#properties" },
  { label: "Our services", href: "#services" },
  { label: "Our team", href: apexUrl("/team") },
  { label: "Contact", href: "#contact" },
] as const;

export const MICROSITE_LEGAL_LINKS = footerNav.compliance.map((l) => ({
  label: l.label,
  href: apexUrl(l.href),
}));
