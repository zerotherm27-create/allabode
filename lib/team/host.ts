// Import-free on purpose (loaded directly by unit tests). Keep RESERVED in sync
// with RESERVED_SUBDOMAINS in lib/team/subdomain.ts.
const RESERVED = [
  "www", "admin", "api", "app", "mail", "portal", "dashboard", "specialist",
  "specialists", "team", "ftp", "smtp", "static", "assets", "cdn", "dev",
  "staging", "test", "blog", "help", "support", "login", "signup", "join",
  "webmail", "email", "autodiscover", "cpanel", "mx", "ns1", "ns2", "imap", "pop", "shop", "m",
];

const LABEL = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

/**
 * The specialist slug when `hostHeader` is `<slug>.<rootDomain>` (or
 * `<slug>.localhost` for local testing), else null. Ports are ignored.
 */
export function specialistSlugFromHost(
  hostHeader: string | null | undefined,
  rootDomain = "allabodeph.com",
): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.trim().toLowerCase().replace(/:\d+$/, "");
  let label: string | null = null;
  for (const root of [rootDomain.toLowerCase(), "localhost"]) {
    const suffix = `.${root}`;
    if (host.endsWith(suffix)) {
      label = host.slice(0, -suffix.length);
      break;
    }
  }
  if (!label || label.includes(".")) return null;
  if (!LABEL.test(label) || RESERVED.includes(label)) return null;
  return label;
}

// Static/framework paths a specialist host serves as-is (everything else on a
// specialist host is redirected to the main site).
const PASS_THROUGH =
  /^\/(_next\/|_vercel\/|favicon\.ico$|robots\.txt$|sitemap\.xml$|manifest\.webmanifest$|logo\/|icon|apple-icon)/;
const HAS_EXTENSION = /\.[a-z0-9]+$/i;

/**
 * What the proxy does with `pathname` on the `<slug>` specialist host:
 * `rewrite` the root to the profile, let the profile, static files and the
 * lead endpoint (EXACT path, so the contact form posts same-origin) through,
 * and `redirect` everything else to the main site.
 */
export function specialistHostAction(pathname: string, slug: string): "rewrite" | "next" | "redirect" {
  if (pathname === "/") return "rewrite";
  if (pathname === `/team/${slug}` || pathname === "/api/leads") return "next";
  if (PASS_THROUGH.test(pathname) || HAS_EXTENSION.test(pathname)) return "next";
  return "redirect";
}

/**
 * True when `candidate` is exactly the origin of a specialist microsite:
 * `https://<slug>.allabodeph.com` (default port only), or — outside
 * production only — `http://<slug>.localhost[:port]`. The hostname is taken
 * from the PARSED URL (never a string-suffix match on the raw value), so
 * lookalikes, userinfo tricks and reserved labels are all rejected.
 */
export function isSpecialistSiteOrigin(
  candidate: string | null | undefined,
  production: boolean,
  rootDomain = "allabodeph.com",
): boolean {
  if (!candidate) return false;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return false;
  }
  if (url.username || url.password || url.origin !== candidate.trim().toLowerCase().replace(/\/$/, "")) {
    return false;
  }
  const host = url.hostname.toLowerCase();
  if (host.endsWith(".localhost")) {
    if (production || url.protocol !== "http:") return false;
  } else if (host.endsWith(`.${rootDomain.toLowerCase()}`)) {
    if (url.protocol !== "https:" || url.port !== "") return false;
  } else {
    return false;
  }
  return specialistSlugFromHost(host, rootDomain) !== null;
}
