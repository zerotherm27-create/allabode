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
