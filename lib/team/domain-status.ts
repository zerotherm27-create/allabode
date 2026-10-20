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
  | { ok: true; attached: boolean; verified: boolean }
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

export type SubdomainState = "not-configured" | "not-attached" | "waiting" | "live";

export function subdomainState(check: DomainCheck): SubdomainState {
  if (!check.ok) return check.reason === "not-configured" ? "not-configured" : "waiting";
  if (!check.attached) return "not-attached";
  return check.verified ? "live" : "waiting";
}
