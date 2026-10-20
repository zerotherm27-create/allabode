// Import-free pure parts of the Vercel domain helper (unit-tested).
export const ROOT_DOMAIN = "allabodeph.com";
const LABEL = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

export type DomainResult =
  | { ok: true; status: "attached" | "already-attached" | "removed" }
  | { ok: false; reason: "not-configured" | "api-error"; message: string };

export function specialistDomainName(slug: string): string | null {
  const s = slug.trim().toLowerCase();
  return LABEL.test(s) ? `${s}.${ROOT_DOMAIN}` : null;
}

/** Interpret the HTTP result of POST /v10/projects/{id}/domains. */
export function interpretAttach(httpStatus: number, errorCode?: string | null): DomainResult {
  if (httpStatus >= 200 && httpStatus < 300) return { ok: true, status: "attached" };
  if (httpStatus === 409 && (!errorCode || errorCode === "domain_already_in_use" || errorCode === "domain_already_exists")) {
    return { ok: true, status: "already-attached" };
  }
  if (httpStatus === 401 || httpStatus === 403) {
    return { ok: false, reason: "api-error", message: "Vercel rejected the API token (check its scope)." };
  }
  if (httpStatus === 409) {
    return { ok: false, reason: "api-error", message: "The domain is in use by another Vercel project." };
  }
  return { ok: false, reason: "api-error", message: `Vercel API error (HTTP ${httpStatus}).` };
}

/** Interpret the HTTP result of DELETE /v9/projects/{id}/domains/{domain}. */
export function interpretDetach(httpStatus: number): DomainResult {
  if ((httpStatus >= 200 && httpStatus < 300) || httpStatus === 404) return { ok: true, status: "removed" };
  if (httpStatus === 401 || httpStatus === 403) {
    return { ok: false, reason: "api-error", message: "Vercel rejected the API token (check its scope)." };
  }
  return { ok: false, reason: "api-error", message: `Vercel API error (HTTP ${httpStatus}).` };
}

export type DomainCheck =
  | { ok: true; attached: boolean; verified: boolean; misconfigured?: boolean }
  | { ok: false; reason: "not-configured" | "api-error"; message: string };

/** Interpret GET /v9/projects/{id}/domains/{domain}. */
export function interpretCheck(httpStatus: number, body: unknown): DomainCheck {
  if (httpStatus === 404) return { ok: true, attached: false, verified: false };
  if (httpStatus >= 200 && httpStatus < 300) {
    const verified = !!body && typeof body === "object" && (body as { verified?: unknown }).verified === true;
    return { ok: true, attached: true, verified };
  }
  if (httpStatus === 401 || httpStatus === 403) {
    return { ok: false, reason: "api-error", message: "Vercel rejected the API token (check its scope)." };
  }
  return { ok: false, reason: "api-error", message: `Vercel API error (HTTP ${httpStatus}).` };
}

/** Interpret GET /v6/domains/{domain}/config; null when unknown (treated as not live). */
export function interpretDomainConfig(httpStatus: number, body: unknown): boolean | null {
  if (httpStatus < 200 || httpStatus >= 300 || !body || typeof body !== "object") return null;
  const m = (body as { misconfigured?: unknown }).misconfigured;
  return typeof m === "boolean" ? m : null;
}

export type SubdomainState = "not-configured" | "not-attached" | "waiting" | "live";

export function subdomainState(check: DomainCheck): SubdomainState {
  if (!check.ok) return check.reason === "not-configured" ? "not-configured" : "waiting";
  if (!check.attached) return "not-attached";
  // Project-domain `verified` is true at once (the apex is verified), so DNS
  // correctness (`misconfigured === false` from /v6/domains/{d}/config) is the live signal.
  return check.verified && check.misconfigured === false ? "live" : "waiting";
}
