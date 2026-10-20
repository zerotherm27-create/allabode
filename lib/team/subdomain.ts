export const RESERVED_SUBDOMAINS = [
  "www", "admin", "api", "app", "mail", "portal", "dashboard", "specialist",
  "specialists", "team", "ftp", "smtp", "static", "assets", "cdn", "dev",
  "staging", "test", "blog", "help", "support", "login", "signup",
];

export type SubdomainResult = { ok: true; value: string } | { ok: false; error: string };

export function validateSubdomain(input: string): SubdomainResult {
  const value = input.trim().toLowerCase();
  if (value.length < 3 || value.length > 30) {
    return { ok: false, error: "Use 3 to 30 characters." };
  }
  if (!/^[a-z0-9-]+$/.test(value)) {
    return { ok: false, error: "Use only letters, numbers and hyphens." };
  }
  if (value.startsWith("-") || value.endsWith("-")) {
    return { ok: false, error: "Cannot start or end with a hyphen." };
  }
  if (RESERVED_SUBDOMAINS.includes(value)) {
    return { ok: false, error: `"${value}" is reserved.` };
  }
  return { ok: true, value };
}
