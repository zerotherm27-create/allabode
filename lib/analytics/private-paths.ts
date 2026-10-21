// Import-free on purpose (loaded directly by unit tests).
//
// Paths analytics must never record.

/** Pages whose URL carries a secret (the unsubscribe token in /unsubscribe/<token>). */
const SECRET_PREFIXES = ["/unsubscribe", "/api/unsubscribe"];

function under(p: string, prefix: string): boolean {
  return p === prefix || p.startsWith(`${prefix}/`);
}

export function isSecretUrlPath(pathname: string | null | undefined): boolean {
  const p = String(pathname ?? "");
  return SECRET_PREFIXES.some((prefix) => under(p, prefix));
}

/** First-party tracker: secret URLs plus the admin panel. */
export function isPrivateAnalyticsPath(pathname: string | null | undefined): boolean {
  const p = String(pathname ?? "");
  return under(p, "/admin") || isSecretUrlPath(p);
}
