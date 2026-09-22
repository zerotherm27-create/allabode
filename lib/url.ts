export function getPublicSiteUrl() {
  if (typeof window !== "undefined") return window.location.origin;

  // Trimmed defensively: the Vercel env var has been observed with a
  // trailing newline baked in, which — left unstripped — corrupts every
  // URL built from it (sitemap.xml entries, the robots.txt Sitemap:
  // directive) by splitting "https://host" and the path across two lines.
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return "http://localhost:3000";
}

export function getAuthCallbackUrl() {
  return `${getPublicSiteUrl()}/auth/callback`;
}

export function getAuthRedirectUrl(next?: string) {
  const url = new URL(getAuthCallbackUrl());
  if (next) url.searchParams.set("next", next);
  return url.toString();
}
