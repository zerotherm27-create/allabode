// Server-only (the `server-only` package is not installed; never import from a client component).
// Attaches/checks/detaches <slug>.allabodeph.com on the Vercel project via the REST API.
// Env: VERCEL_API_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID. Functions never throw.
import {
  interpretAttach,
  interpretCheck,
  interpretDetach,
  specialistDomainName,
  type DomainCheck,
  type DomainResult,
} from "./domain-status";

function config() {
  const token = process.env.VERCEL_API_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID;
  if (!token || !project) return null;
  return { token, project, team: process.env.VERCEL_TEAM_ID };
}

const NOT_CONFIGURED = {
  ok: false as const,
  reason: "not-configured" as const,
  message: "Vercel API is not configured (VERCEL_API_TOKEN / VERCEL_PROJECT_ID).",
};

function url(cfg: { project: string; team?: string }, path: string) {
  const q = cfg.team ? `?teamId=${encodeURIComponent(cfg.team)}` : "";
  return `https://api.vercel.com${path.replace("{project}", encodeURIComponent(cfg.project))}${q}`;
}

async function call(token: string, method: string, target: string, body?: unknown) {
  const res = await fetch(target, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  const json: unknown = await res.json().catch(() => null);
  return { status: res.status, json };
}

const apiFail = (e: unknown): { ok: false; reason: "api-error"; message: string } => ({
  ok: false,
  reason: "api-error",
  message: e instanceof Error && e.name === "TimeoutError" ? "Vercel API timed out." : "Could not reach the Vercel API.",
});

export async function attachSpecialistDomain(slug: string): Promise<DomainResult> {
  const cfg = config();
  if (!cfg) return NOT_CONFIGURED;
  const domain = specialistDomainName(slug);
  if (!domain) return { ok: false, reason: "api-error", message: "Invalid subdomain." };
  try {
    const r = await call(cfg.token, "POST", url(cfg, "/v10/projects/{project}/domains"), { name: domain });
    const code = (r.json as { error?: { code?: string } } | null)?.error?.code ?? null;
    return interpretAttach(r.status, code);
  } catch (e) {
    return apiFail(e);
  }
}

export async function checkSpecialistDomain(slug: string): Promise<DomainCheck> {
  const cfg = config();
  if (!cfg) return NOT_CONFIGURED;
  const domain = specialistDomainName(slug);
  if (!domain) return { ok: false, reason: "api-error", message: "Invalid subdomain." };
  try {
    const r = await call(cfg.token, "GET", url(cfg, `/v9/projects/{project}/domains/${domain}`));
    return interpretCheck(r.status, r.json);
  } catch (e) {
    return apiFail(e);
  }
}

export async function detachSpecialistDomain(slug: string): Promise<DomainResult> {
  const cfg = config();
  if (!cfg) return NOT_CONFIGURED;
  const domain = specialistDomainName(slug);
  if (!domain) return { ok: false, reason: "api-error", message: "Invalid subdomain." };
  try {
    const r = await call(cfg.token, "DELETE", url(cfg, `/v9/projects/{project}/domains/${domain}`));
    return interpretDetach(r.status);
  } catch (e) {
    return apiFail(e);
  }
}
